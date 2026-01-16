import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { RefundService } from '../services/refund.service';

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
  createPayment = async (req: Request, res: Response) => {
    try {
      const result = await this.paymentService.createPayment(req.body);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get payment by order ID
   */
  getPaymentByOrder = async (req: Request, res: Response) => {
    try {
      const payment = await this.paymentService.getPaymentByOrderId(req.params.orderId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }
      res.json({
        success: true,
        data: payment
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get payment by ID
   */
  getPaymentById = async (req: Request, res: Response) => {
    try {
      const payment = await this.paymentService.getPaymentById(req.params.id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }
      res.json({
        success: true,
        data: payment
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get payments for a user
   */
  getPaymentsByUser = async (req: Request, res: Response) => {
    try {
      const { limit, offset } = req.query;
      const payments = await this.paymentService.getPaymentsByUserId(
        req.params.userId,
        {
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined
        }
      );
      res.json({
        success: true,
        data: payments
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get payments eligible for settlement (admin)
   */
  getEligibleForSettlement = async (req: Request, res: Response) => {
    try {
      const { periodStart, periodEnd } = req.body;
      const payments = await this.paymentService.findEligibleForSettlement(
        new Date(periodStart),
        new Date(periodEnd)
      );
      res.json({
        success: true,
        data: payments
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get payment statistics (admin)
   */
  getPaymentStats = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;
      const stats = await this.paymentService.getPaymentStats(
        new Date(startDate),
        new Date(endDate)
      );
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Create a refund for a payment
   */
  createRefund = async (req: Request, res: Response) => {
    try {
      const refund = await this.refundService.createRefund(req.body);
      res.status(201).json({
        success: true,
        data: refund
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get refund by ID
   */
  getRefundById = async (req: Request, res: Response) => {
    try {
      const refund = await this.refundService.getRefundById(req.params.id);
      if (!refund) {
        return res.status(404).json({
          success: false,
          error: 'Refund not found'
        });
      }
      res.json({
        success: true,
        data: refund
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get refunds for an order
   */
  getRefundsByOrder = async (req: Request, res: Response) => {
    try {
      const refunds = await this.refundService.getRefundsByOrderId(req.params.orderId);
      res.json({
        success: true,
        data: refunds
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
}
