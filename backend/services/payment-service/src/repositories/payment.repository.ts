import { prisma } from '../lib/prisma';
import { CreatePaymentDTO } from '../types';

export class PaymentRepository {
  private generatePaymentNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `PAY-${dateStr}-${random}`;
  }

  async create(data: CreatePaymentDTO, invoiceUrl: string, invoiceId: string) {
    const paymentNumber = this.generatePaymentNumber();

    return prisma.payment.create({
      data: {
        paymentNumber,
        orderId: data.orderId,
        userId: data.userId,
        amount: data.amount,
        netAmount: data.amount, // Will be updated after payment with actual fee
        gatewayFee: 0,
        currency: 'IDR',
        paymentMethod: data.paymentMethod || 'bank_transfer',
        status: 'pending',
        paymentGateway: 'xendit',
        gatewayTransactionId: invoiceId,
        gatewayInvoiceUrl: invoiceUrl,
        idempotencyKey: data.idempotencyKey,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: data.metadata
      }
    });
  }

  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        refunds: true
      }
    });
  }

  async findByPaymentNumber(paymentNumber: string) {
    return prisma.payment.findUnique({
      where: { paymentNumber }
    });
  }

  async findByGatewayTransactionId(transactionId: string) {
    return prisma.payment.findFirst({
      where: { gatewayTransactionId: transactionId }
    });
  }

  async findByOrderId(orderId: string) {
    return prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByUserId(userId: string, options?: { limit?: number; offset?: number }) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0
    });
  }

  async markPaid(id: string, gatewayFee: number, gatewayResponse: any) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new Error('Payment not found');

    const netAmount = Number(payment.amount) - gatewayFee;

    return prisma.payment.update({
      where: { id },
      data: {
        status: 'paid',
        gatewayFee,
        netAmount,
        paidAt: new Date(),
        metadata: {
          ...(payment.metadata as object || {}),
          gatewayResponse
        }
      }
    });
  }

  async markExpired(id: string) {
    return prisma.payment.update({
      where: { id },
      data: {
        status: 'expired'
      }
    });
  }

  async markFailed(id: string, reason: string, code?: string) {
    return prisma.payment.update({
      where: { id },
      data: {
        status: 'failed',
        failureReason: reason,
        failureCode: code
      }
    });
  }

  async markCancelled(id: string) {
    return prisma.payment.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date()
      }
    });
  }

  async markRefunded(id: string) {
    return prisma.payment.update({
      where: { id },
      data: {
        status: 'refunded'
      }
    });
  }

  async expirePendingPayments() {
    return prisma.payment.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() }
      },
      data: {
        status: 'expired'
      }
    });
  }

  async findEligibleForSettlement(periodStart: Date, periodEnd: Date) {
    return prisma.payment.findMany({
      where: {
        status: 'paid',
        paidAt: {
          gte: periodStart,
          lt: periodEnd
        }
      },
      orderBy: { paidAt: 'asc' }
    });
  }

  async getPaymentStats(startDate: Date, endDate: Date) {
    const [payments, totals] = await Promise.all([
      prisma.payment.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: true
      }),
      prisma.payment.aggregate({
        where: {
          status: 'paid',
          paidAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true,
          gatewayFee: true,
          netAmount: true
        },
        _count: true
      })
    ]);

    return {
      byStatus: payments,
      paid: {
        count: totals._count,
        totalAmount: totals._sum.amount || 0,
        totalFees: totals._sum.gatewayFee || 0,
        netAmount: totals._sum.netAmount || 0
      }
    };
  }
}
