import { PaymentRepository } from '../repositories/payment.repository';
import { CreatePaymentDTO } from '../types';
import { xenditInvoiceClient } from '../config/xendit';
import { CreateInvoiceRequest } from 'xendit-node/invoice/models';
import { notificationClient } from '../clients/notification.client';
import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';

export class PaymentService {
  private repository: PaymentRepository;

  constructor() {
    this.repository = new PaymentRepository();
  }

  /**
   * Fetch user data from auth-service
   */
  private async fetchUser(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/users/${userId}`);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch user');
      }
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('User not found');
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  /**
   * Fetch order data from order-service
   */
  private async fetchOrder(orderId: string): Promise<any> {
    try {
      const response = await axios.get(`${ORDER_SERVICE_URL}/api/orders/${orderId}`);
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch order');
      }
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Order not found');
      }
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }

  /**
   * Update order status via order-service
   */
  private async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    try {
      await axios.put(`${ORDER_SERVICE_URL}/api/orders/${orderId}/status`, {
        newStatus
      });
    } catch (error: any) {
      console.error(`Failed to update order ${orderId} status:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new payment for an order
   */
  async createPayment(data: CreatePaymentDTO) {
    // Check for existing payment with same idempotency key
    const existingPayment = await this.repository.findByOrderId(data.orderId);
    if (existingPayment && existingPayment.status === 'pending') {
      return {
        payment: existingPayment,
        paymentUrl: existingPayment.gatewayInvoiceUrl,
        invoiceId: existingPayment.gatewayTransactionId
      };
    }

    const userData = await this.fetchUser(data.userId);
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    const userEmail = userData.email || this.generatePlaceholderEmail(userData.phoneNumber);

    // Create Xendit invoice
    const invoiceData: CreateInvoiceRequest = {
      externalId: `order-${data.orderId}-${Date.now()}`,
      amount: data.amount,
      payerEmail: userEmail,
      description: `Payment for order ${data.orderId}`,
      invoiceDuration: expiresAt
        ? Math.floor((expiresAt.getTime() - Date.now()) / 1000).toString()
        : '86400',
      currency: 'IDR',
      shouldSendEmail: Boolean(userData.email),
      customer: {
        givenNames: userData.firstName,
        surname: userData.lastName || '',
        email: userEmail,
        mobileNumber: userData.phoneNumber
      },
      successRedirectUrl: process.env.PAYMENT_SUCCESS_URL,
      failureRedirectUrl: process.env.PAYMENT_FAILURE_URL
    };

    const invoice = await xenditInvoiceClient.createInvoice({
      data: invoiceData
    });

    const payment = await this.repository.create(
      data,
      invoice.invoiceUrl || '',
      invoice.id || ''
    );

    return {
      payment,
      paymentUrl: invoice.invoiceUrl,
      invoiceId: invoice.id
    };
  }

  /**
   * Handle Xendit webhook callback when payment is completed
   */
  async handlePaidCallback(callbackData: any) {
    const payment = await this.repository.findByGatewayTransactionId(callbackData.id);

    if (!payment) {
      throw new Error('Payment not found for transaction ID: ' + callbackData.id);
    }

    if (payment.status === 'paid') {
      console.log(`Payment ${payment.id} already marked as paid - skipping`);
      return { message: 'Payment already processed' };
    }

    const gatewayFee = callbackData.fees_paid_amount || 0;

    // Mark payment as paid
    await this.repository.markPaid(payment.id, gatewayFee, callbackData);

    // Update order status
    await this.updateOrderStatus(payment.orderId, 'paid');

    // Send notification to user
    await this.sendPaymentNotification(payment.userId, payment.orderId, 'success');

    return {
      message: 'Payment processed successfully',
      payment
    };
  }

  /**
   * Handle Xendit webhook callback when payment expires
   */
  async handleExpiredCallback(callbackData: any) {
    const payment = await this.repository.findByGatewayTransactionId(callbackData.id);

    if (!payment) {
      throw new Error('Payment not found for transaction ID: ' + callbackData.id);
    }

    if (payment.status !== 'pending') {
      console.log(`Payment ${payment.id} not pending - skipping expiration`);
      return { message: 'Payment not pending' };
    }

    await this.repository.markExpired(payment.id);

    return {
      message: 'Payment marked as expired',
      payment
    };
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string) {
    return this.repository.findByOrderId(orderId);
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string) {
    return this.repository.findById(paymentId);
  }

  /**
   * Get payments for a user
   */
  async getPaymentsByUserId(userId: string, options?: { limit?: number; offset?: number }) {
    return this.repository.findByUserId(userId, options);
  }

  /**
   * Find payments eligible for settlement within a period
   */
  async findEligibleForSettlement(periodStart: Date, periodEnd: Date) {
    return this.repository.findEligibleForSettlement(periodStart, periodEnd);
  }

  /**
   * Get payment statistics for a period
   */
  async getPaymentStats(startDate: Date, endDate: Date) {
    return this.repository.getPaymentStats(startDate, endDate);
  }

  /**
   * Send payment notification to user
   */
  private async sendPaymentNotification(userId: string, orderId: string, status: 'success' | 'failed') {
    try {
      let orderNumber = '';
      try {
        const order = await this.fetchOrder(orderId);
        orderNumber = order.order_number;
      } catch (error) {
        console.error('Failed to fetch order for notification:', error);
      }

      await notificationClient.sendNotification({
        userId: userId,
        type: status === 'success' ? 'payment_success' : 'payment_failed',
        title: status === 'success' ? 'Payment Successful' : 'Payment Failed',
        message: status === 'success'
          ? `Your payment for order ${orderNumber} has been confirmed!`
          : `Payment failed for order ${orderNumber}. Please try again.`,
        actionUrl: `/orders/${orderId}`,
        relatedId: orderId
      });
    } catch (error) {
      console.error('Failed to send payment notification:', error);
    }
  }

  /**
   * Generate placeholder email for users without email
   */
  private generatePlaceholderEmail(phoneNumber: string): string {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const domain = process.env.PLACEHOLDER_EMAIL_DOMAIN || 'lakoo.id';
    return `noreply+${cleanPhone}@${domain}`;
  }
}
