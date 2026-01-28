import { CommissionRepository } from '../repositories/commission.repository';
import { outboxService } from './outbox.service';
import { CommissionLedger, CommissionStatus } from '../generated/prisma';
import { prisma } from '../lib/prisma';

/**
 * Commission Service
 *
 * Handles commission calculation and tracking for the social commerce model (0.5%)
 */

// Default commission rate (0.5% = 0.005)
const DEFAULT_COMMISSION_RATE = 0.005;

export interface CreateCommissionDTO {
  orderId: string;
  orderNumber: string;
  sellerId: string;
  paymentId?: string;
  orderAmount: number;
  commissionRate?: number; // Optional, defaults to 0.5%
}

export interface MarkOrderCompletedDTO {
  orderId: string;
  sellerId: string;
  completedAt?: Date;
}

export interface CollectCommissionsDTO {
  sellerId: string;
  settlementId?: string;
}

export class CommissionService {
  private repository: CommissionRepository;

  constructor() {
    this.repository = new CommissionRepository();
  }

  /**
   * Generate commission ledger number
   * Format: COM-YYYYMMDD-XXXXX
   */
  private generateLedgerNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `COM-${dateStr}-${random}`;
  }

  /**
   * Calculate commission amount
   */
  private calculateCommission(orderAmount: number, commissionRate: number): number {
    return Math.round(orderAmount * commissionRate * 100) / 100; // Round to 2 decimals
  }

  /**
   * Record commission for an order
   * This is called when an order is created/paid
   */
  async recordCommission(data: CreateCommissionDTO): Promise<CommissionLedger> {
    // Check if commission already exists for this order/seller
    const existing = await this.repository.findByOrderAndSeller(data.orderId, data.sellerId);
    if (existing) {
      return existing; // Idempotent
    }

    const commissionRate = data.commissionRate || DEFAULT_COMMISSION_RATE;
    const commissionAmount = this.calculateCommission(data.orderAmount, commissionRate);
    const ledgerNumber = this.generateLedgerNumber();

    // Create commission record in a transaction with outbox event
    const commission = await prisma.$transaction(async (tx) => {
      const created = await tx.commissionLedger.create({
        data: {
          ledgerNumber,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          sellerId: data.sellerId,
          paymentId: data.paymentId,
          orderAmount: data.orderAmount,
          commissionRate,
          commissionAmount,
          status: CommissionStatus.pending
        }
      });

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Commission',
          aggregateId: created.id,
          eventType: 'commission.recorded',
          payload: {
            commissionId: created.id,
            ledgerNumber: created.ledgerNumber,
            orderId: created.orderId,
            orderNumber: created.orderNumber,
            sellerId: created.sellerId,
            paymentId: created.paymentId,
            orderAmount: Number(created.orderAmount),
            commissionRate: Number(created.commissionRate),
            commissionAmount: Number(created.commissionAmount),
            createdAt: created.createdAt.toISOString()
          }
        }
      });

      return created;
    });

    return commission;
  }

  /**
   * Mark order as completed - commission becomes collectible
   * This is called when order is delivered/completed
   */
  async markOrderCompleted(data: MarkOrderCompletedDTO): Promise<CommissionLedger> {
    const commission = await this.repository.findByOrderAndSeller(data.orderId, data.sellerId);
    if (!commission) {
      throw new Error(`Commission not found for order ${data.orderId} and seller ${data.sellerId}`);
    }

    if (commission.status !== CommissionStatus.pending) {
      return commission; // Already processed
    }

    const completedAt = data.completedAt || new Date();

    const updated = await this.repository.markAsCollectible(commission.id, completedAt);

    // Publish event
    await outboxService.commissionCollectible({
      id: updated.id,
      ledgerNumber: updated.ledgerNumber,
      orderId: updated.orderId,
      sellerId: updated.sellerId,
      commissionAmount: updated.commissionAmount,
      orderCompletedAt: completedAt
    });

    return updated;
  }

  /**
   * Collect commissions from seller (deduct from payout)
   * This is called during weekly settlement
   */
  async collectCommissions(data: CollectCommissionsDTO): Promise<{
    commissions: CommissionLedger[];
    totalAmount: number;
  }> {
    const collectible = await this.repository.getCollectibleBySeller(data.sellerId);

    if (collectible.length === 0) {
      return {
        commissions: [],
        totalAmount: 0
      };
    }

    const collected = await prisma.$transaction(async (tx) => {
      const results: CommissionLedger[] = [];

      for (const commission of collectible) {
        const updated = await tx.commissionLedger.update({
          where: { id: commission.id },
          data: {
            status: CommissionStatus.collected,
            settlementId: data.settlementId,
            collectedAt: new Date()
          }
        });

        // Publish event
        await tx.serviceOutbox.create({
          data: {
            aggregateType: 'Commission',
            aggregateId: updated.id,
            eventType: 'commission.collected',
            payload: {
              commissionId: updated.id,
              ledgerNumber: updated.ledgerNumber,
              orderId: updated.orderId,
              sellerId: updated.sellerId,
              commissionAmount: Number(updated.commissionAmount),
              settlementId: updated.settlementId,
              collectedAt: updated.collectedAt?.toISOString()
            }
          }
        });

        results.push(updated);
      }

      return results;
    });

    const totalAmount = collected.reduce((sum, c) => sum + Number(c.commissionAmount), 0);

    return {
      commissions: collected,
      totalAmount
    };
  }

  /**
   * Waive commission for an order (promo, partnership, etc.)
   */
  async waiveCommission(
    orderId: string,
    sellerId: string,
    reason: string
  ): Promise<CommissionLedger> {
    const commission = await this.repository.findByOrderAndSeller(orderId, sellerId);
    if (!commission) {
      throw new Error(`Commission not found for order ${orderId} and seller ${sellerId}`);
    }

    if (commission.status === CommissionStatus.collected) {
      throw new Error('Cannot waive commission that has already been collected');
    }

    const updated = await this.repository.waive(commission.id);

    // Publish event
    await outboxService.commissionWaived({
      id: updated.id,
      ledgerNumber: updated.ledgerNumber,
      orderId: updated.orderId,
      sellerId: updated.sellerId,
      reason
    });

    return updated;
  }

  /**
   * Refund commission (when order is refunded)
   * This is called when a refund is processed
   */
  async refundCommission(orderId: string, sellerId: string): Promise<CommissionLedger> {
    const commission = await this.repository.findByOrderAndSeller(orderId, sellerId);
    if (!commission) {
      throw new Error(`Commission not found for order ${orderId} and seller ${sellerId}`);
    }

    if (commission.status === CommissionStatus.refunded) {
      return commission; // Already refunded
    }

    const updated = await this.repository.markAsRefunded(commission.id);

    // Publish event
    await outboxService.commissionRefunded({
      id: updated.id,
      ledgerNumber: updated.ledgerNumber,
      orderId: updated.orderId,
      sellerId: updated.sellerId
    });

    return updated;
  }

  /**
   * Get commission by ID
   */
  async getById(id: string): Promise<CommissionLedger | null> {
    return this.repository.findById(id);
  }

  /**
   * Get commission by ledger number
   */
  async getByLedgerNumber(ledgerNumber: string): Promise<CommissionLedger | null> {
    return this.repository.findByLedgerNumber(ledgerNumber);
  }

  /**
   * Get commissions for a seller
   */
  async getBySellerId(
    sellerId: string,
    options?: {
      status?: CommissionStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<CommissionLedger[]> {
    return this.repository.findBySellerId(sellerId, options);
  }

  /**
   * Get commissions for an order
   */
  async getByOrderId(orderId: string): Promise<CommissionLedger[]> {
    return this.repository.findByOrderId(orderId);
  }

  /**
   * Get commission statistics for a seller
   */
  async getSellerStats(sellerId: string): Promise<{
    totalPending: number;
    totalCollectible: number;
    totalCollected: number;
    totalWaived: number;
    totalRefunded: number;
    totalLifetime: number;
  }> {
    const stats = await this.repository.getStatsBySeller(sellerId);

    return {
      ...stats,
      totalLifetime: stats.totalCollected + stats.totalWaived
    };
  }

  /**
   * Calculate net payout for seller (after commission)
   */
  calculateNetPayout(grossAmount: number, commissionAmount: number): number {
    return Math.round((grossAmount - commissionAmount) * 100) / 100;
  }
}
