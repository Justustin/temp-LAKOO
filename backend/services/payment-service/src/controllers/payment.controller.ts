import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { RefundService } from '../services/refund.service';
import { NotFoundError, BadRequestError } from '../middleware/error-handler';

/**
 * Async handler wrapper - catches errors and passes to error middleware
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export class PaymentController {
  private paymentService: PaymentService;
  private refundService: RefundService;

  constructor() {
    this.paymentService = new PaymentService();
    this.refundService = new RefundService();
  }

  /**
   * Create a new payment for an order
   */
  createPayment = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.paymentService.createPayment(req.body);
    res.status(result.isExisting ? 200 : 201).json({
      success: true,
      data: result
    });
  });

  /**
   * Get payment by order ID
   */
  getPaymentByOrder = asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.orderId;
    if (!orderId) {
      throw new BadRequestError('orderId is required');
    }
    const payment = await this.paymentService.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new NotFoundError('Payment not found for this order');
    }
    res.json({
      success: true,
      data: payment
    });
  });

  /**
   * Get payment by ID
   */
  getPaymentById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id) {
      throw new BadRequestError('id is required');
    }
    const payment = await this.paymentService.getPaymentById(id);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    res.json({
      success: true,
      data: payment
    });
  });

  /**
   * Get payments for a user
   */
  getPaymentsByUser = asyncHandler(async (req: Request, res: Response) => {
    const { limit, offset } = req.query;
    const userId = req.params.userId;
    if (!userId) {
      throw new BadRequestError('userId is required');
    }
    const payments = await this.paymentService.getPaymentsByUserId(
      userId,
      {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      }
    );
    res.json({
      success: true,
      data: payments
    });
  });

  /**
   * Get payments eligible for settlement (admin)
   */
  getEligibleForSettlement = asyncHandler(async (req: Request, res: Response) => {
    const { periodStart, periodEnd } = req.body;
    if (!periodStart || !periodEnd) {
      throw new BadRequestError('periodStart and periodEnd are required');
    }
    const payments = await this.paymentService.findEligibleForSettlement(
      new Date(periodStart),
      new Date(periodEnd)
    );
    res.json({
      success: true,
      data: payments
    });
  });

  /**
   * Get payment statistics (admin)
   */
  getPaymentStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      throw new BadRequestError('startDate and endDate are required');
    }
    const stats = await this.paymentService.getPaymentStats(
      new Date(startDate),
      new Date(endDate)
    );
    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Create a refund for a payment
   */
  createRefund = asyncHandler(async (req: Request, res: Response) => {
    const refund = await this.refundService.createRefund(req.body);
    res.status(201).json({
      success: true,
      data: refund
    });
  });

  /**
   * Get refund by ID
   */
  getRefundById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id) {
      throw new BadRequestError('id is required');
    }
    const refund = await this.refundService.getRefundById(id);
    if (!refund) {
      throw new NotFoundError('Refund not found');
    }
    res.json({
      success: true,
      data: refund
    });
  });

  /**
   * Get refunds for an order
   */
  getRefundsByOrder = asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.orderId;
    if (!orderId) {
      throw new BadRequestError('orderId is required');
    }
    const refunds = await this.refundService.getRefundsByOrderId(orderId);
    res.json({
      success: true,
      data: refunds
    });
  });
}
