import { Request, Response } from 'express';
import { WarehouseService, warehouseService } from '../services/warehouse.service';
import { asyncHandler } from '../utils/asyncHandler';

export class WarehouseController {
  private service: WarehouseService;

  constructor() {
    this.service = warehouseService;
  }

  // =============================================================================
  // Inventory Status
  // =============================================================================

  getInventoryStatus = asyncHandler(async (req: Request, res: Response) => {
    const { productId, variantId } = req.query;

    const result = await this.service.getInventoryStatus(
      productId as string,
      (variantId as string) || null
    );

    res.json({ success: true, data: result });
  });

  getAllInventory = asyncHandler(async (req: Request, res: Response) => {
    const { status, lowStock, productId } = req.query;

    const result = await this.service.getAllInventory({
      status: status as string,
      lowStock: lowStock === 'true',
      productId: productId as string
    });

    res.json({ success: true, data: result });
  });

  // =============================================================================
  // Stock Reservations
  // =============================================================================

  reserveInventory = asyncHandler(async (req: Request, res: Response) => {
    const { productId, variantId, quantity, orderId, orderItemId } = req.body;

    const result = await this.service.reserveInventory({
      productId,
      variantId: variantId || null,
      quantity,
      orderId,
      orderItemId
    });

    res.json({ success: true, ...result });
  });

  releaseReservation = asyncHandler(async (req: Request, res: Response) => {
    const { reservationId } = req.body;
    const { reason } = req.body;

    const result = await this.service.releaseReservation(reservationId, reason);

    res.json({ success: true, ...result });
  });

  confirmReservation = asyncHandler(async (req: Request, res: Response) => {
    const { reservationId } = req.body;

    const result = await this.service.confirmReservation(reservationId);

    res.json({ success: true, ...result });
  });

  // =============================================================================
  // Bundle/Grosir Checking
  // =============================================================================

  checkBundleOverflow = asyncHandler(async (req: Request, res: Response) => {
    const { productId, variantId } = req.query;

    const result = await this.service.checkBundleOverflow(
      productId as string,
      (variantId as string) || null
    );

    res.json({ success: true, data: result });
  });

  checkAllVariantsOverflow = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.query;

    const result = await this.service.checkAllVariantsOverflow(productId as string);

    res.json({ success: true, data: result });
  });

  // =============================================================================
  // Admin: Inventory Management
  // =============================================================================

  createInventory = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.createInventory(req.body);

    res.status(201).json({ success: true, data: result });
  });

  adjustInventory = asyncHandler(async (req: Request, res: Response) => {
    const { productId, variantId, quantityChange, reason, notes } = req.body;

    const result = await this.service.adjustInventory({
      productId,
      variantId: variantId || null,
      quantityChange,
      reason,
      notes,
      createdBy: req.user?.id
    });

    res.json({ success: true, ...result });
  });

  getMovementHistory = asyncHandler(async (req: Request, res: Response) => {
    const { productId, variantId } = req.query;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await this.service.getMovementHistory(
      productId as string,
      (variantId as string) || null,
      limit
    );

    res.json({ success: true, data: result });
  });

  // =============================================================================
  // Admin: Bundle Configuration
  // =============================================================================

  updateBundleConfig = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.updateBundleConfig({
      ...req.body,
      createdBy: req.user?.id
    });

    res.json({ success: true, data: result });
  });

  updateTolerance = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.updateTolerance({
      ...req.body,
      updatedBy: req.user?.id
    });

    res.json({ success: true, data: result });
  });

  // =============================================================================
  // Stock Alerts
  // =============================================================================

  getActiveAlerts = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.getActiveAlerts();

    res.json({ success: true, data: result });
  });

  acknowledgeAlert = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.service.acknowledgeAlert(id, req.user!.id);

    res.json({ success: true, data: result });
  });

  resolveAlert = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.service.resolveAlert(id);

    res.json({ success: true, data: result });
  });

  // =============================================================================
  // Purchase Orders
  // =============================================================================

  getPurchaseOrders = asyncHandler(async (req: Request, res: Response) => {
    const { status, supplierId, startDate, endDate } = req.query;

    const result = await this.service.getPurchaseOrders({
      status: status as string,
      supplierId: supplierId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json({ success: true, data: result });
  });

  getPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.service.getPurchaseOrder(id);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Purchase order not found' });
    }

    res.json({ success: true, data: result });
  });

  createPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.createPurchaseOrder({
      ...req.body,
      createdBy: req.user?.id
    });

    res.status(201).json({ success: true, data: result });
  });

  updatePurchaseOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const result = await this.service.updatePurchaseOrderStatus(id, status, req.user?.id);

    res.json({ success: true, data: result });
  });

  receivePurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { items } = req.body;

    const result = await this.service.receivePurchaseOrder(id, items);

    res.json({ success: true, ...result });
  });
}

export const warehouseController = new WarehouseController();
