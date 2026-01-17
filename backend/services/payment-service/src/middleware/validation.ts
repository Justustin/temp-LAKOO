/**
 * Validation Types
 *
 * This file contains TypeScript types for API validation.
 * Routes use express-validator for runtime validation.
 * These types are for TypeScript compile-time type checking.
 */

// =============================================================================
// Payment Types
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
