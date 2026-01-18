import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma';

// Transaction client type for passing into transactional methods
type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Outbox Service
 *
 * Publishes domain events to the ServiceOutbox table for eventual delivery
 * to other services via Kafka/message broker.
 *
 * Supports both standalone and transactional publishing via optional tx parameter.
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
   * @param tx - Optional transaction client for atomic publishing
   */
  async publish(
    aggregateType: 'Inventory' | 'Reservation' | 'PurchaseOrder' | 'StockAlert' | 'Variant',
    aggregateId: string,
    eventType: EventType,
    payload: Record<string, any>,
    metadata?: Record<string, any>,
    tx?: TxClient
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.serviceOutbox.create({
      data: {
        aggregateType,
        aggregateId,
        eventType,
        payload,
        metadata: metadata ?? undefined
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
  }, tx?: TxClient): Promise<void> {
    const payload: InventoryReservedPayload = {
      ...data,
      reservedAt: new Date().toISOString()
    };

    await this.publish('Reservation', data.reservationId, 'inventory.reserved', payload, undefined, tx);
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
  }, tx?: TxClient): Promise<void> {
    const payload: InventoryReleasedPayload = {
      ...data,
      releasedAt: new Date().toISOString()
    };

    await this.publish('Reservation', data.reservationId, 'inventory.released', payload, undefined, tx);
  }

  async inventoryConfirmed(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    orderId: string;
    quantity: number;
    reservationId: string;
  }, tx?: TxClient): Promise<void> {
    const payload: InventoryConfirmedPayload = {
      ...data,
      confirmedAt: new Date().toISOString()
    };

    await this.publish('Reservation', data.reservationId, 'inventory.confirmed', payload, undefined, tx);
  }

  async lowStock(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    sku: string;
    currentStock: number;
    minStockLevel: number;
  }, tx?: TxClient): Promise<void> {
    const payload: LowStockPayload = {
      ...data,
      triggeredAt: new Date().toISOString()
    };

    await this.publish('Inventory', data.inventoryId, 'inventory.low_stock', payload, undefined, tx);
  }

  async outOfStock(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    sku: string;
  }, tx?: TxClient): Promise<void> {
    const payload: OutOfStockPayload = {
      ...data,
      triggeredAt: new Date().toISOString()
    };

    await this.publish('Inventory', data.inventoryId, 'inventory.out_of_stock', payload, undefined, tx);
  }

  async restocked(data: {
    inventoryId: string;
    productId: string;
    variantId: string | null;
    sku: string;
    quantityAdded: number;
    newTotal: number;
    purchaseOrderId: string | null;
  }, tx?: TxClient): Promise<void> {
    const payload: RestockedPayload = {
      ...data,
      restockedAt: new Date().toISOString()
    };

    await this.publish('Inventory', data.inventoryId, 'inventory.restocked', payload, undefined, tx);
  }

  // =============================================================================
  // Variant Lock Events
  // =============================================================================

  async variantLocked(data: {
    productId: string;
    variantId: string | null;
    reason: string;
    overflowVariants: string[];
  }, tx?: TxClient): Promise<void> {
    const payload: VariantLockedPayload = {
      ...data,
      lockedAt: new Date().toISOString()
    };

    await this.publish('Variant', data.productId, 'variant.locked', payload, undefined, tx);
  }

  async variantUnlocked(data: {
    productId: string;
    variantId: string | null;
  }, tx?: TxClient): Promise<void> {
    const payload: VariantUnlockedPayload = {
      ...data,
      unlockedAt: new Date().toISOString()
    };

    await this.publish('Variant', data.productId, 'variant.unlocked', payload, undefined, tx);
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
  }, tx?: TxClient): Promise<void> {
    const payload: PurchaseOrderCreatedPayload = {
      ...data,
      createdAt: new Date().toISOString()
    };

    await this.publish('PurchaseOrder', data.purchaseOrderId, 'purchase_order.created', payload, undefined, tx);
  }

  async purchaseOrderReceived(data: {
    purchaseOrderId: string;
    poNumber: string;
    supplierId: string;
    totalUnitsReceived: number;
    damagedUnits: number;
  }, tx?: TxClient): Promise<void> {
    const payload: PurchaseOrderReceivedPayload = {
      ...data,
      receivedAt: new Date().toISOString()
    };

    await this.publish('PurchaseOrder', data.purchaseOrderId, 'purchase_order.received', payload, undefined, tx);
  }

  // =============================================================================
  // Stock Alert Events
  // =============================================================================

  async stockAlertTriggered(data: {
    alertId: string;
    inventoryId: string;
    productId: string;
    variantId: string | null;
    alertType: string;
    currentStock: number;
    threshold: number;
    message: string;
  }, tx?: TxClient): Promise<void> {
    const payload = {
      ...data,
      triggeredAt: new Date().toISOString()
    };

    await this.publish('StockAlert', data.alertId, 'stock_alert.triggered', payload, undefined, tx);
  }
}

// Singleton instance
export const outboxService = new OutboxService();
