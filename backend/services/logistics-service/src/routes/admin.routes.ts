import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

// Shipment Management
/**
 * @swagger
 * /api/admin/shipments:
 *   get:
 *     summary: Get all shipments (Admin)
 *     tags: [Admin - Shipments]
 */
router.get('/shipments', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional(),
  query('courierService').optional(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], controller.getAllShipments);

/**
 * @swagger
 * /api/admin/shipments/{id}:
 *   get:
 *     summary: Get shipment details (Admin)
 *     tags: [Admin - Shipments]
 */
router.get('/shipments/:id', [
  param('id').isUUID().withMessage('Invalid shipment ID')
], controller.getShipmentDetails);

/**
 * @swagger
 * /api/admin/shipments/{id}/status:
 *   put:
 *     summary: Update shipment status (Admin)
 *     tags: [Admin - Shipments]
 */
router.put('/shipments/:id/status', [
  param('id').isUUID().withMessage('Invalid shipment ID'),
  body('status').notEmpty().withMessage('Status is required')
], controller.updateShipmentStatus);

/**
 * @swagger
 * /api/admin/shipments/{id}/cancel:
 *   post:
 *     summary: Cancel shipment (Admin)
 *     tags: [Admin - Shipments]
 */
router.post('/shipments/:id/cancel', [
  param('id').isUUID().withMessage('Invalid shipment ID')
], controller.cancelShipment);

/**
 * @swagger
 * /api/admin/shipments/bulk-update:
 *   post:
 *     summary: Bulk update shipment status (Admin)
 *     tags: [Admin - Shipments]
 */
router.post('/shipments/bulk-update', [
  body('ids').isArray().withMessage('IDs must be an array'),
  body('status').notEmpty().withMessage('Status is required')
], controller.bulkUpdateStatus);

// Analytics
/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get shipment analytics (Admin)
 *     tags: [Admin - Analytics]
 */
router.get('/analytics', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], controller.getShipmentAnalytics);

/**
 * @swagger
 * /api/admin/couriers/performance:
 *   get:
 *     summary: Get courier performance (Admin)
 *     tags: [Admin - Couriers]
 */
router.get('/couriers/performance', controller.getCourierPerformance);

export default router;