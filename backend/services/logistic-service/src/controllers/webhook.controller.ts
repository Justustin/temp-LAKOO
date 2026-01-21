import { Request, Response } from 'express';
import { ShipmentService } from '../services/shipment.service';
import { ShipmentRepository } from '../repositories/shipment.repository';
import { BiteshipWebhookPayload, ShipmentStatus } from '../types';
import crypto from 'crypto';

const BITESHIP_WEBHOOK_SECRET = process.env.BITESHIP_WEBHOOK_SECRET || '';

/**
 * Verify Biteship webhook signature
 */
function verifyBiteshipSignature(payload: string, signature: string): boolean {
  if (!BITESHIP_WEBHOOK_SECRET) {
    // In production, treat missing secret as misconfiguration (fail closed).
    if (process.env.NODE_ENV === 'production') return false;
    console.warn('BITESHIP_WEBHOOK_SECRET not configured, skipping signature verification (development only)');
    return true;
  }

  const provided = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature;

  const expectedSignature = crypto
    .createHmac('sha256', BITESHIP_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const providedBuf = Buffer.from(provided, 'hex');
  const expectedBuf = Buffer.from(expectedSignature, 'hex');

  if (providedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Map Biteship status to our shipment status
 */
function mapBiteshipStatus(biteshipStatus: string): ShipmentStatus | null {
  const statusMap: Record<string, ShipmentStatus> = {
    'confirmed': 'booked',
    'allocated': 'awaiting_pickup',
    'picking_up': 'awaiting_pickup',
    'picked': 'picked_up',
    'dropping_off': 'in_transit',
    'delivered': 'delivered',
    'on_hold': 'in_transit',
    'rejected': 'failed',
    'courier_not_found': 'failed',
    'cancelled': 'cancelled',
    'returned': 'returned'
  };

  return statusMap[biteshipStatus.toLowerCase()] || null;
}

export class WebhookController {
  private shipmentService: ShipmentService;
  private shipmentRepository: ShipmentRepository;

  constructor() {
    this.shipmentService = new ShipmentService();
    this.shipmentRepository = new ShipmentRepository();
  }

  /**
   * @swagger
   * /api/webhooks/biteship:
   *   post:
   *     summary: Handle Biteship webhook events
   *     tags: [Webhooks]
   */
  handleBiteshipWebhook = async (req: Request, res: Response) => {
    // Note: Webhooks intentionally catch errors and return 200 for reliability
    try {
      const signature = req.headers['x-biteship-signature'] as string;
      const rawBody = (req as any).rawBody
        ? (req as any).rawBody.toString('utf8')
        : JSON.stringify(req.body);

      // Verify signature (fail closed in production when secret is configured)
      if (BITESHIP_WEBHOOK_SECRET) {
        if (!signature) {
          return res.status(401).json({ success: false, error: 'Missing signature' });
        }
        if (!verifyBiteshipSignature(rawBody, signature)) {
          console.warn('Invalid Biteship webhook signature');
          return res.status(401).json({ success: false, error: 'Invalid signature' });
        }
      } else if (process.env.NODE_ENV === 'production') {
        // Secret must be configured in production to accept webhooks
        return res.status(500).json({ success: false, error: 'Webhook verification not configured' });
      }

      const payload: BiteshipWebhookPayload = req.body;
      console.log(`Received Biteship webhook: ${payload.event}`, JSON.stringify(payload, null, 2));

      // Find shipment by Biteship order ID or tracking number
      let shipment = null;
      if (payload.order_id) {
        shipment = await this.shipmentRepository.findByBiteshipOrderId(payload.order_id);
      }
      if (!shipment && payload.courier_tracking_id) {
        shipment = await this.shipmentRepository.findByTrackingNumber(payload.courier_tracking_id);
      }

      if (!shipment) {
        console.warn(`Shipment not found for Biteship webhook: ${payload.order_id || payload.courier_tracking_id}`);
        // Return 200 to acknowledge receipt even if shipment not found
        return res.json({
          success: true,
          message: 'Webhook received but shipment not found'
        });
      }

      // Handle different event types
      switch (payload.event) {
        case 'order.status':
          await this.handleOrderStatusUpdate(shipment.id, payload);
          break;
        case 'order.waybill_id':
          await this.handleWaybillUpdate(shipment.id, payload);
          break;
        case 'order.price':
          // Price updates - log but don't change anything
          console.log(`Price update for shipment ${shipment.id}:`, payload);
          break;
        default:
          console.log(`Unhandled Biteship event: ${payload.event}`);
      }

      return res.json({
        success: true,
        message: 'Webhook processed'
      });
    } catch (error) {
      console.error('Error processing Biteship webhook:', error);
      // Return 200 to prevent retries for unrecoverable errors
      return res.json({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  };

  private async handleOrderStatusUpdate(shipmentId: string, payload: BiteshipWebhookPayload) {
    if (!payload.status) return;

    const newStatus = mapBiteshipStatus(payload.status);
    if (!newStatus) {
      console.log(`Unknown Biteship status: ${payload.status}`);
      return;
    }

    // Add tracking event
    await this.shipmentService.addTrackingEvent({
      shipmentId,
      status: payload.status,
      description: payload.note || payload.tracking?.note,
      location: payload.tracking?.location?.name,
      city: payload.tracking?.location?.city,
      courierStatus: payload.status,
      eventTime: payload.updated_at ? new Date(payload.updated_at) : new Date(),
      source: 'webhook',
      rawPayload: payload
    });

    // Update shipment status
    await this.shipmentService.updateShipmentStatus(shipmentId, newStatus);
  }

  private async handleWaybillUpdate(shipmentId: string, payload: BiteshipWebhookPayload) {
    if (!payload.courier_waybill_id) return;

    await this.shipmentService.updateShipment(shipmentId, {
      waybillId: payload.courier_waybill_id,
      trackingNumber: payload.courier_tracking_id || undefined
    });
  }

  /**
   * @swagger
   * /api/webhooks/biteship/test:
   *   post:
   *     summary: Test endpoint for Biteship webhook (dev only)
   *     tags: [Webhooks]
   */
  testBiteshipWebhook = async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: 'Not found'
      });
    }

    console.log('Test webhook received:', req.body);

    return res.json({
      success: true,
      message: 'Test webhook received',
      payload: req.body
    });
  };
}

export const webhookController = new WebhookController();
