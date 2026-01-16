import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { BadRequestError } from './error-handler';

/**
 * Validation middleware factory using Zod schemas
 */
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const parsed = schema.parse(data);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
          code: 'VALIDATION_ERROR',
        });
      }
      next(error);
    }
  };
};

// =============================================================================
// Payment Validation Schemas
// =============================================================================

export const createPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum([
    'bank_transfer',
    'virtual_account',
    'credit_card',
    'debit_card',
    'ewallet_ovo',
    'ewallet_gopay',
    'ewallet_dana',
    'ewallet_linkaja',
    'ewallet_shopeepay',
    'qris',
    'retail_outlet',
    'wallet',
  ]).optional(),
  expiresAt: z.string().datetime().optional(),
  isEscrow: z.boolean().optional(),
  factoryId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

export const createEscrowPaymentSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  groupSessionId: z.string().uuid('Invalid group session ID format'),
  participantId: z.string().uuid('Invalid participant ID format'),
  amount: z.number().positive('Amount must be positive'),
  expiresAt: z.string().datetime().optional(),
  factoryId: z.string().uuid('Invalid factory ID format'),
});

export const webhookCallbackSchema = z.object({
  id: z.string(),
  external_id: z.string(),
  status: z.enum(['PAID', 'EXPIRED', 'PENDING', 'FAILED']),
  amount: z.number(),
  paid_amount: z.number().optional(),
  fees_paid_amount: z.number().optional(),
  payment_method: z.string().optional(),
  payment_channel: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  paid_at: z.string().optional(),
});

export const releaseEscrowSchema = z.object({
  groupSessionId: z.string().uuid('Invalid group session ID format'),
});

export const refundSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID format'),
  orderId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid('Invalid user ID format'),
  reason: z.enum(['group_failed_moq', 'order_cancelled', 'customer_request']),
  amount: z.number().positive().optional(),
  description: z.string().max(500).optional(),
});

export const refundSessionSchema = z.object({
  groupSessionId: z.string().uuid('Invalid group session ID format'),
});

export const settlementQuerySchema = z.object({
  periodStart: z.string().datetime('Invalid start date format'),
  periodEnd: z.string().datetime('Invalid end date format'),
});

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// =============================================================================
// ID Parameter Schemas
// =============================================================================

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
});

export const paymentIdParamSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID format'),
});

// =============================================================================
// Type exports
// =============================================================================

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateEscrowPaymentInput = z.infer<typeof createEscrowPaymentSchema>;
export type WebhookCallbackInput = z.infer<typeof webhookCallbackSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
