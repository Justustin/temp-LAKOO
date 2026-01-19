import { Router } from 'express';
import {
  createShipmentInternal,
  bookShipmentInternal,
  updateStatusInternal,
  getByOrderIdInternal
} from '../controllers/shipment.controller';
import { getShippingRatesInternal } from '../controllers/rate.controller';
import { requireInternalAuth } from '../middleware/auth';
import { validate, createShipmentSchema, getRatesSchema } from '../middleware/validation';

const router: import('express').Router = Router();

// All internal routes require internal API key
router.use(requireInternalAuth);

// =============================================================================
// Shipment Routes (for Order Service)
// =============================================================================

// Create shipment for an order
router.post('/shipments', validate(createShipmentSchema), createShipmentInternal);

// Book shipment with courier
router.post('/shipments/:id/book', bookShipmentInternal);

// Update shipment status
router.put('/shipments/:id/status', updateStatusInternal);

// Get shipment by order ID
router.get('/shipments/order/:orderId', getByOrderIdInternal);

// =============================================================================
// Rate Routes (for Checkout Service)
// =============================================================================

// Get shipping rates
router.post('/rates', validate(getRatesSchema), getShippingRatesInternal);

export default router;
