import { prisma } from '../lib/prisma';
import { MovementType, ReservationStatus, PoStatus } from '@prisma/client';

export class WarehouseRepository {
  // =============================================================================
  // Inventory Operations
  // =============================================================================

  async findInventory(productId: string, variantId: string | null) {
    return prisma.warehouseInventory.findUnique({
      where: {
        productId_variantId: {
          productId,
          variantId: variantId || null
        }
      }
    });
  }

  async findInventoryById(id: string) {
    return prisma.warehouseInventory.findUnique({
      where: { id }
    });
  }

  async findAllInventory(filters?: {
    status?: string;
    lowStock?: boolean;
    productId?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    if (filters?.lowStock) {
      where.availableQuantity = { lte: prisma.warehouseInventory.fields.minStockLevel };
    }

    return prisma.warehouseInventory.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });
  }

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
    const quantity = data.quantity || 0;

    return prisma.warehouseInventory.create({
      data: {
        productId: data.productId,
        variantId: data.variantId || null,
        sku: data.sku,
        quantity,
        availableQuantity: quantity,
        reservedQuantity: 0,
        minStockLevel: data.minStockLevel || 0,
        maxStockLevel: data.maxStockLevel,
        reorderPoint: data.reorderPoint,
        reorderQuantity: data.reorderQuantity,
        location: data.location,
        zone: data.zone
      }
    });
  }

  async updateInventory(
    id: string,
    data: {
      quantity?: number;
      reservedQuantity?: number;
      availableQuantity?: number;
      minStockLevel?: number;
      maxStockLevel?: number;
      location?: string;
      zone?: string;
      lastRestockedAt?: Date;
      lastSoldAt?: Date;
    }
  ) {
    return prisma.warehouseInventory.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 }
      }
    });
  }

  async reserveStock(inventoryId: string, quantity: number) {
    return prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data: {
        reservedQuantity: { increment: quantity },
        availableQuantity: { decrement: quantity },
        version: { increment: 1 }
      }
    });
  }

  async releaseStock(inventoryId: string, quantity: number) {
    return prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data: {
        reservedQuantity: { decrement: quantity },
        availableQuantity: { increment: quantity },
        version: { increment: 1 }
      }
    });
  }

  async deductStock(inventoryId: string, quantity: number) {
    return prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data: {
        quantity: { decrement: quantity },
        reservedQuantity: { decrement: quantity },
        lastSoldAt: new Date(),
        version: { increment: 1 }
      }
    });
  }

  async addStock(inventoryId: string, quantity: number) {
    return prisma.warehouseInventory.update({
      where: { id: inventoryId },
      data: {
        quantity: { increment: quantity },
        availableQuantity: { increment: quantity },
        lastRestockedAt: new Date(),
        version: { increment: 1 }
      }
    });
  }

  // =============================================================================
  // Stock Reservation Operations
  // =============================================================================

  async createReservation(data: {
    inventoryId: string;
    orderId: string;
    orderItemId?: string;
    quantity: number;
    expiresAt: Date;
  }) {
    return prisma.stockReservation.create({
      data: {
        inventoryId: data.inventoryId,
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        quantity: data.quantity,
        status: 'reserved',
        expiresAt: data.expiresAt
      }
    });
  }

  async findReservation(id: string) {
    return prisma.stockReservation.findUnique({
      where: { id },
      include: { inventory: true }
    });
  }

  async findReservationsByOrder(orderId: string) {
    return prisma.stockReservation.findMany({
      where: { orderId },
      include: { inventory: true }
    });
  }

  async findExpiredReservations() {
    return prisma.stockReservation.findMany({
      where: {
        status: 'reserved',
        expiresAt: { lt: new Date() }
      },
      include: { inventory: true }
    });
  }

  async updateReservationStatus(id: string, status: ReservationStatus) {
    const updateData: any = { status };

    if (status === 'confirmed') {
      updateData.confirmedAt = new Date();
    } else if (status === 'released' || status === 'expired') {
      updateData.releasedAt = new Date();
    }

    return prisma.stockReservation.update({
      where: { id },
      data: updateData
    });
  }

  // =============================================================================
  // Inventory Movement Operations
  // =============================================================================

  async createMovement(data: {
    inventoryId: string;
    type: MovementType;
    quantityBefore: number;
    quantityChange: number;
    quantityAfter: number;
    referenceType?: string;
    referenceId?: string;
    orderId?: string;
    purchaseOrderId?: string;
    reason?: string;
    notes?: string;
    unitCost?: number;
    createdBy?: string;
  }) {
    const movementNumber = `MOV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return prisma.inventoryMovement.create({
      data: {
        inventoryId: data.inventoryId,
        movementNumber,
        type: data.type,
        quantityBefore: data.quantityBefore,
        quantityChange: data.quantityChange,
        quantityAfter: data.quantityAfter,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        orderId: data.orderId,
        purchaseOrderId: data.purchaseOrderId,
        reason: data.reason,
        notes: data.notes,
        unitCost: data.unitCost,
        totalCost: data.unitCost ? data.unitCost * Math.abs(data.quantityChange) : undefined,
        createdBy: data.createdBy
      }
    });
  }

  async findMovementsByInventory(inventoryId: string, limit = 50) {
    return prisma.inventoryMovement.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // =============================================================================
  // Grosir Bundle Operations
  // =============================================================================

  async findBundleConfig(productId: string, supplierId?: string) {
    if (supplierId) {
      return prisma.grosirBundleConfig.findUnique({
        where: {
          productId_supplierId: { productId, supplierId }
        }
      });
    }

    return prisma.grosirBundleConfig.findFirst({
      where: { productId, isActive: true }
    });
  }

  async findAllBundleConfigs(productId: string) {
    return prisma.grosirBundleConfig.findMany({
      where: { productId }
    });
  }

  async upsertBundleConfig(data: {
    productId: string;
    supplierId?: string;
    bundleName?: string;
    totalUnits: number;
    sizeBreakdown: Record<string, number>;
    bundleCost: number;
    minBundleOrder?: number;
    createdBy?: string;
  }) {
    const costPerUnit = data.bundleCost / data.totalUnits;

    return prisma.grosirBundleConfig.upsert({
      where: {
        productId_supplierId: {
          productId: data.productId,
          supplierId: data.supplierId || null
        }
      },
      create: {
        productId: data.productId,
        supplierId: data.supplierId,
        bundleName: data.bundleName,
        totalUnits: data.totalUnits,
        sizeBreakdown: data.sizeBreakdown,
        bundleCost: data.bundleCost,
        costPerUnit,
        minBundleOrder: data.minBundleOrder || 1,
        createdBy: data.createdBy
      },
      update: {
        bundleName: data.bundleName,
        totalUnits: data.totalUnits,
        sizeBreakdown: data.sizeBreakdown,
        bundleCost: data.bundleCost,
        costPerUnit,
        minBundleOrder: data.minBundleOrder
      }
    });
  }

  // =============================================================================
  // Grosir Tolerance Operations
  // =============================================================================

  async findTolerance(productId: string, variantId?: string | null) {
    return prisma.grosirWarehouseTolerance.findUnique({
      where: {
        productId_variantId: {
          productId,
          variantId: variantId || null
        }
      }
    });
  }

  async findAllTolerances(productId: string) {
    return prisma.grosirWarehouseTolerance.findMany({
      where: { productId }
    });
  }

  async upsertTolerance(data: {
    productId: string;
    variantId?: string | null;
    size?: string;
    maxExcessUnits: number;
    updatedBy?: string;
  }) {
    return prisma.grosirWarehouseTolerance.upsert({
      where: {
        productId_variantId: {
          productId: data.productId,
          variantId: data.variantId || null
        }
      },
      create: {
        productId: data.productId,
        variantId: data.variantId,
        size: data.size,
        maxExcessUnits: data.maxExcessUnits,
        updatedBy: data.updatedBy
      },
      update: {
        size: data.size,
        maxExcessUnits: data.maxExcessUnits,
        updatedBy: data.updatedBy
      }
    });
  }

  async lockVariant(productId: string, variantId: string | null, reason: string) {
    return prisma.grosirWarehouseTolerance.update({
      where: {
        productId_variantId: { productId, variantId }
      },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: reason
      }
    });
  }

  async unlockVariant(productId: string, variantId: string | null) {
    return prisma.grosirWarehouseTolerance.update({
      where: {
        productId_variantId: { productId, variantId }
      },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedReason: null
      }
    });
  }

  // =============================================================================
  // Purchase Order Operations
  // =============================================================================

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
    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const totalItems = data.items.length;
    const totalUnits = data.items.reduce((sum, item) => sum + (item.bundleQuantity * item.unitsPerBundle), 0);
    const subtotal = data.items.reduce((sum, item) => sum + (item.unitCost * item.bundleQuantity * item.unitsPerBundle), 0);
    const shippingCost = data.shippingCost || 0;
    const totalCost = subtotal + shippingCost;

    return prisma.warehousePurchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        supplierContact: data.supplierContact,
        supplierPhone: data.supplierPhone,
        totalItems,
        totalUnits,
        subtotal,
        shippingCost,
        totalCost,
        notes: data.notes,
        createdBy: data.createdBy,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            bundleQuantity: item.bundleQuantity,
            unitsPerBundle: item.unitsPerBundle,
            totalUnits: item.bundleQuantity * item.unitsPerBundle,
            unitCost: item.unitCost,
            totalCost: item.unitCost * item.bundleQuantity * item.unitsPerBundle
          }))
        }
      },
      include: { items: true }
    });
  }

  async findPurchaseOrder(id: string) {
    return prisma.warehousePurchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });
  }

  async findPurchaseOrderByNumber(poNumber: string) {
    return prisma.warehousePurchaseOrder.findUnique({
      where: { poNumber },
      include: { items: true }
    });
  }

  async findAllPurchaseOrders(filters?: {
    status?: PoStatus;
    supplierId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.orderDate = {};
      if (filters.startDate) where.orderDate.gte = filters.startDate;
      if (filters.endDate) where.orderDate.lte = filters.endDate;
    }

    return prisma.warehousePurchaseOrder.findMany({
      where,
      include: { items: true },
      orderBy: { orderDate: 'desc' }
    });
  }

  async updatePurchaseOrderStatus(id: string, status: PoStatus, updatedBy?: string) {
    const updateData: any = { status };

    if (status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = updatedBy;
    } else if (status === 'received') {
      updateData.receivedDate = new Date();
    }

    return prisma.warehousePurchaseOrder.update({
      where: { id },
      data: updateData,
      include: { items: true }
    });
  }

  async updatePurchaseOrderItemReceived(
    itemId: string,
    receivedUnits: number,
    damagedUnits: number
  ) {
    return prisma.purchaseOrderItem.update({
      where: { id: itemId },
      data: {
        receivedUnits,
        damagedUnits,
        status: 'received'
      }
    });
  }

  // =============================================================================
  // Stock Alert Operations
  // =============================================================================

  async createAlert(data: {
    inventoryId: string;
    productId: string;
    variantId?: string;
    alertType: string;
    currentStock: number;
    threshold: number;
    message: string;
  }) {
    return prisma.stockAlert.create({
      data: {
        inventoryId: data.inventoryId,
        productId: data.productId,
        variantId: data.variantId,
        alertType: data.alertType as any,
        currentStock: data.currentStock,
        threshold: data.threshold,
        message: data.message
      }
    });
  }

  async findActiveAlerts() {
    return prisma.stockAlert.findMany({
      where: { status: 'active' },
      orderBy: { triggeredAt: 'desc' }
    });
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string) {
    return prisma.stockAlert.update({
      where: { id },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy
      }
    });
  }

  async resolveAlert(id: string) {
    return prisma.stockAlert.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date()
      }
    });
  }
}

export const warehouseRepository = new WarehouseRepository();
