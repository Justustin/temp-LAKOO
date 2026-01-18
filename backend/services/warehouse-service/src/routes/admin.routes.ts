import { Router } from 'express';
import { warehouseController } from '../controllers/warehouse.controller';
import { gatewayOrInternalAuth, requireRole } from '../middleware/auth';
import {
  validateRequest,
  getInventoryStatusValidators,
  createInventoryValidators,
  adjustInventoryValidators,
  updateBundleConfigValidators,
  updateToleranceValidators,
  createPurchaseOrderValidators,
  updatePurchaseOrderStatusValidators,
  receivePurchaseOrderValidators,
  acknowledgeAlertValidators,
  resolveAlertValidators
} from '../middleware/validation';

const router: Router = Router();

// All admin routes require authentication and admin/warehouse_admin role
router.use(gatewayOrInternalAuth);
router.use(requireRole('admin', 'warehouse_admin', 'internal'));

// =============================================================================
// INVENTORY MANAGEMENT
// =============================================================================

/**
 * @swagger
 * /api/admin/inventory:
 *   get:
 *     summary: Get all inventory items
 *     tags: [Admin - Inventory]
 */
router.get('/inventory', warehouseController.getAllInventory);

/**
 * @swagger
 * /api/admin/inventory:
 *   post:
 *     summary: Create new inventory record
 *     tags: [Admin - Inventory]
 */
router.post(
  '/inventory',
  createInventoryValidators,
  validateRequest,
  warehouseController.createInventory
);

/**
 * @swagger
 * /api/admin/inventory/adjust:
 *   post:
 *     summary: Adjust inventory quantity
 *     tags: [Admin - Inventory]
 */
router.post(
  '/inventory/adjust',
  adjustInventoryValidators,
  validateRequest,
  warehouseController.adjustInventory
);

/**
 * @swagger
 * /api/admin/inventory/movements:
 *   get:
 *     summary: Get inventory movement history
 *     tags: [Admin - Inventory]
 */
router.get(
  '/inventory/movements',
  getInventoryStatusValidators,
  validateRequest,
  warehouseController.getMovementHistory
);

// =============================================================================
// GROSIR BUNDLE CONFIGURATION
// =============================================================================

/**
 * @swagger
 * /api/admin/bundle-config:
 *   post:
 *     summary: Create or update bundle configuration
 *     tags: [Admin - Grosir]
 */
router.post(
  '/bundle-config',
  updateBundleConfigValidators,
  validateRequest,
  warehouseController.updateBundleConfig
);

/**
 * @swagger
 * /api/admin/tolerance:
 *   post:
 *     summary: Create or update warehouse tolerance
 *     tags: [Admin - Grosir]
 */
router.post(
  '/tolerance',
  updateToleranceValidators,
  validateRequest,
  warehouseController.updateTolerance
);

// =============================================================================
// STOCK ALERTS
// =============================================================================

/**
 * @swagger
 * /api/admin/alerts:
 *   get:
 *     summary: Get active stock alerts
 *     tags: [Admin - Alerts]
 */
router.get('/alerts', warehouseController.getActiveAlerts);

/**
 * @swagger
 * /api/admin/alerts/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge a stock alert
 *     tags: [Admin - Alerts]
 */
router.post(
  '/alerts/:id/acknowledge',
  acknowledgeAlertValidators,
  validateRequest,
  warehouseController.acknowledgeAlert
);

/**
 * @swagger
 * /api/admin/alerts/{id}/resolve:
 *   post:
 *     summary: Resolve a stock alert
 *     tags: [Admin - Alerts]
 */
router.post(
  '/alerts/:id/resolve',
  resolveAlertValidators,
  validateRequest,
  warehouseController.resolveAlert
);

// =============================================================================
// PURCHASE ORDERS
// =============================================================================

/**
 * @swagger
 * /api/admin/purchase-orders:
 *   get:
 *     summary: Get all purchase orders
 *     tags: [Admin - Purchase Orders]
 */
router.get('/purchase-orders', warehouseController.getPurchaseOrders);

/**
 * @swagger
 * /api/admin/purchase-orders/{id}:
 *   get:
 *     summary: Get purchase order by ID
 *     tags: [Admin - Purchase Orders]
 */
router.get('/purchase-orders/:id', warehouseController.getPurchaseOrder);

/**
 * @swagger
 * /api/admin/purchase-orders:
 *   post:
 *     summary: Create a new purchase order
 *     tags: [Admin - Purchase Orders]
 */
router.post(
  '/purchase-orders',
  createPurchaseOrderValidators,
  validateRequest,
  warehouseController.createPurchaseOrder
);

/**
 * @swagger
 * /api/admin/purchase-orders/{id}/status:
 *   patch:
 *     summary: Update purchase order status
 *     tags: [Admin - Purchase Orders]
 */
router.patch(
  '/purchase-orders/:id/status',
  updatePurchaseOrderStatusValidators,
  validateRequest,
  warehouseController.updatePurchaseOrderStatus
);

/**
 * @swagger
 * /api/admin/purchase-orders/{id}/receive:
 *   post:
 *     summary: Receive items from a purchase order
 *     tags: [Admin - Purchase Orders]
 */
router.post(
  '/purchase-orders/:id/receive',
  receivePurchaseOrderValidators,
  validateRequest,
  warehouseController.receivePurchaseOrder
);

export default router;
