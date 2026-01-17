import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';
import { gatewayOrInternalAuth, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const controller = new PaymentController();

// All payment routes require authentication (gateway or internal service)
router.use(gatewayOrInternalAuth);

// Create payment
router.post('/',
  [
    body('orderId').isUUID().withMessage('orderId must be a valid UUID'),
    body('userId').isUUID().withMessage('userId must be a valid UUID'),
    body('amount').isFloat({ min: 0.01 }).withMessage('amount must be greater than 0'),
    body('idempotencyKey').isString().notEmpty().withMessage('idempotencyKey is required'),
    body('paymentMethod').optional().isIn([
      'bank_transfer', 'virtual_account', 'credit_card',
      'ewallet_ovo', 'ewallet_gopay', 'ewallet_dana', 'qris'
    ]).withMessage('Invalid payment method')
  ],
  validateRequest,
  controller.createPayment
);

// Get payment by ID
router.get('/:id',
  [param('id').isUUID().withMessage('Invalid payment ID')],
  validateRequest,
  controller.getPaymentById
);

// Get payment by order ID
router.get('/order/:orderId',
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  validateRequest,
  controller.getPaymentByOrder
);

// Get payments for a user
router.get('/user/:userId',
  [
    param('userId').isUUID().withMessage('Invalid user ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset must be >= 0')
  ],
  validateRequest,
  controller.getPaymentsByUser
);

// Get payments eligible for settlement (admin only)
router.post('/eligible-for-settlement',
  requireRole('admin', 'service'),
  [
    body('periodStart').isISO8601().withMessage('periodStart must be ISO8601 date'),
    body('periodEnd').isISO8601().withMessage('periodEnd must be ISO8601 date')
  ],
  validateRequest,
  controller.getEligibleForSettlement
);

// Get payment statistics (admin only)
router.post('/stats',
  requireRole('admin', 'service'),
  [
    body('startDate').isISO8601().withMessage('startDate must be ISO8601 date'),
    body('endDate').isISO8601().withMessage('endDate must be ISO8601 date')
  ],
  validateRequest,
  controller.getPaymentStats
);

// Refund routes
router.post('/refunds',
  [
    body('paymentId').isUUID().withMessage('paymentId must be a valid UUID'),
    body('orderId').isUUID().withMessage('orderId must be a valid UUID'),
    body('userId').isUUID().withMessage('userId must be a valid UUID'),
    body('reason').isIn(['order_cancelled', 'customer_request', 'item_defective', 'wrong_item'])
      .withMessage('Invalid refund reason'),
    body('idempotencyKey').isString().notEmpty().withMessage('idempotencyKey is required'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('amount must be greater than 0'),
    body('notes').optional().isString()
  ],
  validateRequest,
  controller.createRefund
);

router.get('/refunds/:id',
  [param('id').isUUID().withMessage('Invalid refund ID')],
  validateRequest,
  controller.getRefundById
);

router.get('/refunds/order/:orderId',
  [param('orderId').isUUID().withMessage('Invalid order ID')],
  validateRequest,
  controller.getRefundsByOrder
);

export default router;
