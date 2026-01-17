import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

// Inventory Management
/**
 * @swagger
 * /api/admin/inventory:
 *   get:
 *     summary: Get all inventory (Admin)
 *     tags: [Admin - Inventory]
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
 */
router.get('/inventory', [
  query('productId').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], controller.getInventory);

/**
 * @swagger
 * /api/admin/inventory/{id}/adjust:
 *   post:
 *     summary: Adjust stock (Admin)
 *     tags: [Admin - Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [adjustment, reason, adjustedBy]
 *             properties:
 *               adjustment:
 *                 type: integer
 *               reason:
 *                 type: string
 *               adjustedBy:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Stock adjusted
 */
router.post('/inventory/:id/adjust', [
  param('id').isUUID().withMessage('Invalid inventory ID'),
  body('adjustment').isInt().withMessage('Adjustment must be an integer'),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('adjustedBy').isUUID().withMessage('Invalid admin user ID')
], controller.adjustStock);

/**
 * @swagger
 * /api/admin/inventory/{id}/reserve:
 *   post:
 *     summary: Reserve stock (Admin)
 *     tags: [Admin - Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               orderId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Stock reserved
 */
router.post('/inventory/:id/reserve', [
  param('id').isUUID().withMessage('Invalid inventory ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('orderId').optional().isUUID()
], controller.reserveStock);

/**
 * @swagger
 * /api/admin/inventory/{id}/release:
 *   post:
 *     summary: Release stock reservation (Admin)
 *     tags: [Admin - Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Reservation released
 */
router.post('/inventory/:id/release', [
  param('id').isUUID().withMessage('Invalid inventory ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive')
], controller.releaseReservation);

// Purchase Orders
/**
 * @swagger
 * /api/admin/purchase-orders:
 *   get:
 *     summary: Get all purchase orders (Admin)
 *     tags: [Admin - Purchase Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, shipped, received, cancelled]
 *         description: Filter by PO status
 *       - in: query
 *         name: factoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by factory ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Purchase orders retrieved
 */
router.get('/purchase-orders', [
  query('status').optional(),
  query('factoryId').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], controller.getPurchaseOrders);

/**
 * @swagger
 * /api/admin/purchase-orders/{id}/status:
 *   put:
 *     summary: Update purchase order status (Admin)
 *     tags: [Admin - Purchase Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, shipped, received, cancelled]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: PO status updated
 */
router.put('/purchase-orders/:id/status', [
  param('id').isUUID().withMessage('Invalid PO ID'),
  body('status').isIn(['pending', 'approved', 'shipped', 'received', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional()
], controller.updatePurchaseOrderStatus);

// Audit & Reports
/**
 * @swagger
 * /api/admin/audit:
 *   get:
 *     summary: Get stock audit log (Admin)
 *     tags: [Admin - Audit]
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by product ID
 *     responses:
 *       200:
 *         description: Audit log retrieved
 */
router.get('/audit', [
  query('productId').optional().isUUID()
], controller.getStockAudit);

/**
 * @swagger
 * /api/admin/low-stock:
 *   get:
 *     summary: Get low stock items (Admin)
 *     tags: [Admin - Reports]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Low stock items retrieved
 */
router.get('/low-stock', [
  query('threshold').optional().isInt({ min: 0 })
], controller.getLowStockItems);

export default router;
