import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@repo/database';

const prisma = new PrismaClient();

export class AdminController {
  // Get all shipments
  getAllShipments = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const { status, courierService, startDate, endDate } = req.query;

      const where: any = {};
      if (status) where.status = status;
      if (courierService) where.courier_service = courierService;
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = new Date(startDate as string);
        if (endDate) where.created_at.lte = new Date(endDate as string);
      }

      const [total, shipments] = await Promise.all([
        prisma.shipments.count({ where }),
        prisma.shipments.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' }
        })
      ]);

      res.json({
        data: shipments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Get shipment details
  getShipmentDetails = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const shipment = await prisma.shipments.findUnique({
        where: { id }
      });

      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      res.json({ data: shipment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Update shipment status
  updateShipmentStatus = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status, notes } = req.body;

      const updated = await prisma.shipments.update({
        where: { id },
        data: {
          status,
          updated_at: new Date()
        }
      });

      res.json({ message: 'Shipment status updated', data: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Cancel shipment
  cancelShipment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const updated = await prisma.shipments.update({
        where: { id },
        data: {
          status: 'failed',
          updated_at: new Date()
        }
      });

      res.json({ message: 'Shipment cancelled', data: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Get shipment analytics
  getShipmentAnalytics = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);

      const whereClause: any = {};
      if (Object.keys(dateFilter).length > 0) {
        whereClause.created_at = dateFilter;
      }

      const [
        totalShipments,
        byStatus,
        byCourier,
        avgShippingCost
      ] = await Promise.all([
        prisma.shipments.count({ where: whereClause }),
        prisma.shipments.groupBy({
          by: ['status'],
          where: whereClause,
          _count: true
        }),
        prisma.shipments.groupBy({
          by: ['courier_service'],
          where: whereClause,
          _count: true
        }),
        prisma.shipments.aggregate({
          where: whereClause,
          _avg: { shipping_cost: true },
          _sum: { shipping_cost: true }
        })
      ]);

      res.json({
        data: {
          totalShipments,
          byStatus: byStatus.reduce((acc: any, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {}),
          byCourier: byCourier.reduce((acc: any, item) => {
            acc[item.courier_service || 'unknown'] = item._count;
            return acc;
          }, {}),
          costs: {
            average: avgShippingCost._avg.shipping_cost || 0,
            total: avgShippingCost._sum.shipping_cost || 0
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Get courier performance
  getCourierPerformance = async (req: Request, res: Response) => {
    try {
      const performance = await prisma.shipments.groupBy({
        by: ['courier_service'],
        _count: true,
        _avg: { shipping_cost: true }
      });

      res.json({
        data: performance.map(p => ({
          courier: p.courier_service,
          totalShipments: p._count,
          avgCost: p._avg.shipping_cost || 0
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Bulk update shipment status
  bulkUpdateStatus = async (req: Request, res: Response) => {
    try {
      const { ids, status } = req.body;

      const result = await prisma.shipments.updateMany({
        where: { id: { in: ids } },
        data: {
          status,
          updated_at: new Date()
        }
      });

      res.json({ message: `Updated ${result.count} shipments` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}