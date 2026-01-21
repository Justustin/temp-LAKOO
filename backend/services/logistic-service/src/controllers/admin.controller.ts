import { Request, Response } from 'express';
import { ShipmentService } from '../services/shipment.service';
import { CourierRepository } from '../repositories/courier.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { ShipmentStatus } from '../types';
import { asyncHandler } from '../middleware/error-handler';

export class AdminController {
  private shipmentService: ShipmentService;
  private courierRepository: CourierRepository;
  private warehouseRepository: WarehouseRepository;

  constructor() {
    this.shipmentService = new ShipmentService();
    this.courierRepository = new CourierRepository();
    this.warehouseRepository = new WarehouseRepository();
  }

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
  getAllShipments = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as ShipmentStatus | undefined;

    const result = await this.shipmentService.getAllShipments({ page, limit, status });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * @swagger
   * /api/admin/shipments/{id}:
   *   put:
   *     summary: Update shipment (admin)
   *     tags: [Admin - Shipments]
   */
  updateShipment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const shipment = await this.shipmentService.updateShipment(id, req.body);

    res.json({
      success: true,
      data: shipment
    });
  });

  /**
   * @swagger
   * /api/admin/shipments/{id}/status:
   *   put:
   *     summary: Update shipment status (admin)
   *     tags: [Admin - Shipments]
   */
  updateShipmentStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, ...additionalData } = req.body;

    const shipment = await this.shipmentService.updateShipmentStatus(
      id,
      status as ShipmentStatus,
      additionalData
    );

    res.json({
      success: true,
      data: shipment
    });
  });

  /**
   * @swagger
   * /api/admin/shipments/{id}/tracking:
   *   post:
   *     summary: Add manual tracking event (admin)
   *     tags: [Admin - Shipments]
   */
  addTrackingEvent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const trackingEvent = await this.shipmentService.addTrackingEvent({
      shipmentId: id,
      ...req.body,
      source: 'manual'
    });

    res.status(201).json({
      success: true,
      data: trackingEvent
    });
  });

  /**
   * @swagger
   * /api/admin/shipments/{id}/delivered:
   *   post:
   *     summary: Mark shipment as delivered (admin)
   *     tags: [Admin - Shipments]
   */
  markDelivered = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { receiverName, proofOfDeliveryUrl, signature } = req.body;

    const shipment = await this.shipmentService.markDelivered(
      id,
      receiverName,
      proofOfDeliveryUrl,
      signature
    );

    res.json({
      success: true,
      data: shipment
    });
  });

  /**
   * @swagger
   * /api/admin/shipments/{id}/failed:
   *   post:
   *     summary: Mark shipment as failed (admin)
   *     tags: [Admin - Shipments]
   */
  markFailed = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { failureReason } = req.body;

    const shipment = await this.shipmentService.markFailed(id, failureReason);

    res.json({
      success: true,
      data: shipment
    });
  });

  /**
   * @swagger
   * /api/admin/shipments/stats:
   *   get:
   *     summary: Get shipment statistics (admin)
   *     tags: [Admin - Shipments]
   */
  getShipmentStats = asyncHandler(async (req: Request, res: Response) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const stats = await this.shipmentService.getShipmentStats(startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  });

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
  getAllCouriers = asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true';
    const couriers = includeInactive
      ? await this.courierRepository.findAll()
      : await this.courierRepository.findActive();

    res.json({
      success: true,
      data: couriers
    });
  });

  /**
   * @swagger
   * /api/admin/couriers:
   *   post:
   *     summary: Create courier integration (admin)
   *     tags: [Admin - Couriers]
   */
  createCourier = asyncHandler(async (req: Request, res: Response) => {
    const courier = await this.courierRepository.create(req.body);

    res.status(201).json({
      success: true,
      data: courier
    });
  });

  /**
   * @swagger
   * /api/admin/couriers/{id}:
   *   put:
   *     summary: Update courier integration (admin)
   *     tags: [Admin - Couriers]
   */
  updateCourier = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const courier = await this.courierRepository.update(id, req.body);

    res.json({
      success: true,
      data: courier
    });
  });

  /**
   * @swagger
   * /api/admin/couriers/{id}/toggle:
   *   post:
   *     summary: Toggle courier active status (admin)
   *     tags: [Admin - Couriers]
   */
  toggleCourier = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const courier = await this.courierRepository.update(id, { isActive });

    res.json({
      success: true,
      data: courier
    });
  });

  /**
   * @swagger
   * /api/admin/couriers/{id}/services:
   *   post:
   *     summary: Add courier service (admin)
   *     tags: [Admin - Couriers]
   */
  addCourierService = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const service = await this.courierRepository.addService({
      courierId: id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: service
    });
  });

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
  getAllWarehouses = asyncHandler(async (_req: Request, res: Response) => {
    const warehouses = await this.warehouseRepository.findAll();

    res.json({
      success: true,
      data: warehouses
    });
  });

  /**
   * @swagger
   * /api/admin/warehouses:
   *   post:
   *     summary: Create warehouse (admin)
   *     tags: [Admin - Warehouses]
   */
  createWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const warehouse = await this.warehouseRepository.create(req.body);

    res.status(201).json({
      success: true,
      data: warehouse
    });
  });

  /**
   * @swagger
   * /api/admin/warehouses/{id}:
   *   put:
   *     summary: Update warehouse (admin)
   *     tags: [Admin - Warehouses]
   */
  updateWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const warehouse = await this.warehouseRepository.update(id, req.body);

    res.json({
      success: true,
      data: warehouse
    });
  });

  /**
   * @swagger
   * /api/admin/warehouses/{id}/default:
   *   post:
   *     summary: Set warehouse as default (admin)
   *     tags: [Admin - Warehouses]
   */
  setDefaultWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const warehouse = await this.warehouseRepository.setDefault(id);

    res.json({
      success: true,
      data: warehouse
    });
  });
}

export const adminController = new AdminController();
