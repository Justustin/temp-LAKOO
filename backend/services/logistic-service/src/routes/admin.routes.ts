import { Router } from 'express';
import {
  getAllShipments,
  updateShipment,
  updateShipmentStatus,
  addTrackingEvent,
  markDelivered,
  markFailed,
  getShipmentStats,
  getAllCouriers,
  createCourier,
  updateCourier,
  toggleCourier,
  addCourierService,
  getAllWarehouses,
  createWarehouse,
  updateWarehouse,
  setDefaultWarehouse
} from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  validate,
  updateShipmentStatusSchema,
  createTrackingEventSchema,
  createCourierSchema,
  createWarehouseSchema
} from '../middleware/validation';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// =============================================================================
// Shipment Routes
// =============================================================================

router.get('/shipments', getAllShipments);
router.put('/shipments/:id', updateShipment);
router.put('/shipments/:id/status', validate(updateShipmentStatusSchema), updateShipmentStatus);
router.post('/shipments/:id/tracking', validate(createTrackingEventSchema), addTrackingEvent);
router.post('/shipments/:id/delivered', markDelivered);
router.post('/shipments/:id/failed', markFailed);
router.get('/shipments/stats', getShipmentStats);

// =============================================================================
// Courier Routes
// =============================================================================

router.get('/couriers', getAllCouriers);
router.post('/couriers', validate(createCourierSchema), createCourier);
router.put('/couriers/:id', updateCourier);
router.post('/couriers/:id/toggle', toggleCourier);
router.post('/couriers/:id/services', addCourierService);

// =============================================================================
// Warehouse Routes
// =============================================================================

router.get('/warehouses', getAllWarehouses);
router.post('/warehouses', validate(createWarehouseSchema), createWarehouse);
router.put('/warehouses/:id', updateWarehouse);
router.post('/warehouses/:id/default', setDefaultWarehouse);

export default router;
