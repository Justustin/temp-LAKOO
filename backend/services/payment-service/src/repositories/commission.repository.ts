import { prisma } from '../lib/prisma';
import { CommissionLedger, CommissionStatus, Prisma } from '../generated/prisma';

/**
 * Commission Repository
 *
 * Handles all database operations for commission ledger entries.
 */
export class CommissionRepository {
  /**
   * Create a new commission ledger entry
   */
  async create(data: {
    ledgerNumber: string;
    orderId: string;
    orderNumber: string;
    sellerId: string;
    paymentId?: string;
    orderAmount: number;
    commissionRate: number;
    commissionAmount: number;
    orderCompletedAt?: Date;
  }): Promise<CommissionLedger> {
    return prisma.commissionLedger.create({
      data: {
        ledgerNumber: data.ledgerNumber,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        sellerId: data.sellerId,
        paymentId: data.paymentId,
        orderAmount: data.orderAmount,
        commissionRate: data.commissionRate,
        commissionAmount: data.commissionAmount,
        orderCompletedAt: data.orderCompletedAt,
        status: CommissionStatus.pending
      }
    });
  }

  /**
   * Find commission by ID
   */
  async findById(id: string): Promise<CommissionLedger | null> {
    return prisma.commissionLedger.findUnique({
      where: { id }
    });
  }

  /**
   * Find commission by ledger number
   */
  async findByLedgerNumber(ledgerNumber: string): Promise<CommissionLedger | null> {
    return prisma.commissionLedger.findUnique({
      where: { ledgerNumber }
    });
  }

  /**
   * Find commission by order ID and seller ID
   */
  async findByOrderAndSeller(orderId: string, sellerId: string): Promise<CommissionLedger | null> {
    return prisma.commissionLedger.findUnique({
      where: {
        orderId_sellerId: {
          orderId,
          sellerId
        }
      }
    });
  }

  /**
   * Find all commissions for a seller
   */
  async findBySellerId(
    sellerId: string,
    options?: {
      status?: CommissionStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<CommissionLedger[]> {
    const where: Prisma.CommissionLedgerWhereInput = {
      sellerId
    };

    if (options?.status) {
      where.status = options.status;
    }

    return prisma.commissionLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset
    });
  }

  /**
   * Find all commissions for an order
   */
  async findByOrderId(orderId: string): Promise<CommissionLedger[]> {
    return prisma.commissionLedger.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get collectible commissions for a seller (ready to be deducted from payout)
   */
  async getCollectibleBySeller(sellerId: string): Promise<CommissionLedger[]> {
    return prisma.commissionLedger.findMany({
      where: {
        sellerId,
        status: CommissionStatus.collectible
      },
      orderBy: { orderCompletedAt: 'asc' }
    });
  }

  /**
   * Update commission status to collectible
   */
  async markAsCollectible(id: string, orderCompletedAt: Date): Promise<CommissionLedger> {
    return prisma.commissionLedger.update({
      where: { id },
      data: {
        status: CommissionStatus.collectible,
        orderCompletedAt
      }
    });
  }

  /**
   * Update commission status to collected
   */
  async markAsCollected(
    id: string,
    settlementId?: string
  ): Promise<CommissionLedger> {
    return prisma.commissionLedger.update({
      where: { id },
      data: {
        status: CommissionStatus.collected,
        settlementId,
        collectedAt: new Date()
      }
    });
  }

  /**
   * Waive commission (promo, partnership, etc.)
   */
  async waive(id: string): Promise<CommissionLedger> {
    return prisma.commissionLedger.update({
      where: { id },
      data: {
        status: CommissionStatus.waived
      }
    });
  }

  /**
   * Mark commission as refunded
   */
  async markAsRefunded(id: string): Promise<CommissionLedger> {
    return prisma.commissionLedger.update({
      where: { id },
      data: {
        status: CommissionStatus.refunded
      }
    });
  }

  /**
   * Get total commission for a seller by status
   */
  async getTotalBySeller(
    sellerId: string,
    status?: CommissionStatus
  ): Promise<{ total: number; count: number }> {
    const where: Prisma.CommissionLedgerWhereInput = { sellerId };
    if (status) {
      where.status = status;
    }

    const result = await prisma.commissionLedger.aggregate({
      where,
      _sum: {
        commissionAmount: true
      },
      _count: true
    });

    return {
      total: Number(result._sum.commissionAmount || 0),
      count: result._count
    };
  }

  /**
   * Get commission statistics for a seller
   */
  async getStatsBySeller(sellerId: string): Promise<{
    totalPending: number;
    totalCollectible: number;
    totalCollected: number;
    totalWaived: number;
    totalRefunded: number;
  }> {
    const [pending, collectible, collected, waived, refunded] = await Promise.all([
      this.getTotalBySeller(sellerId, CommissionStatus.pending),
      this.getTotalBySeller(sellerId, CommissionStatus.collectible),
      this.getTotalBySeller(sellerId, CommissionStatus.collected),
      this.getTotalBySeller(sellerId, CommissionStatus.waived),
      this.getTotalBySeller(sellerId, CommissionStatus.refunded)
    ]);

    return {
      totalPending: pending.total,
      totalCollectible: collectible.total,
      totalCollected: collected.total,
      totalWaived: waived.total,
      totalRefunded: refunded.total
    };
  }

  /**
   * Count commissions
   */
  async count(where?: Prisma.CommissionLedgerWhereInput): Promise<number> {
    return prisma.commissionLedger.count({ where });
  }

  /**
   * Find with pagination
   */
  async findMany(options: {
    where?: Prisma.CommissionLedgerWhereInput;
    orderBy?: Prisma.CommissionLedgerOrderByWithRelationInput;
    limit?: number;
    offset?: number;
  }): Promise<CommissionLedger[]> {
    return prisma.commissionLedger.findMany({
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
      take: options.limit,
      skip: options.offset
    });
  }
}
