import { Request, Response, NextFunction } from 'express';
import { RateService } from '../services/rate.service';

const rateService = new RateService();

/**
 * @swagger
 * components:
 *   schemas:
 *     ShippingRate:
 *       type: object
 *       properties:
 *         courier:
 *           type: string
 *         courierName:
 *           type: string
 *         serviceCode:
 *           type: string
 *         rate:
 *           type: number
 *         estimatedDays:
 *           type: string
 */

/**
 * @swagger
 * /api/rates:
 *   post:
 *     summary: Get shipping rates for a route
 *     tags: [Rates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originPostalCode
 *               - destPostalCode
 *               - weightGrams
 *             properties:
 *               originPostalCode:
 *                 type: string
 *               destPostalCode:
 *                 type: string
 *               weightGrams:
 *                 type: integer
 *               lengthCm:
 *                 type: number
 *               widthCm:
 *                 type: number
 *               heightCm:
 *                 type: number
 *               itemValue:
 *                 type: number
 *               couriers:
 *                 type: array
 *                 items:
 *                   type: string
 */
export async function getShippingRates(req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await rateService.getRates(req.body);

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/rates/couriers:
 *   get:
 *     summary: Get available couriers
 *     tags: [Rates]
 */
export async function getAvailableCouriers(req: Request, res: Response, next: NextFunction) {
  try {
    const couriers = await rateService.getActiveCouriers();

    res.json({
      success: true,
      data: couriers
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/rates/estimate:
 *   post:
 *     summary: Get quick rate estimate
 *     tags: [Rates]
 */
export async function getQuickEstimate(req: Request, res: Response, next: NextFunction) {
  try {
    const { originPostalCode, destPostalCode, weightGrams } = req.body;

    const rates = await rateService.getRates({
      originPostalCode,
      destPostalCode,
      weightGrams
    });

    // Return cheapest and fastest options
    const sortedByPrice = [...rates].sort((a, b) => a.rate - b.rate);
    const sortedBySpeed = [...rates].sort((a, b) => {
      const daysA = parseInt(a.estimatedDays?.split('-')[0] || '999');
      const daysB = parseInt(b.estimatedDays?.split('-')[0] || '999');
      return daysA - daysB;
    });

    res.json({
      success: true,
      data: {
        cheapest: sortedByPrice[0] || null,
        fastest: sortedBySpeed[0] || null,
        allRates: rates
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/internal/rates:
 *   post:
 *     summary: Get shipping rates (internal service call)
 *     tags: [Internal]
 */
export async function getShippingRatesInternal(req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await rateService.getRates(req.body);

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    next(error);
  }
}
