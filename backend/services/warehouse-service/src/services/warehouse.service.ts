import { prisma } from '../lib/prisma';
import { WarehouseRepository, warehouseRepository } from '../repositories/warehouse.repository';
import { outboxService } from './outbox.service';
import { Prisma } from '../generated/prisma';

// Type for Prisma transaction client
type TxClient = Prisma.TransactionClient;

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

  /**
   * Reserve inventory atomically.
   * All operations (inventory update, reservation creation, outbox events, alerts)
   * are wrapped in a single transaction to prevent ghost reservations.
   */
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

      try {
        // Wrap ALL operations in a single transaction for atomicity
        const result = await prisma.$transaction(async (tx: TxClient) => {
          // Atomic reservation with optimistic locking using updateMany
          const updateResult = await tx.warehouseInventory.updateMany({
            where: {
              id: inventory.id,
              version: inventory.version,
              availableQuantity: { gte: quantity }
            },
            data: {
              reservedQuantity: { increment: quantity },
              availableQuantity: { decrement: quantity },
              version: { increment: 1 }
            }
          });

          if (updateResult.count === 0) {
            // Concurrent modification or insufficient stock - will trigger retry
            return null;
          }

          // Get updated inventory state
          const updatedInventory = await tx.warehouseInventory.findUnique({
            where: { id: inventory.id }
          });

          if (!updatedInventory) {
            return null;
          }

          // Create reservation record in same transaction
          const reservation = await tx.stockReservation.create({
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

          // Publish outbox event in same transaction
          await outboxService.inventoryReserved({
            inventoryId: inventory.id,
            productId,
            variantId,
            orderId,
            orderItemId: orderItemId || null,
            quantity,
            reservationId: reservation.id,
            availableAfter
          }, tx);

          // Check for low stock alert and create alert record + outbox event
          if (availableAfter <= inventory.minStockLevel && availableAfter > 0) {
            const alert = await tx.stockAlert.create({
              data: {
                inventoryId: inventory.id,
                productId,
                variantId,
                alertType: 'low_stock',
                currentStock: availableAfter,
                threshold: inventory.minStockLevel,
                message: `Low stock alert: ${inventory.sku} has ${availableAfter} units (min: ${inventory.minStockLevel})`
              }
            });

            await outboxService.lowStock({
              inventoryId: inventory.id,
              productId,
              variantId,
              sku: inventory.sku,
              currentStock: availableAfter,
              minStockLevel: inventory.minStockLevel
            }, tx);

            await outboxService.stockAlertTriggered({
              alertId: alert.id,
              inventoryId: inventory.id,
              productId,
              variantId,
              alertType: 'low_stock',
              currentStock: availableAfter,
              threshold: inventory.minStockLevel,
              message: alert.message
            }, tx);
          } else if (availableAfter <= 0) {
            const alert = await tx.stockAlert.create({
              data: {
                inventoryId: inventory.id,
                productId,
                variantId,
                alertType: 'out_of_stock',
                currentStock: 0,
                threshold: 0,
                message: `Out of stock alert: ${inventory.sku} is now out of stock`
              }
            });

            await outboxService.outOfStock({
              inventoryId: inventory.id,
              productId,
              variantId,
              sku: inventory.sku
            }, tx);

            await outboxService.stockAlertTriggered({
              alertId: alert.id,
              inventoryId: inventory.id,
              productId,
              variantId,
              alertType: 'out_of_stock',
              currentStock: 0,
              threshold: 0,
              message: alert.message
            }, tx);
          }

          return {
            reservation,
            availableAfter
          };
        });

        if (!result) {
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

        console.log(`Reserved ${quantity} units. Remaining: ${result.availableAfter}`);

        return {
          success: true,
          message: `Successfully reserved ${quantity} units`,
          reserved: true,
          reservationId: result.reservation.id,
          quantity,
          availableAfter: result.availableAfter,
          expiresAt
        };
      } catch (error) {
        console.error(`Reservation attempt ${attempt} failed with error:`, error);
        if (attempt === MAX_RETRY_ATTEMPTS) {
          throw error;
        }
        continue;
      }
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

  /**
   * Confirm a reservation: deduct stock and update grosir tolerance.
   * Also auto-unlocks variant if currentExcess drops below threshold.
   */
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

    // Wrap in interactive transaction to handle tolerance updates
    await prisma.$transaction(async (tx: TxClient) => {
      // Confirm reservation and deduct from total stock
      await tx.warehouseInventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { decrement: reservation.quantity },
          reservedQuantity: { decrement: reservation.quantity },
          lastSoldAt: new Date(),
          version: { increment: 1 }
        }
      });

      await tx.stockReservation.update({
        where: { id: reservationId },
        data: {
          status: 'confirmed',
          confirmedAt: new Date()
        }
      });

      await tx.inventoryMovement.create({
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
      });

      // Update grosir tolerance: decrement currentExcess when stock is sold
      const tolerance = await tx.grosirWarehouseTolerance.findFirst({
        where: {
          productId: inventory.productId,
          variantId: inventory.variantId ?? null
        }
      });

      if (tolerance) {
        const newExcess = Math.max(0, (tolerance.currentExcess || 0) - reservation.quantity);

        await tx.grosirWarehouseTolerance.update({
          where: { id: tolerance.id },
          data: {
            currentExcess: newExcess
          }
        });

        // Auto-unlock if previously locked due to overflow and now has room
        if (tolerance.isLocked && newExcess <= tolerance.maxExcessUnits) {
          await tx.grosirWarehouseTolerance.update({
            where: { id: tolerance.id },
            data: {
              isLocked: false,
              lockedAt: null,
              lockedReason: null
            }
          });

          // Emit unlock event
          await outboxService.variantUnlocked({
            productId: inventory.productId,
            variantId: inventory.variantId
          }, tx);
        }
      }

      // Publish confirmed event
      await outboxService.inventoryConfirmed({
        inventoryId: inventory.id,
        productId: inventory.productId,
        variantId: inventory.variantId,
        orderId: reservation.orderId,
        quantity: reservation.quantity,
        reservationId
      }, tx);
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
   * Uses increment operations to avoid concurrency issues from stale reads.
   * Status is computed from cumulative DB state after updates.
   */
  async receivePurchaseOrder(
    id: string,
    items: Array<{ itemId: string; receivedUnits: number; damagedUnits?: number }>
  ) {
    // Validate PO exists (we only need the poNumber for logging, not the item state)
    const poHeader = await prisma.warehousePurchaseOrder.findUnique({
      where: { id },
      select: { id: true, poNumber: true, supplierId: true }
    });

    if (!poHeader) {
      throw new Error('Purchase order not found');
    }

    let totalReceived = 0;
    let totalDamaged = 0;

    // Track inventory updates for outbox events
    const inventoryUpdates: Array<{
      inventoryId: string;
      productId: string;
      variantId: string | null;
      sku: string;
      goodUnits: number;
      newTotal: number;
    }> = [];

    // Wrap all operations in a transaction
    const result = await prisma.$transaction(async (tx: TxClient) => {
      for (const item of items) {
        // Fetch current PO item state INSIDE the transaction
        const poItem = await tx.purchaseOrderItem.findUnique({
          where: { id: item.itemId }
        });

        if (!poItem || poItem.purchaseOrderId !== id) continue;

        // Use increment operations for concurrency safety
        const updatedPoItem = await tx.purchaseOrderItem.update({
          where: { id: item.itemId },
          data: {
            receivedUnits: { increment: item.receivedUnits },
            damagedUnits: { increment: item.damagedUnits || 0 }
          }
        });

        // Update status based on new totals
        await tx.purchaseOrderItem.update({
          where: { id: item.itemId },
          data: {
            status: updatedPoItem.receivedUnits >= poItem.totalUnits ? 'received' : 'partial'
          }
        });

        // Add received units to inventory
        const goodUnits = item.receivedUnits - (item.damagedUnits || 0);
        if (goodUnits > 0) {
          const inventory = await tx.warehouseInventory.findFirst({
            where: {
              productId: poItem.productId,
              variantId: poItem.variantId ?? null
            }
          });

          if (inventory) {
            const updatedInventory = await tx.warehouseInventory.update({
              where: { id: inventory.id },
              data: {
                quantity: { increment: goodUnits },
                availableQuantity: { increment: goodUnits },
                lastRestockedAt: new Date(),
                version: { increment: 1 }
              }
            });

            // Create movement record with current state
            await tx.inventoryMovement.create({
              data: {
                inventoryId: inventory.id,
                movementNumber: `MOV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
                type: 'purchase_order_received',
                quantityBefore: inventory.quantity,
                quantityChange: goodUnits,
                quantityAfter: updatedInventory.quantity,
                referenceType: 'purchase_order',
                referenceId: id,
                purchaseOrderId: id,
                reason: `Received from PO ${poHeader.poNumber}`,
                unitCost: Number(poItem.unitCost)
              }
            });

            // Track for outbox event
            inventoryUpdates.push({
              inventoryId: inventory.id,
              productId: inventory.productId,
              variantId: inventory.variantId,
              sku: inventory.sku,
              goodUnits,
              newTotal: updatedInventory.quantity
            });

            // Update grosir tolerance: increment currentExcess when stock arrives
            const tolerance = await tx.grosirWarehouseTolerance.findFirst({
              where: {
                productId: inventory.productId,
                variantId: inventory.variantId ?? null
              }
            });

            if (tolerance) {
              const newExcess = (tolerance.currentExcess || 0) + goodUnits;

              await tx.grosirWarehouseTolerance.update({
                where: { id: tolerance.id },
                data: {
                  currentExcess: newExcess
                }
              });

              // Auto-lock if currentExcess exceeds maxExcessUnits
              if (!tolerance.isLocked && newExcess > tolerance.maxExcessUnits) {
                await tx.grosirWarehouseTolerance.update({
                  where: { id: tolerance.id },
                  data: {
                    isLocked: true,
                    lockedAt: new Date(),
                    lockedReason: `Excess stock (${newExcess}) exceeds maximum (${tolerance.maxExcessUnits})`
                  }
                });

                // Emit lock event
                await outboxService.variantLocked({
                  productId: inventory.productId,
                  variantId: inventory.variantId,
                  reason: `Excess stock (${newExcess}) exceeds maximum (${tolerance.maxExcessUnits})`,
                  overflowVariants: [tolerance.size || 'default']
                }, tx);
              }
            }

            // Publish restocked event in transaction
            await outboxService.restocked({
              inventoryId: inventory.id,
              productId: inventory.productId,
              variantId: inventory.variantId,
              sku: inventory.sku,
              quantityAdded: goodUnits,
              newTotal: updatedInventory.quantity,
              purchaseOrderId: id
            }, tx);
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
        poItem => poItem.receivedUnits >= poItem.totalUnits
      );
      const anyReceived = updatedItems.some(poItem => poItem.receivedUnits > 0);

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

      // Publish PO received event in transaction
      await outboxService.purchaseOrderReceived({
        purchaseOrderId: id,
        poNumber: poHeader.poNumber,
        supplierId: poHeader.supplierId,
        totalUnitsReceived: totalReceived,
        damagedUnits: totalDamaged
      }, tx);

      return { newStatus, totalReceived, totalDamaged };
    });

    return {
      success: true,
      message: `Received ${result.totalReceived} units (${result.totalDamaged} damaged)`,
      status: result.newStatus,
      totalReceived: result.totalReceived,
      totalDamaged: result.totalDamaged
    };
  }

  // =============================================================================
  // Reservation Expiry Processing
  // =============================================================================

  /**
   * Process expired reservations: release stock and mark as expired.
   * Should be called periodically by a cron job or scheduler.
   */
  async processExpiredReservations(): Promise<{
    processed: number;
    released: number;
    errors: number;
  }> {
    const expiredReservations = await this.repository.findExpiredReservations();

    let processed = 0;
    let released = 0;
    let errors = 0;

    for (const reservation of expiredReservations) {
      try {
        await prisma.$transaction(async (tx: TxClient) => {
          // Release stock back to available
          await tx.warehouseInventory.update({
            where: { id: reservation.inventoryId },
            data: {
              reservedQuantity: { decrement: reservation.quantity },
              availableQuantity: { increment: reservation.quantity },
              version: { increment: 1 }
            }
          });

          // Mark reservation as expired
          await tx.stockReservation.update({
            where: { id: reservation.id },
            data: {
              status: 'expired',
              releasedAt: new Date()
            }
          });

          // Publish release event
          await outboxService.inventoryReleased({
            inventoryId: reservation.inventoryId,
            productId: reservation.inventory.productId,
            variantId: reservation.inventory.variantId,
            orderId: reservation.orderId,
            quantity: reservation.quantity,
            reservationId: reservation.id,
            availableAfter: reservation.inventory.availableQuantity + reservation.quantity,
            reason: 'reservation_expired'
          }, tx);
        });

        released++;
        console.log(`Expired reservation ${reservation.id} released (${reservation.quantity} units)`);
      } catch (error) {
        errors++;
        console.error(`Failed to process expired reservation ${reservation.id}:`, error);
      }

      processed++;
    }

    console.log(`Processed ${processed} expired reservations: ${released} released, ${errors} errors`);

    return { processed, released, errors };
  }
}

export const warehouseService = new WarehouseService();
