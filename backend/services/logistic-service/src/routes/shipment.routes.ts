import { Router } from 'express';
import { shipmentController } from '../controllers/shipment.controller';
import { authenticate } from '../middleware/auth';
import { validate, createShipmentSchema } from '../middleware/validation';

const router: import('express').Router = Router();

// =============================================================================
// Public Routes
// =============================================================================

// Track shipment by tracking number (no auth required)
router.get('/track/:trackingNumber', shipmentController.trackShipment);

// =============================================================================
// Authenticated Routes
// =============================================================================

// Create shipment
router.post(
  '/',
  authenticate,
  validate(createShipmentSchema),
  shipmentController.createShipment
);

// Get user's shipments
router.get('/user', authenticate, shipmentController.getUserShipments);

// Get shipment by ID
router.get('/:id', authenticate, shipmentController.getShipmentById);

// Get shipment by order ID
router.get('/order/:orderId', authenticate, shipmentController.getShipmentByOrderId);

// Get tracking history
router.get('/:id/tracking', authenticate, shipmentController.getTrackingHistory);

// Cancel shipment
router.post('/:id/cancel', authenticate, shipmentController.cancelShipment);

export default router;
