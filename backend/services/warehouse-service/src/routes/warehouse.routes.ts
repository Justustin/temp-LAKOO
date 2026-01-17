import { Router } from 'express';
import { warehouseController } from '../controllers/warehouse.controller';
import { gatewayOrInternalAuth, requireRole } from '../middleware/auth';
import { validateRequest,
  getInventoryStatusValidators,
  reserveInventoryValidators,
  releaseReservationValidators,
  confirmReservationValidators,
  checkBundleOverflowValidators,
  checkAllVariantsValidators
} from '../middleware/validation';

const router = Router();

// =============================================================================
// PUBLIC ROUTES (via API Gateway)
// =============================================================================

/**
 * @swagger
 * /api/warehouse/inventory/status:
 *   get:
 *     summary: Get inventory status for a product/variant
 *     tags: [Warehouse]
 */
router.get(
  '/inventory/status',
  gatewayOrInternalAuth,
  getInventoryStatusValidators,
  validateRequest,
  warehouseController.getInventoryStatus
);

/**
 * @swagger
 * /api/warehouse/check-bundle-overflow:
 *   get:
 *     summary: Check if ordering a bundle would overflow other variants
 *     tags: [Warehouse]
 */
router.get(
  '/check-bundle-overflow',
  gatewayOrInternalAuth,
  checkBundleOverflowValidators,
  validateRequest,
  warehouseController.checkBundleOverflow
);

/**
 * @swagger
 * /api/warehouse/check-all-variants:
 *   get:
 *     summary: Check overflow status for all variants (for frontend)
 *     tags: [Warehouse]
 */
router.get(
  '/check-all-variants',
  gatewayOrInternalAuth,
  checkAllVariantsValidators,
  validateRequest,
  warehouseController.checkAllVariantsOverflow
);

// =============================================================================
// INTERNAL SERVICE ROUTES (Service-to-Service)
// =============================================================================

/**
 * @swagger
 * /api/warehouse/reserve-inventory:
 *   post:
 *     summary: Reserve inventory for an order
 *     description: Called by order-service when creating an order
 *     tags: [Warehouse - Internal]
 */
router.post(
  '/reserve-inventory',
  gatewayOrInternalAuth,
  reserveInventoryValidators,
  validateRequest,
  warehouseController.reserveInventory
);

/**
 * @swagger
 * /api/warehouse/release-reservation:
 *   post:
 *     summary: Release a stock reservation
 *     description: Called when order is cancelled
 *     tags: [Warehouse - Internal]
 */
router.post(
  '/release-reservation',
  gatewayOrInternalAuth,
  releaseReservationValidators,
  validateRequest,
  warehouseController.releaseReservation
);

/**
 * @swagger
 * /api/warehouse/confirm-reservation:
 *   post:
 *     summary: Confirm a stock reservation (deduct from inventory)
 *     description: Called when order is shipped
 *     tags: [Warehouse - Internal]
 */
router.post(
  '/confirm-reservation',
  gatewayOrInternalAuth,
  confirmReservationValidators,
  validateRequest,
  warehouseController.confirmReservation
);

export default router;
