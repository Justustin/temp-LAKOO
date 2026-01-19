import { Request, Response, NextFunction } from 'express';
import { ShipmentService } from '../services/shipment.service';
import { ShipmentRepository } from '../repositories/shipment.repository';
import { BiteshipWebhookPayload, ShipmentStatus } from '../types';
import crypto from 'crypto';

const shipmentService = new ShipmentService();
const shipmentRepository = new ShipmentRepository();

const BITESHIP_WEBHOOK_SECRET = process.env.BITESHIP_WEBHOOK_SECRET || '';

/**
 * Verify Biteship webhook signature
 */
function verifyBiteshipSignature(payload: string, signature: string): boolean {
  if (!BITESHIP_WEBHOOK_SECRET) {
    console.warn('BITESHIP_WEBHOOK_SECRET not configured, skipping signature verification');
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', BITESHIP_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
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

/**
 * @swagger
 * /api/webhooks/biteship:
 *   post:
 *     summary: Handle Biteship webhook events
 *     tags: [Webhooks]
 */
export async function handleBiteshipWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-biteship-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify signature (optional based on config)
    if (signature && !verifyBiteshipSignature(rawBody, signature)) {
      console.warn('Invalid Biteship webhook signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    const payload: BiteshipWebhookPayload = req.body;
    console.log(`Received Biteship webhook: ${payload.event}`, JSON.stringify(payload, null, 2));

    // Find shipment by Biteship order ID or tracking number
    let shipment = null;
    if (payload.order_id) {
      shipment = await shipmentRepository.findByBiteshipOrderId(payload.order_id);
    }
    if (!shipment && payload.courier_tracking_id) {
      shipment = await shipmentRepository.findByTrackingNumber(payload.courier_tracking_id);
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
        await handleOrderStatusUpdate(shipment.id, payload);
        break;
      case 'order.waybill_id':
        await handleWaybillUpdate(shipment.id, payload);
        break;
      case 'order.price':
        // Price updates - log but don't change anything
        console.log(`Price update for shipment ${shipment.id}:`, payload);
        break;
      default:
        console.log(`Unhandled Biteship event: ${payload.event}`);
    }

    res.json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    console.error('Error processing Biteship webhook:', error);
    // Return 200 to prevent retries for unrecoverable errors
    res.json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
}

async function handleOrderStatusUpdate(shipmentId: string, payload: BiteshipWebhookPayload) {
  if (!payload.status) return;

  const newStatus = mapBiteshipStatus(payload.status);
  if (!newStatus) {
    console.log(`Unknown Biteship status: ${payload.status}`);
    return;
  }

  // Add tracking event
  await shipmentService.addTrackingEvent({
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
  await shipmentService.updateShipmentStatus(shipmentId, newStatus);
}

async function handleWaybillUpdate(shipmentId: string, payload: BiteshipWebhookPayload) {
  if (!payload.courier_waybill_id) return;

  await shipmentService.updateShipment(shipmentId, {
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
export async function testBiteshipWebhook(req: Request, res: Response) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }

  console.log('Test webhook received:', req.body);

  res.json({
    success: true,
    message: 'Test webhook received',
    payload: req.body
  });
}
