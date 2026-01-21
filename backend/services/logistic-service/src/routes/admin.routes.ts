import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  validate,
  updateShipmentStatusSchema,
  createTrackingEventSchema,
  createCourierSchema,
  createWarehouseSchema
} from '../middleware/validation';

const router: import('express').Router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// =============================================================================
// Shipment Routes
// =============================================================================

router.get('/shipments', adminController.getAllShipments);
router.put('/shipments/:id', adminController.updateShipment);
router.put('/shipments/:id/status', validate(updateShipmentStatusSchema), adminController.updateShipmentStatus);
router.post('/shipments/:id/tracking', validate(createTrackingEventSchema), adminController.addTrackingEvent);
router.post('/shipments/:id/delivered', adminController.markDelivered);
router.post('/shipments/:id/failed', adminController.markFailed);
router.get('/shipments/stats', adminController.getShipmentStats);

// =============================================================================
// Courier Routes
// =============================================================================

router.get('/couriers', adminController.getAllCouriers);
router.post('/couriers', validate(createCourierSchema), adminController.createCourier);
router.put('/couriers/:id', adminController.updateCourier);
router.post('/couriers/:id/toggle', adminController.toggleCourier);
router.post('/couriers/:id/services', adminController.addCourierService);

// =============================================================================
// Warehouse Routes
// =============================================================================

router.get('/warehouses', adminController.getAllWarehouses);
router.post('/warehouses', validate(createWarehouseSchema), adminController.createWarehouse);
router.put('/warehouses/:id', adminController.updateWarehouse);
router.post('/warehouses/:id/default', adminController.setDefaultWarehouse);

export default router;
