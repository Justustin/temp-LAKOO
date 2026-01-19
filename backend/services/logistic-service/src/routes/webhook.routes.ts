import { Router } from 'express';
import {
  handleBiteshipWebhook,
  testBiteshipWebhook
} from '../controllers/webhook.controller';

const router: import('express').Router = Router();

// Biteship webhooks
router.post('/biteship', handleBiteshipWebhook);

// Test endpoint (dev only)
router.post('/biteship/test', testBiteshipWebhook);

export default router;
