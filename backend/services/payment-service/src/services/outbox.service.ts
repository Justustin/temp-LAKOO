import { prisma } from '../lib/prisma';

/**
 * Outbox Service
 *
 * Publishes domain events to the ServiceOutbox table for eventual delivery
 * to other services via Kafka/message broker.
 */

// =============================================================================
// Event Types
// =============================================================================

export type PaymentEventType =
  | 'payment.created'
  | 'payment.paid'
  | 'payment.expired'
  | 'payment.failed'
  | 'payment.cancelled';

export type RefundEventType =
  | 'refund.requested'
  | 'refund.approved'
  | 'refund.rejected'
  | 'refund.processing'
  | 'refund.completed'
  | 'refund.failed';

export type SettlementEventType = 'settlement.completed';

export type EventType = PaymentEventType | RefundEventType | SettlementEventType;

// =============================================================================
// Event Payloads
// =============================================================================

export interface PaymentCreatedPayload {
  paymentId: string;
  paymentNumber: string;
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: string;
  gatewayInvoiceUrl: string | null;
  gatewayTransactionId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PaymentPaidPayload {
  paymentId: string;
  paymentNumber: string;
  orderId: string;
  userId: string;
  amount: number;
  gatewayFee: number;
  netAmount: number;
  gatewayTransactionId: string | null;
  paidAt: string;
}

export interface PaymentExpiredPayload {
  paymentId: string;
  paymentNumber: string;
  orderId: string;
  userId: string;
  expiredAt: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  paymentNumber: string;
  orderId: string;
  userId: string;
  failureReason: string | null;
  failureCode: string | null;
  failedAt: string;
}

export interface RefundRequestedPayload {
  refundId: string;
  refundNumber: string;
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  reason: string | null;
  createdAt: string;
}

export interface RefundApprovedPayload {
  refundId: string;
  refundNumber: string;
  paymentId: string;
  orderId: string;
  approvedAt: string;
  approvedBy: string | null;
}

export interface RefundRejectedPayload {
  refundId: string;
  refundNumber: string;
  paymentId: string;
  orderId: string;
  rejectedAt: string;
  rejectedBy: string | null;
  rejectionReason: string | null;
}

export interface RefundCompletedPayload {
  refundId: string;
  refundNumber: string;
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  refundMethod: string;
  gatewayRefundId: string | null;
  completedAt: string;
}

export interface RefundFailedPayload {
  refundId: string;
  refundNumber: string;
  paymentId: string;
  orderId: string;
  failureReason: string;
  failedAt: string;
}

// =============================================================================
// Outbox Service
// =============================================================================

export class OutboxService {
  /**
   * Publish an event to the outbox
   */
  async publish(
    aggregateType: 'Payment' | 'Refund' | 'Settlement',
    aggregateId: string,
    eventType: EventType,
    payload: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const data: any = {
      aggregateType,
      aggregateId,
      eventType,
      payload
    };

    // Prisma JSON fields accept undefined (omit), but not raw null unless using Prisma.JsonNull/DbNull.
    if (metadata !== undefined) {
      data.metadata = metadata;
    }

    await prisma.serviceOutbox.create({
      data: {
        ...data
      }
    });
  }

  // =============================================================================
  // Payment Events
  // =============================================================================

  async paymentCreated(payment: {
    id: string;
    paymentNumber: string;
    orderId: string;
    userId: string;
    amount: any;
    paymentMethod: string;
    gatewayInvoiceUrl: string | null;
    gatewayTransactionId: string | null;
    expiresAt: Date | null;
    createdAt: Date;
  }): Promise<void> {
    const payload: PaymentCreatedPayload = {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      gatewayInvoiceUrl: payment.gatewayInvoiceUrl,
      gatewayTransactionId: payment.gatewayTransactionId,
      expiresAt: payment.expiresAt?.toISOString() || null,
      createdAt: payment.createdAt.toISOString()
    };

    await this.publish('Payment', payment.id, 'payment.created', payload);
  }

  async paymentPaid(payment: {
    id: string;
    paymentNumber: string;
    orderId: string;
    userId: string;
    amount: any;
    gatewayFee: any;
    netAmount: any;
    gatewayTransactionId: string | null;
    paidAt: Date | null;
  }): Promise<void> {
    const payload: PaymentPaidPayload = {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: Number(payment.amount),
      gatewayFee: Number(payment.gatewayFee),
      netAmount: Number(payment.netAmount),
      gatewayTransactionId: payment.gatewayTransactionId,
      paidAt: payment.paidAt?.toISOString() || new Date().toISOString()
    };

    await this.publish('Payment', payment.id, 'payment.paid', payload);
  }

  async paymentExpired(payment: {
    id: string;
    paymentNumber: string;
    orderId: string;
    userId: string;
  }): Promise<void> {
    const payload: PaymentExpiredPayload = {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      orderId: payment.orderId,
      userId: payment.userId,
      expiredAt: new Date().toISOString()
    };

    await this.publish('Payment', payment.id, 'payment.expired', payload);
  }

  async paymentFailed(payment: {
    id: string;
    paymentNumber: string;
    orderId: string;
    userId: string;
    failureReason: string | null;
    failureCode: string | null;
  }): Promise<void> {
    const payload: PaymentFailedPayload = {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      orderId: payment.orderId,
      userId: payment.userId,
      failureReason: payment.failureReason,
      failureCode: payment.failureCode,
      failedAt: new Date().toISOString()
    };

    await this.publish('Payment', payment.id, 'payment.failed', payload);
  }

  // =============================================================================
  // Refund Events
  // =============================================================================

  async refundRequested(refund: {
    id: string;
    refundNumber: string;
    paymentId: string;
    orderId: string;
    userId: string;
    amount: any;
    reason: string | null;
    createdAt: Date;
  }): Promise<void> {
    const payload: RefundRequestedPayload = {
      refundId: refund.id,
      refundNumber: refund.refundNumber,
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      userId: refund.userId,
      amount: Number(refund.amount),
      reason: refund.reason,
      createdAt: refund.createdAt.toISOString()
    };

    await this.publish('Refund', refund.id, 'refund.requested', payload);
  }

  async refundApproved(refund: {
    id: string;
    refundNumber: string;
    paymentId: string;
    orderId: string;
    approvedAt: Date | null;
    approvedBy: string | null;
  }): Promise<void> {
    const payload: RefundApprovedPayload = {
      refundId: refund.id,
      refundNumber: refund.refundNumber,
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      approvedAt: refund.approvedAt?.toISOString() || new Date().toISOString(),
      approvedBy: refund.approvedBy
    };

    await this.publish('Refund', refund.id, 'refund.approved', payload);
  }

  async refundRejected(refund: {
    id: string;
    refundNumber: string;
    paymentId: string;
    orderId: string;
    rejectedAt: Date | null;
    rejectedBy: string | null;
    rejectionReason: string | null;
  }): Promise<void> {
    const payload: RefundRejectedPayload = {
      refundId: refund.id,
      refundNumber: refund.refundNumber,
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      rejectedAt: refund.rejectedAt?.toISOString() || new Date().toISOString(),
      rejectedBy: refund.rejectedBy,
      rejectionReason: refund.rejectionReason
    };

    await this.publish('Refund', refund.id, 'refund.rejected', payload);
  }

  async refundCompleted(refund: {
    id: string;
    refundNumber: string;
    paymentId: string;
    orderId: string;
    userId: string;
    amount: any;
    refundMethod: string;
    gatewayRefundId: string | null;
    completedAt: Date | null;
  }): Promise<void> {
    const payload: RefundCompletedPayload = {
      refundId: refund.id,
      refundNumber: refund.refundNumber,
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      userId: refund.userId,
      amount: Number(refund.amount),
      refundMethod: refund.refundMethod,
      gatewayRefundId: refund.gatewayRefundId,
      completedAt: refund.completedAt?.toISOString() || new Date().toISOString()
    };

    await this.publish('Refund', refund.id, 'refund.completed', payload);
  }

  async refundFailed(refund: {
    id: string;
    refundNumber: string;
    paymentId: string;
    orderId: string;
    failureReason: string;
  }): Promise<void> {
    const payload: RefundFailedPayload = {
      refundId: refund.id,
      refundNumber: refund.refundNumber,
      paymentId: refund.paymentId,
      orderId: refund.orderId,
      failureReason: refund.failureReason,
      failedAt: new Date().toISOString()
    };

    await this.publish('Refund', refund.id, 'refund.failed', payload);
  }
}

// Singleton instance
export const outboxService = new OutboxService();
