import { prisma } from '../lib/prisma';
import { WarehouseRepository, warehouseRepository } from '../repositories/warehouse.repository';
import { outboxService } from './outbox.service';

const RESERVATION_EXPIRY_HOURS = parseInt(process.env.RESERVATION_EXPIRY_HOURS || '24');
const MAX_RETRY_ATTEMPTS = 3;

export class WarehouseService {
  private repository: WarehouseRepository;

  constructor() {
    this.repository = warehouseRepository;
  }

  // =============================================================================
  // Inventory Status
  // =============================================================================

  async getInventoryStatus(productId: string, variantId: string | null) {
    const inventory = await this.repository.findInventory(productId, variantId);

    if (!inventory) {
      return {
        status: 'not_configured',
        productId,
        variantId,
        quantity: 0,
        availableQuantity: 0,
        reservedQuantity: 0,
        maxStockLevel: 0,
        minStockLevel: 0
      };
    }

    let status = 'in_stock';
    if (inventory.availableQuantity <= 0) {
      status = 'out_of_stock';
    } else if (inventory.availableQuantity <= inventory.minStockLevel) {
      status = 'low_stock';
    }

    return {
      status,
      productId: inventory.productId,
      variantId: inventory.variantId,
      sku: inventory.sku,
      quantity: inventory.quantity,
      availableQuantity: inventory.availableQuantity,
      reservedQuantity: inventory.reservedQuantity,
      damagedQuantity: inventory.damagedQuantity,
      maxStockLevel: inventory.maxStockLevel || 0,
      minStockLevel: inventory.minStockLevel,
      reorderPoint: inventory.reorderPoint,
      location: inventory.location,
      zone: inventory.zone
    };
  }

  async getAllInventory(filters?: { status?: string; lowStock?: boolean; productId?: string }) {
    return this.repository.findAllInventory(filters);
  }

  // =============================================================================
  // Stock Reservation (with optimistic locking to prevent oversell)
  // =============================================================================

  async reserveInventory(data: {
    productId: string;
    variantId: string | null;
    quantity: number;
    orderId: string;
    orderItemId?: string;
  }) {
    const { productId, variantId, quantity, orderId, orderItemId } = data;

    console.log(`Reserve inventory: product ${productId}, variant ${variantId}, quantity ${quantity}`);

    // Retry loop for optimistic locking
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      const inventory = await this.repository.findInventory(productId, variantId);

      if (!inventory) {
        return {
          success: false,
          message: 'Inventory not configured for this product/variant',
          reserved: false
        };
      }

      if (inventory.availableQuantity < quantity) {
        return {
          success: false,
          message: `Insufficient stock (need ${quantity}, have ${inventory.availableQuantity})`,
          reserved: false,
          shortage: quantity - inventory.availableQuantity
        };
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + RESERVATION_EXPIRY_HOURS);

      // Atomic reservation with optimistic locking
      const updatedInventory = await this.repository.atomicReserveStock(
        inventory.id,
        quantity,
        inventory.version
      );

      if (!updatedInventory) {
        // Concurrent modification detected, retry
        console.log(`Reservation attempt ${attempt} failed due to concurrent update, retrying...`);
        if (attempt === MAX_RETRY_ATTEMPTS) {
          return {
            success: false,
            message: 'Could not reserve stock due to concurrent updates. Please try again.',
            reserved: false
          };
        }
        continue;
      }

      // Reservation successful, create reservation record
      const reservation = await prisma.stockReservation.create({
        data: {
          inventoryId: inventory.id,
          orderId,
          orderItemId,
          quantity,
          status: 'reserved',
          expiresAt
        }
      });

      const availableAfter = updatedInventory.availableQuantity;

      // Publish event
      await outboxService.inventoryReserved({
        inventoryId: inventory.id,
        productId,
        variantId,
        orderId,
        orderItemId: orderItemId || null,
        quantity,
        reservationId: reservation.id,
        availableAfter
      });

      // Check for low stock alert
      if (availableAfter <= inventory.minStockLevel && availableAfter > 0) {
        await outboxService.lowStock({
          inventoryId: inventory.id,
          productId,
          variantId,
          sku: inventory.sku,
          currentStock: availableAfter,
          minStockLevel: inventory.minStockLevel
        });
      } else if (availableAfter <= 0) {
        await outboxService.outOfStock({
          inventoryId: inventory.id,
          productId,
          variantId,
          sku: inventory.sku
        });
      }

      console.log(`Reserved ${quantity} units. Remaining: ${availableAfter}`);

      return {
        success: true,
        message: `Successfully reserved ${quantity} units`,
        reserved: true,
        reservationId: reservation.id,
        quantity,
        availableAfter,
        expiresAt
      };
    }

    // Should not reach here, but just in case
    return {
      success: false,
      message: 'Reservation failed after maximum retries',
      reserved: false
    };
  }

  async releaseReservation(reservationId: string, reason: string = 'order_cancelled') {
    const reservation = await this.repository.findReservation(reservationId);

    if (!reservation) {
      return {
        success: false,
        message: 'Reservation not found'
      };
    }

    if (reservation.status !== 'reserved') {
      return {
        success: false,
        message: `Cannot release reservation with status: ${reservation.status}`
      };
    }

    const inventory = reservation.inventory;

    // Release stock atomically
    await prisma.$transaction([
      prisma.warehouseInventory.update({
        where: { id: inventory.id },
        data: {
          reservedQuantity: { decrement: reservation.quantity },
          availableQuantity: { increment: reservation.quantity },
          version: { increment: 1 }
        }
      }),
      prisma.stockReservation.update({
        where: { id: reservationId },
        data: {
          status: 'released',
          releasedAt: new Date()
        }
      })
    ]);

    const availableAfter = inventory.availableQuantity + reservation.quantity;

    // Publish event
    await outboxService.inventoryReleased({
      inventoryId: inventory.id,
      productId: inventory.productId,
      variantId: inventory.variantId,
      orderId: reservation.orderId,
      quantity: reservation.quantity,
      reservationId,
      availableAfter,
      reason
    });

    console.log(`Released reservation ${reservationId}. Available: ${availableAfter}`);

    return {
      success: true,
      message: `Released ${reservation.quantity} units`,
      quantity: reservation.quantity,
      availableAfter
    };
  }

  async confirmReservation(reservationId: string) {
    const reservation = await this.repository.findReservation(reservationId);

    if (!reservation) {
      return {
        success: false,
        message: 'Reservation not found'
      };
    }

    if (reservation.status !== 'reserved') {
      return {
        success: false,
        message: `Cannot confirm reservation with status: ${reservation.status}`
      };
    }

    const inventory = reservation.inventory;

    // Confirm reservation and deduct from total stock atomically
    await prisma.$transaction([
      prisma.warehouseInventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { decrement: reservation.quantity },
          reservedQuantity: { decrement: reservation.quantity },
          lastSoldAt: new Date(),
          version: { increment: 1 }
        }
      }),
      prisma.stockReservation.update({
        where: { id: reservationId },
        data: {
          status: 'confirmed',
          confirmedAt: new Date()
        }
      }),
      prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          movementNumber: `MOV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          type: 'order_fulfilled',
          quantityBefore: inventory.quantity,
          quantityChange: -reservation.quantity,
          quantityAfter: inventory.quantity - reservation.quantity,
          referenceType: 'order',
          referenceId: reservation.orderId,
          orderId: reservation.orderId
        }
      })
    ]);

    // Publish event
    await outboxService.inventoryConfirmed({
      inventoryId: inventory.id,
      productId: inventory.productId,
      variantId: inventory.variantId,
      orderId: reservation.orderId,
      quantity: reservation.quantity,
      reservationId
    });

    console.log(`Confirmed reservation ${reservationId}. Deducted ${reservation.quantity} from stock.`);

    return {
      success: true,
      message: `Confirmed and deducted ${reservation.quantity} units`,
      quantity: reservation.quantity
    };
  }

  // =============================================================================
  // Bundle Overflow Checking (Grosir Constraints)
  // =============================================================================

  async checkBundleOverflow(productId: string, variantId: string | null) {
    const bundleConfig = await this.repository.findBundleConfig(productId);

    if (!bundleConfig) {
      return {
        isLocked: false,
        reason: 'Product not configured for bundle checking',
        canOrder: true
      };
    }

    const inventory = await this.repository.findInventory(productId, variantId);

    if (inventory && inventory.availableQuantity > 0) {
      return {
        isLocked: false,
        reason: 'Stock available - no bundle order needed',
        canOrder: true,
        availableQuantity: inventory.availableQuantity
      };
    }

    const sizeBreakdown = bundleConfig.sizeBreakdown as Record<string, number>;
    const tolerances = await this.repository.findAllTolerances(productId);
    const overflowVariants: string[] = [];

    for (const [size, unitsInBundle] of Object.entries(sizeBreakdown)) {
      const tolerance = tolerances.find(t => t.size === size);
      if (!tolerance) continue;

      const currentExcess = tolerance.currentExcess || 0;
      const maxExcess = tolerance.maxExcessUnits;
      const afterBundle = currentExcess + unitsInBundle;

      if (afterBundle > maxExcess) {
        overflowVariants.push(`${size} (${currentExcess} + ${unitsInBundle} = ${afterBundle} > ${maxExcess})`);
      }
    }

    if (overflowVariants.length > 0) {
      return {
        isLocked: true,
        reason: `Ordering a bundle would exceed max stock for: ${overflowVariants.join(', ')}`,
        canOrder: false,
        overflowVariants
      };
    }

    return {
      isLocked: false,
      reason: 'Bundle can be ordered without overflow',
      canOrder: true
    };
  }

  async checkAllVariantsOverflow(productId: string) {
    const bundleConfig = await this.repository.findBundleConfig(productId);

    if (!bundleConfig) {
      return {
        productId,
        variants: [],
        message: 'Product not configured for bundle checking'
      };
    }

    const sizeBreakdown = bundleConfig.sizeBreakdown as Record<string, number>;
    const tolerances = await this.repository.findAllTolerances(productId);

    const variantStatuses: Array<{
      size: string;
      variantId: string | null;
      isLocked: boolean;
      canOrder: boolean;
      reason: string;
      availableQuantity: number;
      overflowVariants?: string[];
    }> = [];

    for (const [size, unitsInBundle] of Object.entries(sizeBreakdown)) {
      const tolerance = tolerances.find(t => t.size === size);

      if (!tolerance) {
        variantStatuses.push({
          size,
          variantId: null,
          isLocked: false,
          canOrder: true,
          reason: 'No tolerance configured',
          availableQuantity: 0
        });
        continue;
      }

      if (tolerance.isLocked) {
        variantStatuses.push({
          size,
          variantId: tolerance.variantId,
          isLocked: true,
          canOrder: false,
          reason: tolerance.lockedReason || 'Variant is locked',
          availableQuantity: 0
        });
        continue;
      }

      const inventory = await this.repository.findInventory(productId, tolerance.variantId);
      const available = inventory?.availableQuantity || 0;

      if (available > 0) {
        variantStatuses.push({
          size,
          variantId: tolerance.variantId,
          isLocked: false,
          canOrder: true,
          reason: `Stock available (${available} units)`,
          availableQuantity: available
        });
        continue;
      }

      const overflowVariants: string[] = [];
      for (const [otherSize, otherUnits] of Object.entries(sizeBreakdown)) {
        const otherTolerance = tolerances.find(t => t.size === otherSize);
        if (!otherTolerance) continue;

        const currentExcess = otherTolerance.currentExcess || 0;
        const maxExcess = otherTolerance.maxExcessUnits;
        const afterBundle = currentExcess + otherUnits;

        if (afterBundle > maxExcess) {
          overflowVariants.push(otherSize);
        }
      }

      variantStatuses.push({
        size,
        variantId: tolerance.variantId,
        isLocked: overflowVariants.length > 0,
        canOrder: overflowVariants.length === 0,
        reason: overflowVariants.length > 0
          ? `Would overflow: ${overflowVariants.join(', ')}`
          : 'Can order (bundle has room)',
        availableQuantity: 0,
        overflowVariants: overflowVariants.length > 0 ? overflowVariants : undefined
      });
    }

    return {
      productId,
      bundleName: bundleConfig.bundleName,
      totalUnitsPerBundle: bundleConfig.totalUnits,
      variants: variantStatuses
    };
  }

  // =============================================================================
  // Admin Operations
  // =============================================================================

  async createInventory(data: {
    productId: string;
    variantId?: string | null;
    sku: string;
    quantity?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    location?: string;
    zone?: string;
  }) {
    return this.repository.createInventory(data);
  }

  async adjustInventory(data: {
    productId: string;
    variantId: string | null;
    quantityChange: number;
    reason: string;
    notes?: string;
    createdBy?: string;
  }) {
    const inventory = await this.repository.findInventory(data.productId, data.variantId);

    if (!inventory) {
      throw new Error('Inventory not found');
    }

    const quantityBefore = inventory.quantity;
    const quantityAfter = quantityBefore + data.quantityChange;

    if (quantityAfter < 0) {
      throw new Error(`Cannot adjust: would result in negative quantity (${quantityAfter})`);
    }

    const movementType = data.quantityChange > 0 ? 'adjustment_in' : 'adjustment_out';

    await prisma.$transaction([
      prisma.warehouseInventory.update({
        where: { id: inventory.id },
        data: {
          quantity: quantityAfter,
          availableQuantity: { increment: data.quantityChange },
          version: { increment: 1 }
        }
      }),
      prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          movementNumber: `MOV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          type: movementType,
          quantityBefore,
          quantityChange: data.quantityChange,
          quantityAfter,
          referenceType: 'adjustment',
          reason: data.reason,
          notes: data.notes,
          createdBy: data.createdBy
        }
      })
    ]);

    return {
      success: true,
      message: `Adjusted inventory by ${data.quantityChange}`,
      quantityBefore,
      quantityAfter
    };
  }

  async getMovementHistory(productId: string, variantId: string | null, limit = 50) {
    const inventory = await this.repository.findInventory(productId, variantId);
    if (!inventory) {
      return [];
    }
    return this.repository.findMovementsByInventory(inventory.id, limit);
  }

  // =============================================================================
  // Bundle Configuration
  // =============================================================================

  async updateBundleConfig(data: {
    productId: string;
    supplierId?: string;
    bundleName?: string;
    totalUnits: number;
    sizeBreakdown: Record<string, number>;
    bundleCost: number;
    minBundleOrder?: number;
    createdBy?: string;
  }) {
    return this.repository.upsertBundleConfig(data);
  }

  async updateTolerance(data: {
    productId: string;
    variantId?: string | null;
    size?: string;
    maxExcessUnits: number;
    updatedBy?: string;
  }) {
    return this.repository.upsertTolerance(data);
  }

  // =============================================================================
  // Stock Alerts
  // =============================================================================

  async getActiveAlerts() {
    return this.repository.findActiveAlerts();
  }

  async acknowledgeAlert(alertId: string, userId: string) {
    return this.repository.acknowledgeAlert(alertId, userId);
  }

  async resolveAlert(alertId: string) {
    return this.repository.resolveAlert(alertId);
  }

  // =============================================================================
  // Purchase Orders
  // =============================================================================

  async getPurchaseOrders(filters?: {
    status?: string;
    supplierId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return this.repository.findAllPurchaseOrders(filters as any);
  }

  async getPurchaseOrder(id: string) {
    return this.repository.findPurchaseOrder(id);
  }

  async createPurchaseOrder(data: {
    supplierId: string;
    supplierName: string;
    supplierContact?: string;
    supplierPhone?: string;
    items: Array<{
      productId: string;
      variantId?: string;
      productName: string;
      variantName?: string;
      sku: string;
      bundleQuantity: number;
      unitsPerBundle: number;
      unitCost: number;
    }>;
    shippingCost?: number;
    notes?: string;
    createdBy?: string;
  }) {
    const po = await this.repository.createPurchaseOrder(data);

    await outboxService.purchaseOrderCreated({
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      totalItems: po.totalItems,
      totalUnits: po.totalUnits,
      totalCost: Number(po.totalCost)
    });

    return po;
  }

  async updatePurchaseOrderStatus(id: string, status: string, updatedBy?: string) {
    return this.repository.updatePurchaseOrderStatus(id, status as any, updatedBy);
  }

  /**
   * Receive items from a purchase order.
   * All operations are wrapped in a transaction for atomicity.
   * Status is computed from cumulative DB state after updates.
   */
  async receivePurchaseOrder(
    id: string,
    items: Array<{ itemId: string; receivedUnits: number; damagedUnits?: number }>
  ) {
    const po = await this.repository.findPurchaseOrder(id);
    if (!po) {
      throw new Error('Purchase order not found');
    }

    let totalReceived = 0;
    let totalDamaged = 0;

    // Wrap all operations in a transaction
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const poItem = po.items.find(i => i.id === item.itemId);
        if (!poItem) continue;

        // Update PO item with received quantities (cumulative)
        const newReceivedUnits = poItem.receivedUnits + item.receivedUnits;
        const newDamagedUnits = poItem.damagedUnits + (item.damagedUnits || 0);

        await tx.purchaseOrderItem.update({
          where: { id: item.itemId },
          data: {
            receivedUnits: newReceivedUnits,
            damagedUnits: newDamagedUnits,
            status: newReceivedUnits >= poItem.totalUnits ? 'received' : 'partial'
          }
        });

        // Add received units to inventory
        const goodUnits = item.receivedUnits - (item.damagedUnits || 0);
        if (goodUnits > 0) {
          const inventory = await tx.warehouseInventory.findUnique({
            where: {
              productId_variantId: {
                productId: poItem.productId,
                variantId: poItem.variantId || null
              }
            }
          });

          if (inventory) {
            await tx.warehouseInventory.update({
              where: { id: inventory.id },
              data: {
                quantity: { increment: goodUnits },
                availableQuantity: { increment: goodUnits },
                lastRestockedAt: new Date(),
                version: { increment: 1 }
              }
            });

            // Create movement record
            await tx.inventoryMovement.create({
              data: {
                inventoryId: inventory.id,
                movementNumber: `MOV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
                type: 'purchase_order_received',
                quantityBefore: inventory.quantity,
                quantityChange: goodUnits,
                quantityAfter: inventory.quantity + goodUnits,
                referenceType: 'purchase_order',
                referenceId: po.id,
                purchaseOrderId: po.id,
                reason: `Received from PO ${po.poNumber}`,
                unitCost: Number(poItem.unitCost)
              }
            });
          }
        }

        totalReceived += item.receivedUnits;
        totalDamaged += item.damagedUnits || 0;
      }

      // Compute status from DB state (cumulative received vs expected)
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id }
      });

      const allFullyReceived = updatedItems.every(
        item => item.receivedUnits >= item.totalUnits
      );
      const anyReceived = updatedItems.some(item => item.receivedUnits > 0);

      let newStatus: 'received' | 'partially_received' | 'draft' = 'draft';
      if (allFullyReceived) {
        newStatus = 'received';
      } else if (anyReceived) {
        newStatus = 'partially_received';
      }

      await tx.warehousePurchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          receivedDate: allFullyReceived ? new Date() : undefined
        }
      });
    });

    // Publish events after successful transaction
    // Re-fetch to get updated inventory data
    const updatedPo = await this.repository.findPurchaseOrder(id);

    for (const item of items) {
      const poItem = po.items.find(i => i.id === item.itemId);
      if (!poItem) continue;

      const goodUnits = item.receivedUnits - (item.damagedUnits || 0);
      if (goodUnits > 0) {
        const inventory = await this.repository.findInventory(poItem.productId, poItem.variantId);
        if (inventory) {
          await outboxService.restocked({
            inventoryId: inventory.id,
            productId: inventory.productId,
            variantId: inventory.variantId,
            sku: inventory.sku,
            quantityAdded: goodUnits,
            newTotal: inventory.quantity,
            purchaseOrderId: po.id
          });
        }
      }
    }

    await outboxService.purchaseOrderReceived({
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      totalUnitsReceived: totalReceived,
      damagedUnits: totalDamaged
    });

    return {
      success: true,
      message: `Received ${totalReceived} units (${totalDamaged} damaged)`,
      status: updatedPo?.status || 'partially_received',
      totalReceived,
      totalDamaged
    };
  }
}

export const warehouseService = new WarehouseService();
