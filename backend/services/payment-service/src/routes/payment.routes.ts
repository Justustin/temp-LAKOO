import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const controller = new PaymentController();

// Create payment
router.post('/', [
  body('orderId').isUUID(),
  body('userId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('idempotencyKey').isString().notEmpty(),
  body('paymentMethod').optional().isIn([
    'bank_transfer', 'virtual_account', 'credit_card',
    'ewallet_ovo', 'ewallet_gopay', 'ewallet_dana', 'qris'
  ])
], controller.createPayment);

// Get payment by ID
router.get('/:id', [
  param('id').isUUID()
], controller.getPaymentById);

// Get payment by order ID
router.get('/order/:orderId', [
  param('orderId').isUUID()
], controller.getPaymentByOrder);

// Get payments for a user
router.get('/user/:userId', [
  param('userId').isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], controller.getPaymentsByUser);

// Get payments eligible for settlement (admin)
router.post('/eligible-for-settlement', [
  body('periodStart').isISO8601(),
  body('periodEnd').isISO8601()
], controller.getEligibleForSettlement);

// Get payment statistics (admin)
router.post('/stats', [
  body('startDate').isISO8601(),
  body('endDate').isISO8601()
], controller.getPaymentStats);

// Refund routes
router.post('/refunds', [
  body('paymentId').isUUID(),
  body('orderId').isUUID(),
  body('userId').isUUID(),
  body('reason').isIn(['order_cancelled', 'customer_request', 'item_defective', 'wrong_item']),
  body('idempotencyKey').isString().notEmpty(),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('notes').optional().isString()
], controller.createRefund);

router.get('/refunds/:id', [
  param('id').isUUID()
], controller.getRefundById);

router.get('/refunds/order/:orderId', [
  param('orderId').isUUID()
], controller.getRefundsByOrder);

export default router;
