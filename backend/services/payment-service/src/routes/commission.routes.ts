import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { gatewayOrInternalAuth, requireRole } from '../middleware/auth';
import * as commissionController from '../controllers/commission.controller';

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const recordCommissionValidators = [
  body('orderId')
    .isUUID()
    .withMessage('orderId must be a valid UUID'),
  body('orderNumber')
    .isString()
    .notEmpty()
    .withMessage('orderNumber is required'),
  body('sellerId')
    .isUUID()
    .withMessage('sellerId must be a valid UUID'),
  body('paymentId')
    .optional()
    .isUUID()
    .withMessage('paymentId must be a valid UUID'),
  body('orderAmount')
    .isFloat({ min: 0 })
    .withMessage('orderAmount must be a positive number'),
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('commissionRate must be between 0 and 1')
];

const markOrderCompletedValidators = [
  param('orderId')
    .isUUID()
    .withMessage('orderId must be a valid UUID'),
  body('sellerId')
    .isUUID()
    .withMessage('sellerId must be a valid UUID'),
  body('completedAt')
    .optional()
    .isISO8601()
    .withMessage('completedAt must be a valid ISO 8601 date')
];

const collectCommissionsValidators = [
  param('sellerId')
    .isUUID()
    .withMessage('sellerId must be a valid UUID'),
  body('settlementId')
    .optional()
    .isUUID()
    .withMessage('settlementId must be a valid UUID')
];

const waiveCommissionValidators = [
  param('orderId')
    .isUUID()
    .withMessage('orderId must be a valid UUID'),
  body('sellerId')
    .isUUID()
    .withMessage('sellerId must be a valid UUID'),
  body('reason')
    .isString()
    .notEmpty()
    .withMessage('reason is required')
    .isLength({ max: 500 })
    .withMessage('reason must not exceed 500 characters')
];

const refundCommissionValidators = [
  param('orderId')
    .isUUID()
    .withMessage('orderId must be a valid UUID'),
  body('sellerId')
    .isUUID()
    .withMessage('sellerId must be a valid UUID')
];

const getSellerCommissionsValidators = [
  param('sellerId')
    .isUUID()
    .withMessage('sellerId must be a valid UUID'),
  query('status')
    .optional()
    .isIn(['pending', 'collectible', 'collected', 'waived', 'refunded'])
    .withMessage('status must be one of: pending, collectible, collected, waived, refunded'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer')
];

const calculateNetPayoutValidators = [
  body('grossAmount')
    .isFloat({ min: 0 })
    .withMessage('grossAmount must be a positive number'),
  body('commissionAmount')
    .isFloat({ min: 0 })
    .withMessage('commissionAmount must be a positive number')
];

// =============================================================================
// Routes
// =============================================================================

// All routes require authentication
router.use(gatewayOrInternalAuth);

// Internal API routes (service-to-service)
// POST /api/commissions - Record commission
router.post(
  '/',
  recordCommissionValidators,
  validateRequest,
  commissionController.recordCommission
);

// PUT /api/commissions/order/:orderId/complete - Mark order completed
router.put(
  '/order/:orderId/complete',
  markOrderCompletedValidators,
  validateRequest,
  commissionController.markOrderCompleted
);

// POST /api/commissions/seller/:sellerId/collect - Collect commissions
router.post(
  '/seller/:sellerId/collect',
  collectCommissionsValidators,
  validateRequest,
  commissionController.collectCommissions
);

// PUT /api/commissions/order/:orderId/refund - Refund commission
router.put(
  '/order/:orderId/refund',
  refundCommissionValidators,
  validateRequest,
  commissionController.refundCommission
);

// Admin-only routes
// PUT /api/commissions/order/:orderId/waive - Waive commission
router.put(
  '/order/:orderId/waive',
  requireRole('admin'),
  waiveCommissionValidators,
  validateRequest,
  commissionController.waiveCommission
);

// Read routes (internal / seller access)
// GET /api/commissions/:id - Get commission by ID
router.get(
  '/:id',
  param('id').isUUID().withMessage('id must be a valid UUID'),
  validateRequest,
  commissionController.getCommissionById
);

// GET /api/commissions/ledger/:ledgerNumber - Get commission by ledger number
router.get(
  '/ledger/:ledgerNumber',
  param('ledgerNumber').matches(/^COM-\d{8}-\d{5}$/).withMessage('Invalid ledger number format'),
  validateRequest,
  commissionController.getCommissionByLedgerNumber
);

// GET /api/commissions/seller/:sellerId - Get commissions for seller
router.get(
  '/seller/:sellerId',
  getSellerCommissionsValidators,
  validateRequest,
  commissionController.getSellerCommissions
);

// GET /api/commissions/order/:orderId - Get commissions for order
router.get(
  '/order/:orderId',
  param('orderId').isUUID().withMessage('orderId must be a valid UUID'),
  validateRequest,
  commissionController.getOrderCommissions
);

// GET /api/commissions/seller/:sellerId/stats - Get seller stats
router.get(
  '/seller/:sellerId/stats',
  param('sellerId').isUUID().withMessage('sellerId must be a valid UUID'),
  validateRequest,
  commissionController.getSellerStats
);

// POST /api/commissions/calculate-payout - Calculate net payout
router.post(
  '/calculate-payout',
  calculateNetPayoutValidators,
  validateRequest,
  commissionController.calculateNetPayout
);

export default router;
