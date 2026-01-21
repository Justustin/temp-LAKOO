import { Router } from 'express';
import { rateController } from '../controllers/rate.controller';
import { validate, getRatesSchema } from '../middleware/validation';

const router: import('express').Router = Router();

// Get shipping rates
router.post('/', validate(getRatesSchema), rateController.getShippingRates);

// Get available couriers
router.get('/couriers', rateController.getAvailableCouriers);

// Get quick estimate
router.post('/estimate', validate(getRatesSchema), rateController.getQuickEstimate);

export default router;
