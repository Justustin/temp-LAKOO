import { ShipmentRepository } from '../repositories/shipment.repository';
import { TrackingRepository } from '../repositories/tracking.repository';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import {
  CreateShipmentDTO,
  UpdateShipmentDTO,
  BookShipmentDTO,
  CreateTrackingEventDTO,
  ShipmentStatus,
  PaginationOptions
} from '../types';
import { outboxService } from './outbox.service';
import { NotFoundError, BadRequestError, ShipmentError } from '../middleware/error-handler';
import axios from 'axios';

// Defaults aligned with MICROSERVICE_ARCHITECTURE_PLAN.md (order-service: 3006, notification-service: 3008)
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3006';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

export class ShipmentService {
  private shipmentRepository: ShipmentRepository;
  private trackingRepository: TrackingRepository;
  private warehouseRepository: WarehouseRepository;

  constructor() {
    this.shipmentRepository = new ShipmentRepository();
    this.trackingRepository = new TrackingRepository();
    this.warehouseRepository = new WarehouseRepository();
  }

  // =============================================================================
  // Shipment CRUD
  // =============================================================================

  async createShipment(data: CreateShipmentDTO) {
    // If no origin provided, use default warehouse
    if (!data.origin) {
      const defaultWarehouse = await this.warehouseRepository.findDefault();
      if (!defaultWarehouse) {
        throw new BadRequestError('No default warehouse configured and no origin address provided');
      }
      data.origin = {
        name: defaultWarehouse.contactName,
        phone: defaultWarehouse.contactPhone,
        address: defaultWarehouse.address,
        district: defaultWarehouse.district || undefined,
        city: defaultWarehouse.city,
        province: defaultWarehouse.province,
        postalCode: defaultWarehouse.postalCode,
        latitude: defaultWarehouse.latitude ? Number(defaultWarehouse.latitude) : undefined,
        longitude: defaultWarehouse.longitude ? Number(defaultWarehouse.longitude) : undefined
      };
    }

    const shipment = await this.shipmentRepository.create(data);

    // Publish shipment.created event
    await outboxService.shipmentCreated(shipment);

    return shipment;
  }

  async getShipmentById(id: string) {
    const shipment = await this.shipmentRepository.findById(id);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }
    return shipment;
  }

  async getShipmentByNumber(shipmentNumber: string) {
    const shipment = await this.shipmentRepository.findByShipmentNumber(shipmentNumber);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }
    return shipment;
  }

  async getShipmentByOrderId(orderId: string) {
    return this.shipmentRepository.findByOrderId(orderId);
  }

  async getShipmentByTrackingNumber(trackingNumber: string) {
    const shipment = await this.shipmentRepository.findByTrackingNumber(trackingNumber);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }
    return shipment;
  }

  async getShipmentsByUserId(userId: string, options?: PaginationOptions) {
    return this.shipmentRepository.findByUserId(userId, options);
  }

  async getAllShipments(options?: PaginationOptions & { status?: ShipmentStatus }) {
    return this.shipmentRepository.findAll(options);
  }

  async updateShipment(id: string, data: UpdateShipmentDTO) {
    const shipment = await this.shipmentRepository.findById(id);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    return this.shipmentRepository.update(id, data);
  }

  // =============================================================================
  // Shipment Status Management
  // =============================================================================

  async bookShipment(data: BookShipmentDTO) {
    const shipment = await this.shipmentRepository.findById(data.shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    if (shipment.status !== 'pending') {
      throw new ShipmentError(`Cannot book shipment with status: ${shipment.status}`);
    }

    const estimatedDelivery = data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined;
    const updatedShipment = await this.shipmentRepository.markBooked(
      data.shipmentId,
      data.trackingNumber || '',
      data.waybillId,
      data.biteshipOrderId,
      estimatedDelivery
    );

    // Publish shipment.booked event
    await outboxService.shipmentBooked(updatedShipment);

    // Notify order service
    await this.updateOrderShipmentStatus(shipment.orderId, 'booked', data.trackingNumber);

    return updatedShipment;
  }

  async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    additionalData?: Partial<UpdateShipmentDTO>
  ) {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    const previousStatus = shipment.status;
    const updatedShipment = await this.shipmentRepository.updateStatus(
      shipmentId,
      status,
      additionalData
    );

    // Publish status change event
    await outboxService.shipmentStatusChanged(
      {
        ...updatedShipment,
        failureReason: additionalData?.failureReason,
        receiverName: additionalData?.receiverName
      },
      previousStatus
    );

    // Notify order service
    await this.updateOrderShipmentStatus(shipment.orderId, status);

    // Send notification to user for key status changes
    if (['delivered', 'failed', 'out_for_delivery'].includes(status)) {
      await this.sendShipmentNotification(
        shipment.userId,
        shipment.orderId,
        shipment.shipmentNumber,
        status
      );
    }

    return updatedShipment;
  }

  async markDelivered(
    shipmentId: string,
    receiverName?: string,
    proofOfDeliveryUrl?: string,
    signature?: string
  ) {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    const updatedShipment = await this.shipmentRepository.markDelivered(
      shipmentId,
      receiverName,
      proofOfDeliveryUrl,
      signature
    );

    // Publish delivery event
    await outboxService.shipmentDelivered(updatedShipment);

    // Notify order service
    await this.updateOrderShipmentStatus(shipment.orderId, 'delivered');

    // Send delivery notification
    await this.sendShipmentNotification(
      shipment.userId,
      shipment.orderId,
      shipment.shipmentNumber,
      'delivered'
    );

    return updatedShipment;
  }

  async markFailed(shipmentId: string, failureReason: string) {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    const updatedShipment = await this.shipmentRepository.markFailed(shipmentId, failureReason);

    // Publish failure event
    await outboxService.shipmentFailed(updatedShipment);

    // Notify order service
    await this.updateOrderShipmentStatus(shipment.orderId, 'failed');

    // Send failure notification
    await this.sendShipmentNotification(
      shipment.userId,
      shipment.orderId,
      shipment.shipmentNumber,
      'failed'
    );

    return updatedShipment;
  }

  async cancelShipment(shipmentId: string) {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    if (!['pending', 'booked'].includes(shipment.status)) {
      throw new ShipmentError(`Cannot cancel shipment with status: ${shipment.status}`);
    }

    const updatedShipment = await this.shipmentRepository.markCancelled(shipmentId);

    // Publish cancellation event
    await outboxService.shipmentStatusChanged(
      { ...updatedShipment, status: 'cancelled' },
      shipment.status
    );

    return updatedShipment;
  }

  // =============================================================================
  // Tracking Management
  // =============================================================================

  async addTrackingEvent(data: CreateTrackingEventDTO) {
    const shipment = await this.shipmentRepository.findById(data.shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    const trackingEvent = await this.trackingRepository.create(data);

    // Publish tracking update event
    await outboxService.trackingUpdated(shipment, trackingEvent);

    // Auto-update shipment status based on tracking event
    const newStatus = this.mapTrackingStatusToShipmentStatus(data.status);
    if (newStatus && newStatus !== shipment.status) {
      await this.updateShipmentStatus(data.shipmentId, newStatus);
    }

    return trackingEvent;
  }

  async getTrackingHistory(shipmentId: string) {
    const shipment = await this.shipmentRepository.findById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    return this.trackingRepository.findByShipmentId(shipmentId);
  }

  // =============================================================================
  // Statistics
  // =============================================================================

  async getShipmentStats(startDate: Date, endDate: Date) {
    return this.shipmentRepository.getShipmentStats(startDate, endDate);
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private mapTrackingStatusToShipmentStatus(trackingStatus: string): ShipmentStatus | null {
    const statusMap: Record<string, ShipmentStatus> = {
      // Common tracking statuses
      'picked_up': 'picked_up',
      'pickup': 'picked_up',
      'in_transit': 'in_transit',
      'transit': 'in_transit',
      'on_the_way': 'in_transit',
      'at_destination': 'at_destination_hub',
      'destination_hub': 'at_destination_hub',
      'out_for_delivery': 'out_for_delivery',
      'with_courier': 'out_for_delivery',
      'delivered': 'delivered',
      'received': 'delivered',
      'failed': 'failed',
      'undelivered': 'failed',
      'returned': 'returned',
      'return_to_sender': 'returned'
    };

    const normalizedStatus = trackingStatus.toLowerCase().replace(/[-\s]/g, '_');
    return statusMap[normalizedStatus] || null;
  }

  private async updateOrderShipmentStatus(
    orderId: string,
    status: ShipmentStatus,
    trackingNumber?: string | null
  ) {
    try {
      await axios.put(
        `${ORDER_SERVICE_URL}/api/orders/${orderId}/shipment-status`,
        {
          shipmentStatus: status,
          ...(trackingNumber && { trackingNumber })
        },
        {
          headers: {
            'x-internal-api-key': process.env.INTERNAL_API_KEY
          }
        }
      );
    } catch (error: any) {
      console.error(`Failed to update order ${orderId} shipment status:`, error.message);
      // Don't throw - this is a notification, not critical
    }
  }

  private async sendShipmentNotification(
    userId: string,
    orderId: string,
    shipmentNumber: string,
    status: ShipmentStatus
  ) {
    const messages: Record<string, { title: string; message: string }> = {
      out_for_delivery: {
        title: 'Out for Delivery',
        message: `Your order ${shipmentNumber} is out for delivery and will arrive soon!`
      },
      delivered: {
        title: 'Order Delivered',
        message: `Your order ${shipmentNumber} has been delivered successfully!`
      },
      failed: {
        title: 'Delivery Failed',
        message: `Delivery attempt for ${shipmentNumber} failed. We will retry soon.`
      }
    };

    const notification = messages[status];
    if (!notification) return;

    try {
      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/notifications`,
        {
          userId,
          type: `shipment_${status}`,
          title: notification.title,
          message: notification.message,
          actionUrl: `/orders/${orderId}`,
          relatedId: orderId
        },
        {
          headers: {
            'x-internal-api-key': process.env.INTERNAL_API_KEY
          }
        }
      );
    } catch (error: any) {
      console.error('Failed to send shipment notification:', error.message);
    }
  }
}
