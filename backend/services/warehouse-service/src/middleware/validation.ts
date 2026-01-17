import { Request, Response, NextFunction } from 'express';
import { validationResult, body, query, param } from 'express-validator';

/**
 * Middleware to check express-validator results and return 400 if validation failed.
 * Use AFTER validator arrays in route definitions.
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// =============================================================================
// Inventory Validators
// =============================================================================

export const getInventoryStatusValidators = [
  query('productId').isUUID().withMessage('productId must be a valid UUID'),
  query('variantId').optional().isUUID().withMessage('variantId must be a valid UUID')
];

export const reserveInventoryValidators = [
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('variantId').optional({ nullable: true }).isUUID().withMessage('variantId must be a valid UUID'),
  body('quantity').isInt({ gt: 0 }).withMessage('quantity must be a positive integer'),
  body('orderId').optional().isUUID().withMessage('orderId must be a valid UUID'),
  body('orderItemId').optional().isUUID().withMessage('orderItemId must be a valid UUID')
];

export const releaseReservationValidators = [
  body('reservationId').isUUID().withMessage('reservationId must be a valid UUID')
];

export const confirmReservationValidators = [
  body('reservationId').isUUID().withMessage('reservationId must be a valid UUID')
];

// =============================================================================
// Bundle/Grosir Validators
// =============================================================================

export const checkBundleOverflowValidators = [
  query('productId').isUUID().withMessage('productId must be a valid UUID'),
  query('variantId').optional().isUUID().withMessage('variantId must be a valid UUID')
];

export const checkAllVariantsValidators = [
  query('productId').isUUID().withMessage('productId must be a valid UUID')
];

export const fulfillDemandValidators = [
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('variantId').optional({ nullable: true }).isUUID().withMessage('variantId must be a valid UUID'),
  body('quantity').isInt({ gt: 0 }).withMessage('quantity must be a positive integer'),
  body('wholesaleUnit').isInt({ gt: 0 }).withMessage('wholesaleUnit must be a positive integer')
];

export const fulfillBundleDemandValidators = [
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('variantId').optional({ nullable: true }).isUUID().withMessage('variantId must be a valid UUID'),
  body('quantity').isInt({ gt: 0 }).withMessage('quantity must be a positive integer')
];

// =============================================================================
// Purchase Order Validators
// =============================================================================

export const createPurchaseOrderValidators = [
  body('supplierId').isUUID().withMessage('supplierId must be a valid UUID'),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.productId').isUUID().withMessage('Each item must have a valid productId'),
  body('items.*.variantId').optional({ nullable: true }).isUUID().withMessage('variantId must be a valid UUID'),
  body('items.*.bundleQuantity').isInt({ gt: 0 }).withMessage('bundleQuantity must be a positive integer'),
  body('notes').optional().isString().withMessage('notes must be a string')
];

export const updatePurchaseOrderStatusValidators = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
  body('status').isIn(['draft', 'pending_approval', 'approved', 'sent_to_supplier', 'partially_received', 'received', 'cancelled'])
    .withMessage('Invalid status value')
];

export const receivePurchaseOrderValidators = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.itemId').isUUID().withMessage('Each item must have a valid itemId'),
  body('items.*.receivedUnits').isInt({ min: 0 }).withMessage('receivedUnits must be a non-negative integer'),
  body('items.*.damagedUnits').optional().isInt({ min: 0 }).withMessage('damagedUnits must be a non-negative integer')
];

// =============================================================================
// Stock Alert Validators
// =============================================================================

export const acknowledgeAlertValidators = [
  param('id').isUUID().withMessage('id must be a valid UUID')
];

export const resolveAlertValidators = [
  param('id').isUUID().withMessage('id must be a valid UUID')
];

// =============================================================================
// Admin Validators
// =============================================================================

export const adjustInventoryValidators = [
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('variantId').optional({ nullable: true }).isUUID().withMessage('variantId must be a valid UUID'),
  body('quantityChange').isInt().withMessage('quantityChange must be an integer (positive or negative)'),
  body('reason').isString().notEmpty().withMessage('reason is required'),
  body('notes').optional().isString().withMessage('notes must be a string')
];

export const createInventoryValidators = [
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('variantId').optional({ nullable: true }).isUUID().withMessage('variantId must be a valid UUID'),
  body('sku').isString().notEmpty().withMessage('sku is required'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('quantity must be a non-negative integer'),
  body('minStockLevel').optional().isInt({ min: 0 }).withMessage('minStockLevel must be a non-negative integer'),
  body('maxStockLevel').optional().isInt({ min: 0 }).withMessage('maxStockLevel must be a non-negative integer'),
  body('reorderPoint').optional().isInt({ min: 0 }).withMessage('reorderPoint must be a non-negative integer'),
  body('reorderQuantity').optional().isInt({ min: 0 }).withMessage('reorderQuantity must be a non-negative integer'),
  body('location').optional().isString().withMessage('location must be a string'),
  body('zone').optional().isString().withMessage('zone must be a string')
];

export const updateBundleConfigValidators = [
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('supplierId').optional().isUUID().withMessage('supplierId must be a valid UUID'),
  body('bundleName').optional().isString().withMessage('bundleName must be a string'),
  body('totalUnits').isInt({ gt: 0 }).withMessage('totalUnits must be a positive integer'),
  body('sizeBreakdown').isObject().withMessage('sizeBreakdown must be an object'),
  body('bundleCost').isNumeric().withMessage('bundleCost must be a number'),
  body('minBundleOrder').optional().isInt({ min: 1 }).withMessage('minBundleOrder must be at least 1')
];

export const updateToleranceValidators = [
  body('productId').isUUID().withMessage('productId must be a valid UUID'),
  body('variantId').optional({ nullable: true }).isUUID().withMessage('variantId must be a valid UUID'),
  body('size').optional().isString().withMessage('size must be a string'),
  body('maxExcessUnits').isInt({ min: 0 }).withMessage('maxExcessUnits must be a non-negative integer')
];
