import { prisma } from '../lib/prisma';
import type { Address } from '../generated/prisma';

export type AddressEventType =
  | 'address.created'
  | 'address.updated'
  | 'address.deleted'
  | 'address.set_default';

interface EventPayload {
  [key: string]: any;
}

export class OutboxService {
  /**
   * Publish a domain event to the outbox table
   */
  async publish(
    aggregateType: string,
    aggregateId: string,
    eventType: AddressEventType,
    payload: EventPayload,
    metadata?: Record<string, any>
  ): Promise<void> {
    await prisma.serviceOutbox.create({
      data: {
        aggregateType,
        aggregateId,
        eventType,
        payload,
        ...(metadata ? { metadata } : {})
      }
    });
  }

  /**
   * Publish address created event
   */
  async addressCreated(address: Address): Promise<void> {
    await this.publish('Address', address.id, 'address.created', {
      addressId: address.id,
      userId: address.userId,
      label: address.label,
      recipientName: address.recipientName,
      cityName: address.cityName,
      provinceName: address.provinceName,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString()
    });
  }

  /**
   * Publish address updated event
   */
  async addressUpdated(address: Address): Promise<void> {
    await this.publish('Address', address.id, 'address.updated', {
      addressId: address.id,
      userId: address.userId,
      label: address.label,
      recipientName: address.recipientName,
      cityName: address.cityName,
      provinceName: address.provinceName,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
      updatedAt: address.updatedAt.toISOString()
    });
  }

  /**
   * Publish address deleted event
   */
  async addressDeleted(address: Address): Promise<void> {
    await this.publish('Address', address.id, 'address.deleted', {
      addressId: address.id,
      userId: address.userId,
      deletedAt: address.deletedAt?.toISOString() || new Date().toISOString()
    });
  }

  /**
   * Publish address set as default event
   */
  async addressSetDefault(address: Address): Promise<void> {
    await this.publish('Address', address.id, 'address.set_default', {
      addressId: address.id,
      userId: address.userId,
      isDefault: true,
      updatedAt: address.updatedAt.toISOString()
    });
  }
}

export const outboxService = new OutboxService();
