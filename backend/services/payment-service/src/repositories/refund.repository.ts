import { prisma } from '../lib/prisma';
import { CreateRefundDTO } from '../types';

export class RefundRepository {
  private generateRefundNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `REF-${dateStr}-${random}`;
  }

  async create(data: CreateRefundDTO, payment: any) {
    const refundNumber = this.generateRefundNumber();

    return prisma.refund.create({
      data: {
        refundNumber,
        paymentId: data.paymentId,
        orderId: data.orderId,
        userId: data.userId,
        amount: data.amount || Number(payment.amount),
        refundMethod: 'original_payment',
        status: 'pending',
        reason: data.reason,
        notes: data.notes,
        idempotencyKey: data.idempotencyKey
      }
    });
  }

  async findById(id: string) {
    return prisma.refund.findUnique({
      where: { id },
      include: {
        payment: true
      }
    });
  }

  async findByRefundNumber(refundNumber: string) {
    return prisma.refund.findUnique({
      where: { refundNumber }
    });
  }

  async findByPaymentId(paymentId: string) {
    return prisma.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.refund.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByUserId(userId: string) {
    return prisma.refund.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markApproved(id: string, approvedBy: string) {
    return prisma.refund.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy
      }
    });
  }

  async markProcessing(id: string, gatewayRefundId?: string) {
    return prisma.refund.update({
      where: { id },
      data: {
        status: 'processing',
        gatewayRefundId,
        processedAt: new Date()
      }
    });
  }

  async markCompleted(id: string) {
    return prisma.refund.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
  }

  async markFailed(id: string, reason: string) {
    return prisma.refund.update({
      where: { id },
      data: {
        status: 'failed',
        failureReason: reason
      }
    });
  }

  async markRejected(id: string, rejectedBy: string, reason: string) {
    return prisma.refund.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy,
        rejectionReason: reason
      }
    });
  }
}
