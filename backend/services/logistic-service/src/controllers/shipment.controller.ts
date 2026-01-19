import { Request, Response, NextFunction } from 'express';
import { ShipmentService } from '../services/shipment.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { ShipmentStatus } from '../types';

const shipmentService = new ShipmentService();

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
export async function trackShipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { trackingNumber } = req.params;
    const shipment = await shipmentService.getShipmentByTrackingNumber(trackingNumber);

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
  } catch (error) {
    next(error);
  }
}

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
export async function createShipment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const shipment = await shipmentService.createShipment({
      ...req.body,
      userId
    });

    res.status(201).json({
      success: true,
      data: shipment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/shipments/user:
 *   get:
 *     summary: Get shipments for authenticated user
 *     tags: [Shipments]
 */
export async function getUserShipments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await shipmentService.getShipmentsByUserId(userId, { page, limit });

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
 * /api/shipments/{id}:
 *   get:
 *     summary: Get shipment by ID
 *     tags: [Shipments]
 */
export async function getShipmentById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const shipment = await shipmentService.getShipmentById(id);

    // Users can only view their own shipments
    if (req.user!.role !== 'admin' && shipment.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

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
 * /api/shipments/order/{orderId}:
 *   get:
 *     summary: Get shipment by order ID
 *     tags: [Shipments]
 */
export async function getShipmentByOrderId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params;
    const shipment = await shipmentService.getShipmentByOrderId(orderId);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'No shipment found for this order'
      });
    }

    // Users can only view their own shipments
    if (req.user!.role !== 'admin' && shipment.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

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
 * /api/shipments/{id}/tracking:
 *   get:
 *     summary: Get tracking history for a shipment
 *     tags: [Shipments]
 */
export async function getTrackingHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const shipment = await shipmentService.getShipmentById(id);

    // Users can only view their own shipments
    if (req.user!.role !== 'admin' && shipment.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const trackingEvents = await shipmentService.getTrackingHistory(id);

    res.json({
      success: true,
      data: trackingEvents
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/shipments/{id}/cancel:
 *   post:
 *     summary: Cancel a shipment
 *     tags: [Shipments]
 */
export async function cancelShipment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const shipment = await shipmentService.getShipmentById(id);

    // Users can only cancel their own shipments
    if (req.user!.role !== 'admin' && shipment.userId !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const cancelledShipment = await shipmentService.cancelShipment(id);

    res.json({
      success: true,
      data: cancelledShipment
    });
  } catch (error) {
    next(error);
  }
}

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
export async function createShipmentInternal(req: Request, res: Response, next: NextFunction) {
  try {
    const shipment = await shipmentService.createShipment(req.body);

    res.status(201).json({
      success: true,
      data: shipment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/internal/shipments/{id}/book:
 *   post:
 *     summary: Book shipment with courier (internal)
 *     tags: [Internal]
 */
export async function bookShipmentInternal(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const shipment = await shipmentService.bookShipment({
      shipmentId: id,
      ...req.body
    });

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
 * /api/internal/shipments/{id}/status:
 *   put:
 *     summary: Update shipment status (internal)
 *     tags: [Internal]
 */
export async function updateStatusInternal(req: Request, res: Response, next: NextFunction) {
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
 * /api/internal/shipments/order/{orderId}:
 *   get:
 *     summary: Get shipment by order ID (internal)
 *     tags: [Internal]
 */
export async function getByOrderIdInternal(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params;
    const shipment = await shipmentService.getShipmentByOrderId(orderId);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'No shipment found for this order'
      });
    }

    res.json({
      success: true,
      data: shipment
    });
  } catch (error) {
    next(error);
  }
}
