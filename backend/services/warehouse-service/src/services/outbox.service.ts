import { prisma } from '../lib/prisma';

/**
 * Outbox Service
 *
 * Publishes domain events to the ServiceOutbox table for eventual delivery
 * to other services via Kafka/message broker.
 */

// =============================================================================
// Event Types
// =============================================================================

export type InventoryEventType =
  | 'inventory.created'
  | 'inventory.updated'
  | 'inventory.reserved'
  | 'inventory.released'
  | 'inventory.confirmed'
  | 'inventory.low_stock'
  | 'inventory.out_of_stock'
  | 'inventory.restocked';

export type VariantEventType =
  | 'variant.locked'
  | 'variant.unlocked';

export type PurchaseOrderEventType =
  | 'purchase_order.created'
  | 'purchase_order.approved'
  | 'purchase_order.sent'
  | 'purchase_order.received'
  | 'purchase_order.cancelled';

export type StockAlertEventType =
  | 'stock_alert.triggered'
  | 'stock_alert.acknowledged'
  | 'stock_alert.resolved';

export type EventType =
  | InventoryEventType
  | VariantEventType
  | PurchaseOrderEventType
  | StockAlertEventType;

// =============================================================================
// Event Payloads
// =============================================================================

export interface InventoryReservedPayload {
  inventoryId: string;
  productId: string;
  variantId: string | null;
  orderId: string;
  orderItemId: string | null;
  quantity: number;
  reservationId: string;
  availableAfter: number;
  reservedAt: string;
}

export interface InventoryReleasedPayload {
  inventoryId: string;
  productId: string;
  variantId: string | null;
  orderId: string;
  quantity: number;
  reservationId: string;
  availableAfter: number;
  releasedAt: string;
  reason: string;
}

export interface InventoryConfirmedPayload {
  inventoryId: string;
  productId: string;
  variantId: string | null;
  orderId: string;
  quantity: number;
  reservationId: string;
  confirmedAt: string;
}

export interface LowStockPayload {
  inventoryId: string;
  productId: string;
  variantId: string | null;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  triggeredAt: string;
}

export interface OutOfStockPayload {
  inventoryId: string;
  productId: string;
  variantId: string | null;
  sku: string;
  triggeredAt: string;
}

export interface RestockedPayload {
  inventoryId: string;
  productId: string;
  variantId: string | null;
  sku: string;
  quantityAdded: number;
  newTotal: number;
  purchaseOrderId: string | null;
  restockedAt: string;
}

export interface VariantLockedPayload {
  productId: string;
  variantId: string | null;
  reason: string;
  overflowVariants: string[];
  lockedAt: string;
}

export interface VariantUnlockedPayload {
  productId: string;
  variantId: string | null;
  unlockedAt: string;
}

export interface PurchaseOrderCreatedPayload {
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  totalItems: number;
  totalUnits: number;
  totalCost: number;
  createdAt: string;
}

export interface PurchaseOrderReceivedPayload {
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  totalUnitsReceived: number;
  damagedUnits: number;
  receivedAt: string;
}

// =============================================================================
// Outbox Service
// =============================================================================

export class OutboxService {
  /**
   * Publish an event to the outbox
   */
  async publish(
    aggregateType: 'Inventory' | 'Reservation' | 'PurchaseOrder' | 'StockAlert' | 'Variant',
    aggregateId: string,
    eventType: EventType,
    payload: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await prisma.serviceOutbox.create({
      data: {
        aggregateType,
        aggregateId,
        eventType,
        payload,
        metadata: metadata || null
      }
    });
  }

  // =============================================================================
  // Inventory Events
  // =============================================================================

  async inventoryReserved(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    orderId: string;
    orderItemId: string | null;
    quantity: number;
    reservationId: string;
    availableAfter: number;
  }): Promise<void> {
    const payload: InventoryReservedPayload = {
      ...data,
      reservedAt: new Date().toISOString()
    };

    await this.publish('Reservation', data.reservationId, 'inventory.reserved', payload);
  }

  async inventoryReleased(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    orderId: string;
    quantity: number;
    reservationId: string;
    availableAfter: number;
    reason: string;
  }): Promise<void> {
    const payload: InventoryReleasedPayload = {
      ...data,
      releasedAt: new Date().toISOString()
    };

    await this.publish('Reservation', data.reservationId, 'inventory.released', payload);
  }

  async inventoryConfirmed(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    orderId: string;
    quantity: number;
    reservationId: string;
  }): Promise<void> {
    const payload: InventoryConfirmedPayload = {
      ...data,
      confirmedAt: new Date().toISOString()
    };

    await this.publish('Reservation', data.reservationId, 'inventory.confirmed', payload);
  }

  async lowStock(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    sku: string;
    currentStock: number;
    minStockLevel: number;
  }): Promise<void> {
    const payload: LowStockPayload = {
      ...data,
      triggeredAt: new Date().toISOString()
    };

    await this.publish('Inventory', data.inventoryId, 'inventory.low_stock', payload);
  }

  async outOfStock(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    sku: string;
  }): Promise<void> {
    const payload: OutOfStockPayload = {
      ...data,
      triggeredAt: new Date().toISOString()
    };

    await this.publish('Inventory', data.inventoryId, 'inventory.out_of_stock', payload);
  }

  async restocked(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    sku: string;
    quantityAdded: number;
    newTotal: number;
    purchaseOrderId: string | null;
  }): Promise<void> {
    const payload: RestockedPayload = {
      ...data,
      restockedAt: new Date().toISOString()
    };

    await this.publish('Inventory', data.inventoryId, 'inventory.restocked', payload);
  }

  // =============================================================================
  // Variant Lock Events
  // =============================================================================

  async variantLocked(data: {
    productId: string;
    variantId: string | null;
    reason: string;
    overflowVariants: string[];
  }): Promise<void> {
    const payload: VariantLockedPayload = {
      ...data,
      lockedAt: new Date().toISOString()
    };

    await this.publish('Variant', data.productId, 'variant.locked', payload);
  }

  async variantUnlocked(data: {
    productId: string;
    variantId: string | null;
  }): Promise<void> {
    const payload: VariantUnlockedPayload = {
      ...data,
      unlockedAt: new Date().toISOString()
    };

    await this.publish('Variant', data.productId, 'variant.unlocked', payload);
  }

  // =============================================================================
  // Purchase Order Events
  // =============================================================================

  async purchaseOrderCreated(data: {
    purchaseOrderId: string;
    poNumber: string;
    supplierId: string;
    supplierName: string;
    totalItems: number;
    totalUnits: number;
    totalCost: number;
  }): Promise<void> {
    const payload: PurchaseOrderCreatedPayload = {
      ...data,
      createdAt: new Date().toISOString()
    };

    await this.publish('PurchaseOrder', data.purchaseOrderId, 'purchase_order.created', payload);
  }

  async purchaseOrderReceived(data: {
    purchaseOrderId: string;
    poNumber: string;
    supplierId: string;
    totalUnitsReceived: number;
    damagedUnits: number;
  }): Promise<void> {
    const payload: PurchaseOrderReceivedPayload = {
      ...data,
      receivedAt: new Date().toISOString()
    };

    await this.publish('PurchaseOrder', data.purchaseOrderId, 'purchase_order.received', payload);
  }
}

// Singleton instance
export const outboxService = new OutboxService();
