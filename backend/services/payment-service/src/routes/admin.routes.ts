import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

// Payment Management
/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get all payments (Admin)
 *     tags: [Admin - Payments]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get('/payments', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional(),
  query('userId').optional().isUUID(),
  query('paymentMethod').optional(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], controller.getAllPayments);

/**
 * @swagger
 * /api/admin/payments/{id}:
 *   get:
 *     summary: Get payment details (Admin)
 *     tags: [Admin - Payments]
 */
router.get('/payments/:id', [
  param('id').isUUID().withMessage('Invalid payment ID')
], controller.getPaymentDetails);

// Refund Management
/**
 * @swagger
 * /api/admin/refunds:
 *   get:
 *     summary: Get all refunds (Admin)
 *     tags: [Admin - Refunds]
 */
router.get('/refunds', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional(),
  query('userId').optional().isUUID()
], controller.getAllRefunds);

/**
 * @swagger
 * /api/admin/refunds/{id}/process:
 *   post:
 *     summary: Process refund (approve/reject) (Admin)
 *     tags: [Admin - Refunds]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               notes:
 *                 type: string
 */
router.post('/refunds/:id/process', [
  param('id').isUUID().withMessage('Invalid refund ID'),
  body('action').isIn(['approve', 'reject']).withMessage('Invalid action'),
  body('notes').optional()
], controller.processRefund);

// Analytics
/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get payment analytics (Admin)
 *     tags: [Admin - Analytics]
 */
router.get('/analytics', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], controller.getPaymentAnalytics);

// Settlement Records
/**
 * @swagger
 * /api/admin/settlements:
 *   get:
 *     summary: Get settlement records (Admin)
 *     tags: [Admin - Settlements]
 */
router.get('/settlements', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('isReconciled').optional().isBoolean(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], controller.getSettlementRecords);

// Gateway Logs
/**
 * @swagger
 * /api/admin/gateway-logs:
 *   get:
 *     summary: Get payment gateway logs (Admin)
 *     tags: [Admin - Gateway Logs]
 */
router.get('/gateway-logs', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('paymentId').optional().isUUID(),
  query('action').optional(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], controller.getGatewayLogs);

export default router;
