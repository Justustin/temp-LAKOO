import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { outboxService } from '../services/outbox.service';

export class AdminController {
  // Payment Management
  getAllPayments = async (req: Request, res: Response) => {
    try {
      const { status, userId, paymentMethod, startDate, endDate } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (userId) where.userId = userId;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            refunds: true,
            gatewayLogs: { take: 5, orderBy: { createdAt: 'desc' } }
          }
        })
      ]);

      res.json({
        data: payments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getPaymentDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          refunds: true,
          gatewayLogs: { orderBy: { createdAt: 'desc' } }
        }
      });

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json({ data: payment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Refund Management
  getAllRefunds = async (req: Request, res: Response) => {
    try {
      const { status, userId } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (userId) where.userId = userId;

      const [total, refunds] = await Promise.all([
        prisma.refund.count({ where }),
        prisma.refund.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            payment: { select: { id: true, paymentNumber: true, amount: true } }
          }
        })
      ]);

      res.json({
        data: refunds,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  processRefund = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { action, notes } = req.body;
      const adminUserId = (req as any).user?.id;

      const refund = await prisma.refund.findUnique({
        where: { id },
        include: { payment: { select: { orderId: true } } }
      });
      if (!refund) {
        return res.status(404).json({ error: 'Refund not found' });
      }

      const orderId = refund.payment.orderId;

      if (action === 'approve') {
        const updated = await prisma.refund.update({
          where: { id },
          data: {
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: adminUserId,
            notes: notes || refund.notes
          }
        });

        // Update payment status
        await prisma.payment.update({
          where: { id: refund.paymentId },
          data: { status: 'refunded' }
        });

        // Publish refund.approved event
        await outboxService.refundApproved({
          id: updated.id,
          refundNumber: updated.refundNumber,
          paymentId: updated.paymentId,
          orderId,
          approvedAt: updated.approvedAt,
          approvedBy: updated.approvedBy
        });

        res.json({
          message: 'Refund approved successfully',
          data: updated
        });
      } else {
        const updated = await prisma.refund.update({
          where: { id },
          data: {
            status: 'rejected',
            rejectedAt: new Date(),
            rejectedBy: adminUserId,
            rejectionReason: notes
          }
        });

        // Publish refund.rejected event
        await outboxService.refundRejected({
          id: updated.id,
          refundNumber: updated.refundNumber,
          paymentId: updated.paymentId,
          orderId,
          rejectedAt: updated.rejectedAt,
          rejectedBy: updated.rejectedBy,
          rejectionReason: updated.rejectionReason
        });

        res.json({
          message: 'Refund rejected',
          data: updated
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Analytics
  getPaymentAnalytics = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);

      const whereClause: any = {};
      if (Object.keys(dateFilter).length > 0) {
        whereClause.createdAt = dateFilter;
      }

      const [
        totalPayments,
        statusCounts,
        methodCounts,
        revenueData
      ] = await Promise.all([
        prisma.payment.count({ where: whereClause }),
        prisma.payment.groupBy({
          by: ['status'],
          where: whereClause,
          _count: true
        }),
        prisma.payment.groupBy({
          by: ['paymentMethod'],
          where: whereClause,
          _count: true
        }),
        prisma.payment.aggregate({
          where: { ...whereClause, status: 'paid' },
          _sum: { amount: true },
          _avg: { amount: true }
        })
      ]);

      res.json({
        data: {
          totalPayments,
          byStatus: statusCounts.reduce((acc: any, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {}),
          byMethod: methodCounts.reduce((acc: any, item) => {
            acc[item.paymentMethod] = item._count;
            return acc;
          }, {}),
          revenue: {
            total: revenueData._sum.amount || 0,
            average: revenueData._avg.amount || 0
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Settlement Records
  getSettlementRecords = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, isReconciled } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (isReconciled !== undefined) where.isReconciled = isReconciled === 'true';
      if (startDate || endDate) {
        where.settlementDate = {};
        if (startDate) where.settlementDate.gte = new Date(startDate as string);
        if (endDate) where.settlementDate.lte = new Date(endDate as string);
      }

      const [total, settlements] = await Promise.all([
        prisma.settlementRecord.count({ where }),
        prisma.settlementRecord.findMany({
          where,
          skip,
          take: limit,
          orderBy: { settlementDate: 'desc' }
        })
      ]);

      res.json({
        data: settlements,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Gateway Logs
  getGatewayLogs = async (req: Request, res: Response) => {
    try {
      const { paymentId, action, startDate, endDate } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (paymentId) where.paymentId = paymentId;
      if (action) where.action = action;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      const [total, logs] = await Promise.all([
        prisma.paymentGatewayLog.count({ where }),
        prisma.paymentGatewayLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      res.json({
        data: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
