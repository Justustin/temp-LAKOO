import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

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
// Validation Types
// =============================================================================

export type PaymentMethod =
  | 'bank_transfer'
  | 'virtual_account'
  | 'credit_card'
  | 'debit_card'
  | 'ewallet_ovo'
  | 'ewallet_gopay'
  | 'ewallet_dana'
  | 'ewallet_linkaja'
  | 'ewallet_shopeepay'
  | 'qris'
  | 'retail_outlet'
  | 'wallet';

export interface CreatePaymentInput {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  expiresAt?: string;
  metadata?: Record<string, any>;
  idempotencyKey: string;
}

export interface WebhookCallbackInput {
  id: string;
  external_id: string;
  status: 'PAID' | 'EXPIRED' | 'PENDING' | 'FAILED';
  amount: number;
  paid_amount?: number;
  fees_paid_amount?: number;
  payment_method?: string;
  payment_channel?: string;
  created?: string;
  updated?: string;
  paid_at?: string;
}

export interface RefundInput {
  paymentId: string;
  orderId?: string | null;
  userId: string;
  reason: 'order_cancelled' | 'customer_request' | 'other';
  amount?: number;
  description?: string;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
