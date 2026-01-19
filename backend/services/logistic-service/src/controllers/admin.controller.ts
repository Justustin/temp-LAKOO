import { Request, Response, NextFunction } from 'express';
import { ShipmentService } from '../services/shipment.service';
import { CourierRepository } from '../repositories/courier.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { ShipmentStatus } from '../types';

const shipmentService = new ShipmentService();
const courierRepository = new CourierRepository();
const warehouseRepository = new WarehouseRepository();

// =============================================================================
// Shipment Management
// =============================================================================

/**
 * @swagger
 * /api/admin/shipments:
 *   get:
 *     summary: Get all shipments (admin)
 *     tags: [Admin - Shipments]
 */
export async function getAllShipments(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as ShipmentStatus | undefined;

    const result = await shipmentService.getAllShipments({ page, limit, status });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/shipments/{id}:
 *   put:
 *     summary: Update shipment (admin)
 *     tags: [Admin - Shipments]
 */
export async function updateShipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const shipment = await shipmentService.updateShipment(id, req.body);

    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/shipments/{id}/status:
 *   put:
 *     summary: Update shipment status (admin)
 *     tags: [Admin - Shipments]
 */
export async function updateShipmentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, ...additionalData } = req.body;

    const shipment = await shipmentService.updateShipmentStatus(
      id,
      status as ShipmentStatus,
      additionalData
    );

    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/shipments/{id}/tracking:
 *   post:
 *     summary: Add manual tracking event (admin)
 *     tags: [Admin - Shipments]
 */
export async function addTrackingEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const trackingEvent = await shipmentService.addTrackingEvent({
      shipmentId: id,
      ...req.body,
      source: 'manual'
    });

    res.status(201).json({
      success: true,
      data: trackingEvent
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/shipments/{id}/delivered:
 *   post:
 *     summary: Mark shipment as delivered (admin)
 *     tags: [Admin - Shipments]
 */
export async function markDelivered(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { receiverName, proofOfDeliveryUrl, signature } = req.body;

    const shipment = await shipmentService.markDelivered(
      id,
      receiverName,
      proofOfDeliveryUrl,
      signature
    );

    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/shipments/{id}/failed:
 *   post:
 *     summary: Mark shipment as failed (admin)
 *     tags: [Admin - Shipments]
 */
export async function markFailed(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { failureReason } = req.body;

    const shipment = await shipmentService.markFailed(id, failureReason);

    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/shipments/stats:
 *   get:
 *     summary: Get shipment statistics (admin)
 *     tags: [Admin - Shipments]
 */
export async function getShipmentStats(req: Request, res: Response, next: NextFunction) {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const stats = await shipmentService.getShipmentStats(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Courier Management
// =============================================================================

/**
 * @swagger
 * /api/admin/couriers:
 *   get:
 *     summary: Get all couriers (admin)
 *     tags: [Admin - Couriers]
 */
export async function getAllCouriers(req: Request, res: Response, next: NextFunction) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const couriers = includeInactive
      ? await courierRepository.findAll()
      : await courierRepository.findActive();

    res.json({
      success: true,
      data: couriers
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/couriers:
 *   post:
 *     summary: Create courier integration (admin)
 *     tags: [Admin - Couriers]
 */
export async function createCourier(req: Request, res: Response, next: NextFunction) {
  try {
    const courier = await courierRepository.create(req.body);

    res.status(201).json({
      success: true,
      data: courier
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/couriers/{id}:
 *   put:
 *     summary: Update courier integration (admin)
 *     tags: [Admin - Couriers]
 */
export async function updateCourier(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const courier = await courierRepository.update(id, req.body);

    res.json({
      success: true,
      data: courier
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/couriers/{id}/toggle:
 *   post:
 *     summary: Toggle courier active status (admin)
 *     tags: [Admin - Couriers]
 */
export async function toggleCourier(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const courier = await courierRepository.update(id, { isActive });

    res.json({
      success: true,
      data: courier
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/couriers/{id}/services:
 *   post:
 *     summary: Add courier service (admin)
 *     tags: [Admin - Couriers]
 */
export async function addCourierService(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const service = await courierRepository.addService({
      courierId: id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// Warehouse Management
// =============================================================================

/**
 * @swagger
 * /api/admin/warehouses:
 *   get:
 *     summary: Get all warehouses (admin)
 *     tags: [Admin - Warehouses]
 */
export async function getAllWarehouses(req: Request, res: Response, next: NextFunction) {
  try {
    const warehouses = await warehouseRepository.findAll();

    res.json({
      success: true,
      data: warehouses
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/warehouses:
 *   post:
 *     summary: Create warehouse (admin)
 *     tags: [Admin - Warehouses]
 */
export async function createWarehouse(req: Request, res: Response, next: NextFunction) {
  try {
    const warehouse = await warehouseRepository.create(req.body);

    res.status(201).json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/warehouses/{id}:
 *   put:
 *     summary: Update warehouse (admin)
 *     tags: [Admin - Warehouses]
 */
export async function updateWarehouse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const warehouse = await warehouseRepository.update(id, req.body);

    res.json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/admin/warehouses/{id}/default:
 *   post:
 *     summary: Set warehouse as default (admin)
 *     tags: [Admin - Warehouses]
 */
export async function setDefaultWarehouse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const warehouse = await warehouseRepository.setDefault(id);

    res.json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
}
