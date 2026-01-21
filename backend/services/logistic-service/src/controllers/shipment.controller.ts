import { Request, Response } from 'express';
import { ShipmentService } from '../services/shipment.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { ShipmentStatus } from '../types';
import { asyncHandler, ForbiddenError, NotFoundError } from '../middleware/error-handler';

/**
 * @swagger
 * components:
 *   schemas:
 *     Shipment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         shipmentNumber:
 *           type: string
 *         orderId:
 *           type: string
 *         status:
 *           type: string
 *         trackingNumber:
 *           type: string
 */

export class ShipmentController {
  private service: ShipmentService;

  constructor() {
    this.service = new ShipmentService();
  }

  // =============================================================================
  // Public Endpoints
  // =============================================================================

  /**
   * @swagger
   * /api/shipments/track/{trackingNumber}:
   *   get:
   *     summary: Track shipment by tracking number
   *     tags: [Shipments]
   */
  trackShipment = asyncHandler(async (req: Request, res: Response) => {
    const { trackingNumber } = req.params;
    const shipment = await this.service.getShipmentByTrackingNumber(trackingNumber);

    res.json({
      success: true,
      data: {
        shipmentNumber: shipment.shipmentNumber,
        trackingNumber: shipment.trackingNumber,
        courier: shipment.courier,
        courierName: shipment.courierName,
        status: shipment.status,
        estimatedDelivery: shipment.estimatedDelivery,
        origin: {
          city: shipment.originCity,
          province: shipment.originProvince
        },
        destination: {
          city: shipment.destCity,
          province: shipment.destProvince
        },
        trackingEvents: shipment.trackingEvents
      }
    });
  });

  // =============================================================================
  // User Endpoints (Authenticated)
  // =============================================================================

  /**
   * @swagger
   * /api/shipments:
   *   post:
   *     summary: Create a new shipment
   *     tags: [Shipments]
   */
  createShipment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const shipment = await this.service.createShipment({
      ...req.body,
      userId
    });

    res.status(201).json({
      success: true,
      data: shipment
    });
  });

  /**
   * @swagger
   * /api/shipments/user:
   *   get:
   *     summary: Get shipments for authenticated user
   *     tags: [Shipments]
   */
  getUserShipments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await this.service.getShipmentsByUserId(userId, { page, limit });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * @swagger
   * /api/shipments/{id}:
   *   get:
   *     summary: Get shipment by ID
   *     tags: [Shipments]
   */
  getShipmentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const shipment = await this.service.getShipmentById(id);

    // Users can only view their own shipments
    if (req.user!.role !== 'admin' && shipment.userId !== req.user!.id) {
      throw new ForbiddenError('Access denied');
    }

    res.json({
      success: true,
      data: shipment
    });
  });

  /**
   * @swagger
   * /api/shipments/order/{orderId}:
   *   get:
   *     summary: Get shipment by order ID
   *     tags: [Shipments]
   */
  getShipmentByOrderId = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;
    const shipment = await this.service.getShipmentByOrderId(orderId);

    if (!shipment) {
      throw new NotFoundError('No shipment found for this order');
    }

    // Users can only view their own shipments
    if (req.user!.role !== 'admin' && shipment.userId !== req.user!.id) {
      throw new ForbiddenError('Access denied');
    }

    res.json({
      success: true,
      data: shipment
    });
  });

  /**
   * @swagger
   * /api/shipments/{id}/tracking:
   *   get:
   *     summary: Get tracking history for a shipment
   *     tags: [Shipments]
   */
  getTrackingHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const shipment = await this.service.getShipmentById(id);

    // Users can only view their own shipments
    if (req.user!.role !== 'admin' && shipment.userId !== req.user!.id) {
      throw new ForbiddenError('Access denied');
    }

    const trackingEvents = await this.service.getTrackingHistory(id);

    res.json({
      success: true,
      data: trackingEvents
    });
  });

  /**
   * @swagger
   * /api/shipments/{id}/cancel:
   *   post:
   *     summary: Cancel a shipment
   *     tags: [Shipments]
   */
  cancelShipment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const shipment = await this.service.getShipmentById(id);

    // Users can only cancel their own shipments
    if (req.user!.role !== 'admin' && shipment.userId !== req.user!.id) {
      throw new ForbiddenError('Access denied');
    }

    const cancelledShipment = await this.service.cancelShipment(id);

    res.json({
      success: true,
      data: cancelledShipment
    });
  });

  // =============================================================================
  // Internal Endpoints (Service-to-Service)
  // =============================================================================

  /**
   * @swagger
   * /api/internal/shipments:
   *   post:
   *     summary: Create shipment (internal use by order service)
   *     tags: [Internal]
   */
  createShipmentInternal = asyncHandler(async (req: Request, res: Response) => {
    const shipment = await this.service.createShipment(req.body);

    res.status(201).json({
      success: true,
      data: shipment
    });
  });

  /**
   * @swagger
   * /api/internal/shipments/{id}/book:
   *   post:
   *     summary: Book shipment with courier (internal)
   *     tags: [Internal]
   */
  bookShipmentInternal = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const shipment = await this.service.bookShipment({
      shipmentId: id,
      ...req.body
    });

    res.json({
      success: true,
      data: shipment
    });
  });

  /**
   * @swagger
   * /api/internal/shipments/{id}/status:
   *   put:
   *     summary: Update shipment status (internal)
   *     tags: [Internal]
   */
  updateStatusInternal = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, ...additionalData } = req.body;

    const shipment = await this.service.updateShipmentStatus(
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
   * /api/internal/shipments/order/{orderId}:
   *   get:
   *     summary: Get shipment by order ID (internal)
   *     tags: [Internal]
   */
  getByOrderIdInternal = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const shipment = await this.service.getShipmentByOrderId(orderId);

    if (!shipment) {
      throw new NotFoundError('No shipment found for this order');
    }

    res.json({
      success: true,
      data: shipment
    });
  });
}

export const shipmentController = new ShipmentController();
