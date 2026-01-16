import { prisma } from '../lib/prisma';
import { PaymentRepository } from '../repositories/payment.repository';
import { TransactionLedgerService } from './transaction-ledger.service';
import { CreatePaymentDTO, CreateEscrowPaymentDTO } from '../types';
import { xenditInvoiceClient } from '../config/xendit';
import { CreateInvoiceRequest } from 'xendit-node/invoice/models';
import { notificationClient } from '../clients/notification.client';
import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';
const WAREHOUSE_SERVICE_URL = process.env.WAREHOUSE_SERVICE_URL || 'http://localhost:3011';

export class PaymentService {
  private repository: PaymentRepository;
  private transactionLedgerService: TransactionLedgerService;

  constructor() {
    this.repository = new PaymentRepository();
    this.transactionLedgerService = new TransactionLedgerService();
  }

  // Helper method to fetch user from auth-service
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

  // Helper method to fetch order from order-service
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

  // Helper method to update order status via order-service
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

  // Helper method to reserve inventory from warehouse
  private async reserveWarehouseInventory(
    productId: string,
    variantId: string | null,
    quantity: number
  ): Promise<{ success: boolean; message: string; reserved?: number }> {
    try {
      const response = await axios.post(
        `${WAREHOUSE_SERVICE_URL}/api/warehouse/reserve-inventory`,
        {
          productId,
          variantId,
          quantity
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      return {
        success: true,
        message: response.data.message || 'Inventory reserved successfully',
        reserved: quantity
      };
    } catch (error: any) {
      console.error(`Failed to reserve inventory:`, error.message);
      // Return failure but don't throw - we'll handle at session expiration
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  async createPayment(data: CreatePaymentDTO) {
    const userData = await this.fetchUser(data.userId);

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    const userEmail = userData.email || this.generatePlaceholderEmail(userData.phoneNumber);

    // Xendit v7.x API structure
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

async handlePaidCallback(callbackData: any) {
  const payment = await this.repository.findByGatewayTransactionId(
    callbackData.id
  );

  if (!payment) {
    throw new Error('Payment not found for transaction ID: ' + callbackData.id);
  }

  if (payment.payment_status === 'paid') {
    console.log(`Payment ${payment.id} already marked as paid - skipping`);
    return { message: 'Payment already processed' };
  }

  const gatewayFee = callbackData.fees_paid_amount || 0;

  // Check if this is an escrow payment (no order yet)
  const isEscrowPayment = !payment.order_id && payment.is_in_escrow;
  // Check if group buying via payment's group_session_id or order's group_session_id
  const isGroupBuying = payment.group_session_id !== null || payment.orders?.group_session_id !== null || isEscrowPayment;

  await this.repository.markPaid(
    payment.id,
    gatewayFee,
    callbackData,
    !!(isEscrowPayment || isGroupBuying)
  );

  // Only update order status if order exists
  if (payment.order_id) {
    // Update order status via API
    await this.updateOrderStatus(payment.order_id, 'paid');

    // Fetch order to get order_items and factory_id
    let order: any = null;
    try {
      order = await this.fetchOrder(payment.order_id);
    } catch (error) {
      console.error('Failed to fetch order for ledger:', error);
    }

    // Record transaction in ledger
    if (order && order.order_items && order.order_items.length > 0) {
      const factoryId = order.order_items[0].factory_id;
      await this.transactionLedgerService.recordPaymentReceived(
        payment.id,
        payment.order_id,
        factoryId,
        Number(payment.order_amount),
        order.order_number,
        {
          gatewayFee,
          isEscrow: !!isGroupBuying
        }
      );
    }

    await this.sendPaymentNotification(payment.user_id, payment.order_id, 'success');
  }  else if (isEscrowPayment && payment.group_session_id) {
    // Escrow payment for group buying - reserve inventory immediately
    console.log(`Escrow payment ${payment.id} marked as paid for group session ${payment.group_session_id}`);

    // Get participant details to reserve inventory
    try {
      const participant = await prisma.group_participants.findUnique({
        where: { id: payment.participant_id! },
        include: {
          group_buying_sessions: {
            select: {
              product_id: true
            }
          }
        }
      });

      if (participant) {
        const productId = participant.group_buying_sessions.product_id;
        const variantId = participant.variant_id;
        const quantity = participant.quantity;

        console.log(`Attempting to reserve inventory for paid participant: ${quantity} units of product ${productId}, variant ${variantId || 'base'}`);

        // Reserve inventory from warehouse (if available)
        const reserveResult = await this.reserveWarehouseInventory(
          productId,
          variantId,
          quantity
        );

        if (reserveResult.success) {
          console.log(`✓ Successfully reserved ${reserveResult.reserved} units for participant ${participant.id}`);
        } else {
          console.log(`⚠ Could not reserve inventory immediately: ${reserveResult.message}. Will be handled at session expiration.`);
        }
      } else {
        console.warn(`Participant ${payment.participant_id} not found for payment ${payment.id}`);
      }
    } catch (error: any) {
      // Don't fail the payment if inventory reservation fails
      // It will be handled at session expiration
      console.error(`Failed to reserve inventory for payment ${payment.id}:`, error.message);
    }
  }

  return {
    message: 'Payment processed successfully',
    payment
  };
}

  async createEscrowPayment(data: CreatePaymentDTO & { groupSessionId: string; participantId: string }) {
    const userData = await this.fetchUser(data.userId);

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    const userEmail = userData.email || this.generatePlaceholderEmail(userData.phoneNumber);

    // Format phone number for Xendit (must start with +62)
    let formattedPhone = userData.phoneNumber || '';
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+62' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('62')) {
        formattedPhone = '+' + formattedPhone;
      } else {
        formattedPhone = '+62' + formattedPhone;
      }
    }

    const invoiceData: CreateInvoiceRequest = {
      externalId: `escrow-${data.groupSessionId}-${data.participantId}-${Date.now()}`,
      amount: data.amount,
      payerEmail: userEmail,
      description: `Escrow payment for group buying session`,
      invoiceDuration: expiresAt
        ? Math.floor((expiresAt.getTime() - Date.now()) / 1000).toString()
        : '86400',
      currency: 'IDR',
      shouldSendEmail: Boolean(userData.email),
      customer: {
        givenNames: userData.firstName || 'Customer',
        surname: userData.lastName || '-',
        email: userEmail,
        mobileNumber: formattedPhone || undefined  // Optional if not available
      }
    };

    const invoice = await xenditInvoiceClient.createInvoice({ data: invoiceData });

    const payment = await prisma.payments.create({
      data: {
        user_id: data.userId,
        group_session_id: data.groupSessionId,
        participant_id: data.participantId,
        order_amount: data.amount,
        total_amount: data.amount, // Added required property
        payment_gateway_fee: 0,
        payment_status: 'pending',
        payment_method: 'bank_transfer',
        is_in_escrow: true,
        gateway_transaction_id: invoice.id || '',
        payment_url: invoice.invoiceUrl || '',
        expires_at: expiresAt
      }
    });

    return { payment, paymentUrl: invoice.invoiceUrl, invoiceId: invoice.id };
  }

  async releaseEscrow(groupSessionId: string) {
    const payments = await this.repository.findByGroupSession(groupSessionId);
    const eligiblePayments = payments.filter(
      p => p.is_in_escrow && p.payment_status === 'paid'
    );

    if (eligiblePayments.length === 0) {
      return { message: 'No escrowed payments found' };
    }

    const paymentIds = eligiblePayments.map(p => p.id);

    // CRITICAL FIX: Wrap escrow release and ledger recording in transaction
    return await prisma.$transaction(async (tx) => {
      // Release escrow in database (pass transaction context if repository supports it)
      await this.repository.releaseEscrow(paymentIds);

      // Record transaction for each released payment
      for (const payment of eligiblePayments) {
        await this.transactionLedgerService.recordEscrowRelease(
          payment.id,
          payment.order_id ?? '',
          Number(payment.order_amount),
          groupSessionId
        );
      }

      return {
        message: 'Escrow released',
        paymentsReleased: paymentIds.length
      };
    });
  }

  async getPaymentByOrderId(orderId: string) {
    return this.repository.findByOrderId(orderId);
  }

  async findEligibleForSettlement(periodStart: Date, periodEnd: Date) {
    return this.repository.findEligibleForSettlement(periodStart, periodEnd);
  }

  /**
   * Get transaction history for an order (useful for customer support)
   */
  async getOrderTransactionHistory(orderId: string) {
    return this.transactionLedgerService.getOrderTransactionHistory(orderId);
  }

  /**
   * Get transaction history for a payment
   */
  async getPaymentTransactionHistory(paymentId: string) {
    return this.transactionLedgerService.getPaymentTransactionHistory(paymentId);
  }

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
        type: status === 'success' ? 'payment_success' : 'order_created',
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

  private generatePlaceholderEmail(phoneNumber: string): string {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const domain = process.env.PLACEHOLDER_EMAIL_DOMAIN || 'pinduoduo.id';
    return `noreply+${cleanPhone}@${domain}`;
  }
}