import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { PaymentService } from '../services/payment.service';
import { CryptoUtils } from '../utils/crypto.utils';

export class WebhookController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  handleXenditCallback = async (req: Request, res: Response) => {
    try {
      // Get webhook verification token from environment
      const webhookVerificationToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN || '';
      const receivedSignature = req.headers['x-callback-token'] as string;

      // Get raw body for signature verification
      const rawBody = JSON.stringify(req.body);

      // Verify webhook signature using callback token comparison
      if (!CryptoUtils.verifyXenditWebhook(rawBody, receivedSignature, webhookVerificationToken)) {
        console.warn('Invalid webhook signature received');
        return res.status(403).json({ error: 'Invalid webhook signature' });
      }

      const callbackData = req.body;
      const eventId = callbackData.id || callbackData.external_id;
      const webhookType = callbackData.status || 'unknown';

      // Check if webhook already processed using PaymentGatewayLog
      const existingLog = await prisma.paymentGatewayLog.findFirst({
        where: {
          isWebhook: true,
          webhookType: webhookType,
          requestBody: {
            path: ['id'],
            equals: eventId
          }
        }
      });

      if (existingLog) {
        console.log(`Webhook event ${eventId} already processed - ignoring`);
        return res.json({ received: true, message: 'Already processed' });
      }

      // Find payment by gateway transaction ID
      const payment = await prisma.payment.findFirst({
        where: { gatewayTransactionId: callbackData.id }
      });

      // Log the webhook
      await prisma.paymentGatewayLog.create({
        data: {
          paymentId: payment?.id,
          action: `webhook_${webhookType.toLowerCase()}`,
          requestMethod: 'POST',
          requestUrl: '/api/webhooks/xendit',
          requestBody: callbackData,
          responseStatus: 200,
          isWebhook: true,
          webhookType: webhookType
        }
      });

      if (callbackData.status === 'PAID') {
        await this.paymentService.handlePaidCallback(callbackData);
      } else if (callbackData.status === 'EXPIRED') {
        if (payment && payment.status === 'pending') {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'expired',
              cancelledAt: new Date()
            }
          });

          // Publish event for order service to handle order cancellation
          await prisma.serviceOutbox.create({
            data: {
              aggregateType: 'Payment',
              aggregateId: payment.id,
              eventType: 'payment.expired',
              payload: {
                paymentId: payment.id,
                orderId: payment.orderId,
                userId: payment.userId
              }
            }
          });
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}
