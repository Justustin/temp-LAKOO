import { prisma } from '../lib/prisma';
import { RefundRepository } from '../repositories/refund.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { CreateRefundDTO } from '../types';
import { notificationClient } from '../clients/notification.client';
import { outboxService } from './outbox.service';
import axios from 'axios';
import { getServiceAuthHeaders } from '../utils/serviceAuth';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3005';

export class RefundService {
  private refundRepo: RefundRepository;
  private paymentRepo: PaymentRepository;

  constructor() {
    this.refundRepo = new RefundRepository();
    this.paymentRepo = new PaymentRepository();
  }

  /**
   * Create a new refund request
   */
  async createRefund(data: CreateRefundDTO) {
    const payment = await this.paymentRepo.findById(data.paymentId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'paid') {
      throw new Error('Cannot refund unpaid payment');
    }

    // Check for existing pending/processing refund
    const existingRefund = await prisma.refund.findFirst({
      where: {
        paymentId: data.paymentId,
        status: { in: ['pending', 'approved', 'processing'] }
      }
    });

    if (existingRefund) {
      throw new Error('Payment already has a pending refund');
    }

    const refund = await this.refundRepo.create(data, payment);

    // Publish refund.requested event
    await outboxService.refundRequested(refund);

    return refund;
  }

  /**
   * Process an approved refund
   */
  async processRefund(refundId: string) {
    const refund = await this.refundRepo.findById(refundId);

    if (!refund) {
      throw new Error('Refund not found');
    }

    if (!['approved', 'pending'].includes(refund.status)) {
      throw new Error(`Refund cannot be processed from status: ${refund.status}`);
    }

    try {
      // Mark as processing
      await this.refundRepo.markProcessing(refundId);

      const payment = refund.payment;
      let gatewayResponse: any;

      // Process refund based on payment method
      if (payment.paymentMethod.startsWith('ewallet_')) {
        gatewayResponse = await this.processEwalletRefund(payment, refund);
      } else {
        gatewayResponse = await this.processBankRefund(payment, refund);
      }

      // Mark refund as completed
      const completedRefund = await this.refundRepo.markCompleted(refundId);

      // Publish refund.completed event
      await outboxService.refundCompleted({
        ...completedRefund,
        orderId: refund.orderId,
        userId: refund.userId,
        refundMethod: refund.refundMethod
      });

      // Update payment status
      await this.paymentRepo.markRefunded(refund.paymentId);

      // Update order status
      await this.updateOrderStatus(refund.orderId, 'refunded');

      // Send notification
      await this.sendRefundNotification(refund.userId, refund.orderId, 'completed');

      return { success: true, refund: completedRefund, gatewayResponse };
    } catch (error: any) {
      console.error(`Refund processing failed for ${refundId}:`, error);
      await this.refundRepo.markFailed(refundId, error.message);

      // Publish refund.failed event
      await outboxService.refundFailed({
        id: refund.id,
        refundNumber: refund.refundNumber,
        paymentId: refund.paymentId,
        orderId: refund.orderId,
        failureReason: error.message
      });

      await this.sendRefundNotification(refund.userId, refund.orderId, 'failed');
      throw error;
    }
  }

  /**
   * Get refund by ID
   */
  async getRefundById(refundId: string) {
    return this.refundRepo.findById(refundId);
  }

  /**
   * Get refunds for an order
   */
  async getRefundsByOrderId(orderId: string) {
    return this.refundRepo.findByOrderId(orderId);
  }

  /**
   * Get refunds for a user
   */
  async getRefundsByUserId(userId: string) {
    return this.refundRepo.findByUserId(userId);
  }

  /**
   * Process e-wallet refund via Xendit
   */
  private async processEwalletRefund(payment: any, refund: any) {
    console.log('Processing e-wallet refund via Xendit API:', {
      paymentId: payment.id,
      refundId: refund.id,
      amount: refund.amount,
      chargeId: payment.gatewayTransactionId
    });

    const xenditApiKey = process.env.XENDIT_SECRET_KEY;
    if (!xenditApiKey) {
      throw new Error('XENDIT_SECRET_KEY not configured');
    }

    if (!payment.gatewayTransactionId) {
      throw new Error('Cannot refund: missing gateway transaction ID');
    }

    try {
      const response = await axios.post(
        `https://api.xendit.co/ewallets/charges/${payment.gatewayTransactionId}/refunds`,
        {
          amount: Math.round(Number(refund.amount)),
          reason: refund.reason || 'Customer refund request',
          reference_id: refund.refundNumber,
          metadata: {
            refund_id: refund.id,
            payment_id: payment.id,
            user_id: refund.userId
          }
        },
        {
          auth: {
            username: xenditApiKey,
            password: ''
          },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('Xendit refund response:', {
        refundId: refund.id,
        xenditRefundId: response.data.id,
        status: response.data.status
      });

      return {
        status: response.data.status,
        refund_id: response.data.id,
        amount: response.data.amount,
        method: 'ewallet',
        processed_at: response.data.created || new Date().toISOString(),
        gateway_response: response.data
      };
    } catch (error: any) {
      console.error('Xendit refund API error:', {
        refundId: refund.id,
        error: error.response?.data || error.message
      });

      if (error.response?.status === 400) {
        throw new Error(`Xendit refund failed: ${error.response.data.message || 'Invalid request'}`);
      } else if (error.response?.status === 404) {
        throw new Error('Xendit charge not found - payment may not exist or already refunded');
      } else if (error.response?.status === 409) {
        throw new Error('Refund already processed for this payment');
      }

      throw new Error(`Xendit refund API error: ${error.message}`);
    }
  }

  /**
   * Process bank transfer refund (manual process)
   */
  private async processBankRefund(payment: any, refund: any) {
    console.log('Processing bank refund:', {
      paymentId: payment.id,
      refundId: refund.id,
      amount: refund.amount
    });

    // Bank refunds typically require manual processing
    return {
      status: 'PENDING_MANUAL_REVIEW',
      refund_id: `bank-refund-${Date.now()}`,
      amount: refund.amount,
      method: 'bank_transfer',
      processed_at: new Date().toISOString(),
      note: 'Bank refunds require manual processing'
    };
  }

  /**
   * Update order status via order-service
   */
  private async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    try {
      await axios.put(
        `${ORDER_SERVICE_URL}/api/orders/${orderId}/status`,
        { newStatus },
        { headers: getServiceAuthHeaders() }
      );
    } catch (error: any) {
      console.error(`Failed to update order ${orderId} status:`, error.message);
    }
  }

  /**
   * Send refund notification to user
   */
  private async sendRefundNotification(userId: string, orderId: string, status: 'completed' | 'failed') {
    try {
      await notificationClient.sendNotification({
        userId: userId,
        type: status === 'completed' ? 'refund_completed' : 'refund_failed',
        title: status === 'completed' ? 'Refund Processed' : 'Refund Failed',
        message: status === 'completed'
          ? `Your refund has been processed successfully.`
          : `Refund processing failed. Please contact support.`,
        actionUrl: `/orders/${orderId}`,
        relatedId: orderId
      });
    } catch (error) {
      console.error('Failed to send refund notification:', error);
    }
  }
}
