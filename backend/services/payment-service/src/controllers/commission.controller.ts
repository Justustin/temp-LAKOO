import { Request, Response } from 'express';
import { CommissionService } from '../services/commission.service';
import { asyncHandler } from '../utils/asyncHandler';
import { CommissionStatus } from '../generated/prisma';

const commissionService = new CommissionService();

/**
 * Commission Controller
 *
 * Handles HTTP requests for commission management
 */

/**
 * Record commission for an order
 * POST /api/commissions
 * @access Internal (called by order-service)
 */
export const recordCommission = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, orderNumber, sellerId, paymentId, orderAmount, commissionRate } = req.body;

  const commission = await commissionService.recordCommission({
    orderId,
    orderNumber,
    sellerId,
    paymentId,
    orderAmount: parseFloat(orderAmount),
    commissionRate: commissionRate ? parseFloat(commissionRate) : undefined
  });

  res.status(201).json({
    success: true,
    data: commission
  });
});

/**
 * Mark order as completed (commission becomes collectible)
 * PUT /api/commissions/order/:orderId/complete
 * @access Internal (called by order-service)
 */
export const markOrderCompleted = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { sellerId, completedAt } = req.body;

  const commission = await commissionService.markOrderCompleted({
    orderId,
    sellerId,
    completedAt: completedAt ? new Date(completedAt) : undefined
  });

  res.json({
    success: true,
    data: commission
  });
});

/**
 * Collect commissions for seller (during settlement)
 * POST /api/commissions/seller/:sellerId/collect
 * @access Internal (called by settlement job)
 */
export const collectCommissions = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.params;
  const { settlementId } = req.body;

  const result = await commissionService.collectCommissions({
    sellerId,
    settlementId
  });

  res.json({
    success: true,
    data: {
      commissions: result.commissions,
      totalAmount: result.totalAmount,
      count: result.commissions.length
    }
  });
});

/**
 * Waive commission for an order
 * PUT /api/commissions/order/:orderId/waive
 * @access Admin only
 */
export const waiveCommission = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { sellerId, reason } = req.body;

  const commission = await commissionService.waiveCommission(orderId, sellerId, reason);

  res.json({
    success: true,
    data: commission,
    message: 'Commission waived successfully'
  });
});

/**
 * Refund commission (when order is refunded)
 * PUT /api/commissions/order/:orderId/refund
 * @access Internal (called by refund service)
 */
export const refundCommission = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { sellerId } = req.body;

  const commission = await commissionService.refundCommission(orderId, sellerId);

  res.json({
    success: true,
    data: commission,
    message: 'Commission refunded successfully'
  });
});

/**
 * Get commission by ID
 * GET /api/commissions/:id
 * @access Internal / Admin
 */
export const getCommissionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const commission = await commissionService.getById(id);

  if (!commission) {
    return res.status(404).json({
      success: false,
      error: 'Commission not found'
    });
  }

  res.json({
    success: true,
    data: commission
  });
});

/**
 * Get commission by ledger number
 * GET /api/commissions/ledger/:ledgerNumber
 * @access Internal / Admin
 */
export const getCommissionByLedgerNumber = asyncHandler(async (req: Request, res: Response) => {
  const { ledgerNumber } = req.params;

  const commission = await commissionService.getByLedgerNumber(ledgerNumber);

  if (!commission) {
    return res.status(404).json({
      success: false,
      error: 'Commission not found'
    });
  }

  res.json({
    success: true,
    data: commission
  });
});

/**
 * Get commissions for a seller
 * GET /api/commissions/seller/:sellerId
 * @access Internal / Seller
 */
export const getSellerCommissions = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  const commissions = await commissionService.getBySellerId(sellerId, {
    status: status as CommissionStatus | undefined,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  });

  res.json({
    success: true,
    data: commissions,
    pagination: {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      count: commissions.length
    }
  });
});

/**
 * Get commissions for an order
 * GET /api/commissions/order/:orderId
 * @access Internal
 */
export const getOrderCommissions = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  const commissions = await commissionService.getByOrderId(orderId);

  res.json({
    success: true,
    data: commissions
  });
});

/**
 * Get commission statistics for a seller
 * GET /api/commissions/seller/:sellerId/stats
 * @access Internal / Seller
 */
export const getSellerStats = asyncHandler(async (req: Request, res: Response) => {
  const { sellerId } = req.params;

  const stats = await commissionService.getSellerStats(sellerId);

  res.json({
    success: true,
    data: stats
  });
});

/**
 * Calculate net payout after commission
 * POST /api/commissions/calculate-payout
 * @access Internal
 */
export const calculateNetPayout = asyncHandler(async (req: Request, res: Response) => {
  const { grossAmount, commissionAmount } = req.body;

  const netPayout = commissionService.calculateNetPayout(
    parseFloat(grossAmount),
    parseFloat(commissionAmount)
  );

  res.json({
    success: true,
    data: {
      grossAmount: parseFloat(grossAmount),
      commissionAmount: parseFloat(commissionAmount),
      netPayout
    }
  });
});
