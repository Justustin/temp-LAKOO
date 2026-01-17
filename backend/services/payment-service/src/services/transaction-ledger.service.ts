import { prisma } from '../lib/prisma';

export class TransactionLedgerService {
  async getOrderTransactionHistory(orderId: string) {
    const payments = await prisma.payment.findMany({
      where: { orderId },
      include: {
        gatewayLogs: {
          orderBy: { createdAt: 'desc' }
        },
        refunds: {
          include: {
            gatewayLogs: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return payments.flatMap(payment => {
      const transactions: any[] = [];

      // Add payment creation event
      transactions.push({
        type: 'payment_created',
        code: payment.paymentNumber,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
        paymentId: payment.id,
        orderId: payment.orderId
      });

      // Add gateway log events
      payment.gatewayLogs.forEach(log => {
        transactions.push({
          type: log.isWebhook ? 'webhook' : 'gateway_call',
          action: log.action,
          status: log.responseStatus,
          createdAt: log.createdAt,
          paymentId: payment.id
        });
      });

      // Add refund events
      payment.refunds.forEach(refund => {
        transactions.push({
          type: 'refund',
          code: refund.refundNumber,
          amount: refund.amount,
          status: refund.status,
          createdAt: refund.createdAt,
          paymentId: payment.id,
          refundId: refund.id
        });
      });

      return transactions;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getPaymentTransactionHistory(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        gatewayLogs: {
          orderBy: { createdAt: 'desc' }
        },
        refunds: {
          include: {
            gatewayLogs: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!payment) {
      return [];
    }

    const transactions: any[] = [];

    transactions.push({
      type: 'payment_created',
      code: payment.paymentNumber,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt
    });

    if (payment.paidAt) {
      transactions.push({
        type: 'payment_completed',
        amount: payment.netAmount,
        fee: payment.gatewayFee,
        createdAt: payment.paidAt
      });
    }

    payment.gatewayLogs.forEach(log => {
      transactions.push({
        type: log.isWebhook ? 'webhook_received' : 'gateway_api_call',
        action: log.action,
        responseStatus: log.responseStatus,
        durationMs: log.durationMs,
        error: log.errorMessage,
        createdAt: log.createdAt
      });
    });

    payment.refunds.forEach(refund => {
      transactions.push({
        type: 'refund_requested',
        code: refund.refundNumber,
        amount: refund.amount,
        reason: refund.reason,
        status: refund.status,
        createdAt: refund.createdAt
      });

      if (refund.approvedAt) {
        transactions.push({
          type: 'refund_approved',
          code: refund.refundNumber,
          createdAt: refund.approvedAt
        });
      }

      if (refund.completedAt) {
        transactions.push({
          type: 'refund_completed',
          code: refund.refundNumber,
          createdAt: refund.completedAt
        });
      }
    });

    return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getFactoryTransactionSummary(factoryId: string, startDate: Date, endDate: Date) {
    // In microservice architecture, factory info would come from product-service
    // For now, return payment statistics for the period
    const payments = await prisma.payment.aggregate({
      where: {
        status: 'paid',
        paidAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true,
        netAmount: true,
        gatewayFee: true
      },
      _count: true
    });

    const refunds = await prisma.refund.aggregate({
      where: {
        status: 'completed',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    return {
      period: { startDate, endDate },
      payments: {
        count: payments._count,
        totalAmount: payments._sum.amount || 0,
        totalFees: payments._sum.gatewayFee || 0,
        netAmount: payments._sum.netAmount || 0
      },
      refunds: {
        count: refunds._count,
        totalAmount: refunds._sum.amount || 0
      }
    };
  }

  async getTransactionSummary(startDate: Date, endDate: Date) {
    const [payments, refunds, settlements] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true, netAmount: true, gatewayFee: true },
        _count: true
      }),
      prisma.refund.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true },
        _count: true
      }),
      prisma.settlementRecord.aggregate({
        where: {
          settlementDate: { gte: startDate, lte: endDate }
        },
        _sum: { totalAmount: true, netAmount: true, totalFees: true, refundAmount: true },
        _count: true
      })
    ]);

    return {
      period: { startDate, endDate },
      payments: {
        count: payments._count,
        totalAmount: payments._sum.amount || 0,
        totalFees: payments._sum.gatewayFee || 0,
        netAmount: payments._sum.netAmount || 0
      },
      refunds: {
        count: refunds._count,
        totalAmount: refunds._sum.amount || 0
      },
      settlements: {
        count: settlements._count,
        totalAmount: settlements._sum.totalAmount || 0,
        totalFees: settlements._sum.totalFees || 0,
        netAmount: settlements._sum.netAmount || 0,
        refundAmount: settlements._sum.refundAmount || 0
      }
    };
  }

  async getRecentTransactions(limit: number = 50, offset: number = 0) {
    const logs = await prisma.paymentGatewayLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        payment: {
          select: { id: true, paymentNumber: true, status: true }
        },
        refund: {
          select: { id: true, refundNumber: true, status: true }
        }
      }
    });

    return logs.map(log => ({
      id: log.id,
      type: log.isWebhook ? 'webhook' : 'api_call',
      action: log.action,
      responseStatus: log.responseStatus,
      durationMs: log.durationMs,
      error: log.errorMessage,
      payment: log.payment,
      refund: log.refund,
      createdAt: log.createdAt
    }));
  }

  async findByCode(transactionCode: string) {
    // Check if it's a payment number
    const payment = await prisma.payment.findUnique({
      where: { paymentNumber: transactionCode },
      include: {
        gatewayLogs: true,
        refunds: true
      }
    });

    if (payment) {
      return {
        type: 'payment',
        data: payment
      };
    }

    // Check if it's a refund number
    const refund = await prisma.refund.findUnique({
      where: { refundNumber: transactionCode },
      include: {
        payment: true,
        gatewayLogs: true
      }
    });

    if (refund) {
      return {
        type: 'refund',
        data: refund
      };
    }

    return null;
  }
}
