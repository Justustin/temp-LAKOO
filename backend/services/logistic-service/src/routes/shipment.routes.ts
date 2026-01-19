import { Router } from 'express';
import {
  trackShipment,
  createShipment,
  getUserShipments,
  getShipmentById,
  getShipmentByOrderId,
  getTrackingHistory,
  cancelShipment
} from '../controllers/shipment.controller';
import { authenticate } from '../middleware/auth';
import { validate, createShipmentSchema } from '../middleware/validation';

const router = Router();

// =============================================================================
// Public Routes
// =============================================================================

// Track shipment by tracking number (no auth required)
router.get('/track/:trackingNumber', trackShipment);

// =============================================================================
// Authenticated Routes
// =============================================================================

// Create shipment
router.post(
  '/',
  authenticate,
  validate(createShipmentSchema),
  createShipment
);

// Get user's shipments
router.get('/user', authenticate, getUserShipments);

// Get shipment by ID
router.get('/:id', authenticate, getShipmentById);

// Get shipment by order ID
router.get('/order/:orderId', authenticate, getShipmentByOrderId);

// Get tracking history
router.get('/:id/tracking', authenticate, getTrackingHistory);

// Cancel shipment
router.post('/:id/cancel', authenticate, cancelShipment);

export default router;
