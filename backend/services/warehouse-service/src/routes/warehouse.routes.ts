import { Router } from 'express';
import { body } from 'express-validator';
import { WarehouseController } from '../controllers/warehouse.controller';

const router = Router();
const controller = new WarehouseController();

/**
 * @swagger
 * /api/fulfill-demand:
 *   post:
 *     summary: (Internal) Fulfills demand from a completed group buy session
 *     tags: [Warehouse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity, wholesaleUnit]
 *             properties:
 *               productId: { type: 'string', format: 'uuid' }
 *               variantId: { type: 'string', format: 'uuid' }
 *               quantity: { type: 'integer', minimum: 1 }
 *               wholesaleUnit: { type: 'integer', minimum: 1 }
 *     responses:
 *       200: { description: 'Demand processed' }
 *       500: { description: 'Internal server error' }
 */
router.post('/fulfill-demand', [
    body('productId').isUUID(),
    body('variantId').optional().isUUID(),
    body('quantity').isInt({ gt: 0 }),
    body('wholesaleUnit').isInt({ gt: 0 }),
], controller.fulfillDemand);

/**
 * @swagger
 * /api/fulfill-bundle-demand:
 *   post:
 *     summary: (Internal) Fulfills demand using grosir bundle configuration
 *     description: More sophisticated than fulfill-demand - uses bundle config and warehouse tolerance
 *     tags: [Warehouse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity, wholesaleUnit]
 *             properties:
 *               productId: { type: 'string', format: 'uuid' }
 *               variantId: { type: 'string', format: 'uuid', nullable: true }
 *               quantity: { type: 'integer', minimum: 1 }
 *               wholesaleUnit: { type: 'integer', minimum: 1 }
 *     responses:
 *       200:
 *         description: Demand processed with bundle calculations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean' }
 *                 message: { type: 'string' }
 *                 hasStock: { type: 'boolean' }
 *                 bundlesNeeded: { type: 'integer' }
 *                 excessUnits: { type: 'integer' }
 *                 unitsPerBundle: { type: 'integer' }
 *       500: { description: 'Internal server error' }
 */
router.post('/fulfill-bundle-demand', [
    body('productId').isUUID(),
    body('variantId').optional({ nullable: true }).isUUID(),
    body('quantity').isInt({ gt: 0 }),
    body('wholesaleUnit').isInt({ gt: 0 }),
], controller.fulfillBundleDemand);

/**
 * @swagger
 * /api/inventory/status:
 *   get:
 *     summary: Get inventory status for a product/variant
 *     tags: [Warehouse]
 *     parameters:
 *       - in: query
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *       - in: query
 *         name: variantId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Variant ID (optional)
 *     responses:
 *       200:
 *         description: Inventory status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     productId: { type: 'string' }
 *                     variantId: { type: 'string', nullable: true }
 *                     quantity: { type: 'integer' }
 *                     reservedQuantity: { type: 'integer' }
 *                     availableQuantity: { type: 'integer' }
 *                     maxStockLevel: { type: 'integer' }
 *                     reorderThreshold: { type: 'integer' }
 *                     status: { type: 'string', enum: ['in_stock', 'low_stock', 'out_of_stock', 'not_configured'] }
 *       400: { description: 'Bad request - productId is required' }
 *       500: { description: 'Internal server error' }
 */
router.get('/inventory/status', controller.getInventoryStatus);

/**
 * @swagger
 * /api/warehouse/check-bundle-overflow:
 *   get:
 *     summary: Check if ordering a bundle would overflow other variants
 *     description: Used by group-buying-service to prevent ordering variants when bundle would exceed max_stock_level
 *     tags: [Warehouse]
 *     parameters:
 *       - in: query
 *         name: productId
 *         required: true
 *         schema: { type: 'string' }
 *         description: Product ID
 *       - in: query
 *         name: variantId
 *         schema: { type: 'string' }
 *         description: Variant ID (null for base product)
 *     responses:
 *       200:
 *         description: Bundle overflow check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     isLocked: { type: 'boolean' }
 *                     reason: { type: 'string' }
 *                     canOrder: { type: 'boolean' }
 *                     overflowVariants: { type: 'array', items: { type: 'string' } }
 *       400: { description: 'Bad request - productId is required' }
 *       500: { description: 'Internal server error' }
 */
router.get('/check-bundle-overflow', controller.checkBundleOverflow);

/**
 * @swagger
 * /api/warehouse/check-all-variants:
 *   get:
 *     summary: Check overflow status for all variants (for frontend display)
 *     description: Returns lock status for ALL variants at once so frontend can gray out locked options
 *     tags: [Warehouse]
 *     parameters:
 *       - in: query
 *         name: productId
 *         required: true
 *         schema: { type: 'string' }
 *         description: Product ID
 *     responses:
 *       200:
 *         description: All variant statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     productId: { type: 'string' }
 *                     variants:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           variantId: { type: 'string', nullable: true }
 *                           variantName: { type: 'string' }
 *                           isLocked: { type: 'boolean' }
 *                           canOrder: { type: 'boolean' }
 *                           reason: { type: 'string' }
 *                           availableQuantity: { type: 'integer' }
 *                           overflowVariants: { type: 'array', items: { type: 'string' } }
 *       400: { description: 'Bad request - productId is required' }
 *       500: { description: 'Internal server error' }
 */
router.get('/check-all-variants', controller.checkAllVariantsOverflow);



/**
 * @swagger
 * /api/warehouse/reserve-inventory:
 *   post:
 *     summary: Reserve inventory for a paid group buying participant
 *     description: Called by payment service when a group buying payment is confirmed. Only reserves if stock is available.
 *     tags: [Warehouse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: 'string', format: 'uuid' }
 *               variantId: { type: 'string', format: 'uuid', nullable: true }
 *               quantity: { type: 'integer', minimum: 1 }
 *     responses:
 *       200:
 *         description: Reservation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: 'boolean' }
 *                 message: { type: 'string' }
 *                 reserved: { type: 'boolean' }
 *                 quantity: { type: 'integer' }
 *                 availableAfter: { type: 'integer' }
 *       400: { description: 'Bad request - productId and quantity are required' }
 *       500: { description: 'Internal server error' }
 */
router.post('/reserve-inventory', [
    body('productId').isUUID(),
    body('variantId').optional({ nullable: true }).isUUID(),
    body('quantity').isInt({ gt: 0 }),
], controller.reserveInventory);

export default router;