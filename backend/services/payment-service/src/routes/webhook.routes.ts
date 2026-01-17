import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const controller = new WebhookController();

// NOTE: Webhook routes are intentionally PUBLIC (no gateway auth)
// They are protected by Xendit callback token verification in the controller
// See: WebhookController.handleXenditCallback -> CryptoUtils.verifyXenditWebhook

/**
 * @swagger
 * /api/webhooks/xendit/invoice:
 *   post:
 *     tags: [Webhooks]
 *     summary: Handle Xendit payment callback
 *     description: |
 *       Receives payment status updates from Xendit.
 *       Protected by x-callback-token header verification.
 *     security: []
 *     responses:
 *       200:
 *         description: Webhook processed
 *       403:
 *         description: Invalid webhook signature
 */
router.post('/xendit/invoice', controller.handleXenditCallback);

/**
 * @swagger
 * /api/webhooks/health:
 *   get:
 *     tags: [Webhooks]
 *     summary: Webhook endpoint health check
 *     security: []
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payment-webhooks',
    timestamp: new Date().toISOString()
  });
});

export default router;
