import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router: import('express').Router = Router();

// Biteship webhooks
router.post('/biteship', webhookController.handleBiteshipWebhook);

// Test endpoint (dev only)
router.post('/biteship/test', webhookController.testBiteshipWebhook);

export default router;
