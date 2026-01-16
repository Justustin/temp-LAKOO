export interface CreatePaymentDTO {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod?: 'bank_transfer' | 'virtual_account' | 'credit_card' | 'ewallet_ovo' | 'ewallet_gopay' | 'ewallet_dana' | 'qris';
  expiresAt?: Date | string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface XenditInvoiceCallback {
  id: string;
  external_id: string;
  user_id: string;
  status: 'PAID' | 'EXPIRED' | 'PENDING';
  amount: number;
  paid_amount: number;
  fees_paid_amount: number;
  payment_method: string;
  payment_channel: string;
  payment_destination: string;
  created: string;
  updated: string;
  paid_at?: string;
}

export interface CreateRefundDTO {
  paymentId: string;
  orderId: string;
  userId: string;
  reason: 'order_cancelled' | 'customer_request' | 'item_defective' | 'wrong_item';
  amount?: number;
  notes?: string;
  idempotencyKey: string;
}

export interface PaymentResponse {
  payment: any;
  paymentUrl?: string;
  invoiceId?: string;
}
