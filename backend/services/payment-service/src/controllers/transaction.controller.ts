import { Request, Response } from 'express';
import { TransactionLedgerService } from '../services/transaction-ledger.service';

export class TransactionController {
  private transactionService: TransactionLedgerService;

  constructor() {
    this.transactionService = new TransactionLedgerService();
  }

  /**
   * Get transaction history for an order
   * GET /api/transactions/order/:orderId
   */
  getOrderTransactionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      if (!orderId) {
        res.status(400).json({ success: false, error: 'orderId is required' });
        return;
      }

      const transactions = await this.transactionService.getOrderTransactionHistory(orderId);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Error fetching order transaction history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transaction history'
      });
    }
  };

  /**
   * Get transaction history for a payment
   * GET /api/transactions/payment/:paymentId
   */
  getPaymentTransactionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      if (!paymentId) {
        res.status(400).json({ success: false, error: 'paymentId is required' });
        return;
      }

      const transactions = await this.transactionService.getPaymentTransactionHistory(paymentId);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Error fetching payment transaction history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transaction history'
      });
    }
  };

  /**
   * Get factory transaction summary
   * GET /api/transactions/factory/:factoryId/summary
   */
  getFactoryTransactionSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { factoryId } = req.params;
      const { startDate, endDate } = req.query;

      if (!factoryId) {
        res.status(400).json({ success: false, error: 'factoryId is required' });
        return;
      }

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
        return;
      }

      const summary = await this.transactionService.getFactoryTransactionSummary(
        factoryId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching factory transaction summary:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transaction summary'
      });
    }
  };

  /**
   * Get transaction summary for a period
   * GET /api/transactions/summary
   */
  getTransactionSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
        return;
      }

      const summary = await this.transactionService.getTransactionSummary(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching transaction summary:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transaction summary'
      });
    }
  };

  /**
   * Get recent transactions
   * GET /api/transactions/recent
   */
  getRecentTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const transactions = await this.transactionService.getRecentTransactions(limit, offset);

      res.json({
        success: true,
        data: transactions,
        pagination: {
          limit,
          offset
        }
      });
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recent transactions'
      });
    }
  };

  /**
   * Find transaction by code
   * GET /api/transactions/:transactionCode
   */
  findByCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionCode } = req.params;
      if (!transactionCode) {
        res.status(400).json({ success: false, error: 'transactionCode is required' });
        return;
      }

      const transaction = await this.transactionService.findByCode(transactionCode);

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
        return;
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      console.error('Error finding transaction:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find transaction'
      });
    }
  };
}
