import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { z } from 'zod';

/**
 * Middleware to check express-validator results
 * Use after validator array in route definitions
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : err.type,
        message: err.msg
      }))
    });
  }
  next();
};

// =============================================================================
// Zod Schemas
// =============================================================================

const addressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  district: z.string().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

export const createShipmentSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid().optional(), // Set by controller from auth
  returnId: z.string().uuid().optional(),
  courier: z.string().min(1),
  courierName: z.string().optional(),
  serviceType: z.string().optional(),
  serviceName: z.string().optional(),
  shippingCost: z.number().positive(),
  insuranceCost: z.number().min(0).optional(),
  codAmount: z.number().min(0).optional(),
  weightGrams: z.number().int().positive(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  itemCount: z.number().int().positive().optional(),
  itemDescription: z.string().optional(),
  origin: addressSchema.optional(),
  destination: addressSchema,
  instructions: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const getRatesSchema = z.object({
  originPostalCode: z.string().min(1),
  destPostalCode: z.string().min(1),
  weightGrams: z.number().int().positive(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  itemValue: z.number().positive().optional(),
  couriers: z.array(z.string()).optional()
});

export const updateShipmentStatusSchema = z.object({
  status: z.enum([
    'pending',
    'booked',
    'awaiting_pickup',
    'picked_up',
    'in_transit',
    'at_destination_hub',
    'out_for_delivery',
    'delivered',
    'failed',
    'returned',
    'cancelled'
  ]),
  failureReason: z.string().optional(),
  receiverName: z.string().optional(),
  proofOfDeliveryUrl: z.string().url().optional(),
  signature: z.string().optional()
});

export const createTrackingEventSchema = z.object({
  status: z.string().min(1),
  statusCode: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  courierStatus: z.string().optional(),
  eventTime: z.string().datetime()
});

export const createCourierSchema = z.object({
  courierCode: z.string().min(1),
  courierName: z.string().min(1),
  isActive: z.boolean().optional(),
  apiEndpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  supportsCod: z.boolean().optional(),
  supportsInsurance: z.boolean().optional(),
  supportsPickup: z.boolean().optional(),
  supportsDropoff: z.boolean().optional(),
  supportsRealTimeTracking: z.boolean().optional(),
  hasFixedRates: z.boolean().optional(),
  rateMultiplier: z.number().positive().optional(),
  logoUrl: z.string().url().optional(),
  displayOrder: z.number().int().optional(),
  pickupCutoffTime: z.string().optional(),
  settings: z.record(z.any()).optional()
});

export const createWarehouseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  address: z.string().min(1),
  district: z.string().optional(),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  operatingHours: z.string().optional()
});

// =============================================================================
// Zod Validation Middleware
// =============================================================================

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}
