import { Request, Response } from 'express';
import { RateService } from '../services/rate.service';
import { asyncHandler } from '../middleware/error-handler';

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

export class RateController {
  private service: RateService;

  constructor() {
    this.service = new RateService();
  }

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
  getShippingRates = asyncHandler(async (req: Request, res: Response) => {
    const rates = await this.service.getRates(req.body);

    res.json({
      success: true,
      data: rates
    });
  });

  /**
   * @swagger
   * /api/rates/couriers:
   *   get:
   *     summary: Get available couriers
   *     tags: [Rates]
   */
  getAvailableCouriers = asyncHandler(async (_req: Request, res: Response) => {
    const couriers = await this.service.getActiveCouriers();

    res.json({
      success: true,
      data: couriers
    });
  });

  /**
   * @swagger
   * /api/rates/estimate:
   *   post:
   *     summary: Get quick rate estimate
   *     tags: [Rates]
   */
  getQuickEstimate = asyncHandler(async (req: Request, res: Response) => {
    const { originPostalCode, destPostalCode, weightGrams } = req.body;

    const rates = await this.service.getRates({
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
  });

  /**
   * @swagger
   * /api/internal/rates:
   *   post:
   *     summary: Get shipping rates (internal service call)
   *     tags: [Internal]
   */
  getShippingRatesInternal = asyncHandler(async (req: Request, res: Response) => {
    const rates = await this.service.getRates(req.body);

    res.json({
      success: true,
      data: rates
    });
  });
}

export const rateController = new RateController();
