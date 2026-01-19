import { Router } from 'express';
import {
  getShippingRates,
  getAvailableCouriers,
  getQuickEstimate
} from '../controllers/rate.controller';
import { validate, getRatesSchema } from '../middleware/validation';

const router = Router();

// Get shipping rates
router.post('/', validate(getRatesSchema), getShippingRates);

// Get available couriers
router.get('/couriers', getAvailableCouriers);

// Get quick estimate
router.post('/estimate', validate(getRatesSchema), getQuickEstimate);

export default router;
