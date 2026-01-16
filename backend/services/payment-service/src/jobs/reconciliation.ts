/**
 * Daily Reconciliation Job
 * Reconciles payment records with gateway data
 */

import { prisma } from '../lib/prisma';

interface ReconciliationResult {
  date: Date;
  totalPayments: number;
  totalAmount: number;
  totalRefunds: number;
  refundAmount: number;
  discrepancies: Array<{
    paymentId: string;
    issue: string;
    localAmount: number;
    gatewayAmount?: number;
  }>;
  isReconciled: boolean;
}

export async function dailyReconciliationJob(options?: {
  date?: Date;
  dryRun?: boolean;
}): Promise<ReconciliationResult> {
  console.log('[ReconciliationJob] Starting...');
  const startTime = Date.now();

  const reconciliationDate = options?.date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday by default
  const startOfDay = new Date(reconciliationDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(reconciliationDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // Get all payments for the day
    const payments = await prisma.payment.findMany({
      where: {
        paidAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        gatewayFee: true,
        status: true,
        gatewayTransactionId: true,
        gatewayResponse: true
      }
    });

    // Get all refunds for the day
    const refunds = await prisma.refund.findMany({
      where: {
        completedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        refundNumber: true,
        amount: true,
        status: true,
        gatewayRefundId: true
      }
    });

    const discrepancies: ReconciliationResult['discrepancies'] = [];

    // Check each payment for discrepancies
    for (const payment of payments) {
      const gatewayData = payment.gatewayResponse as any;

      // Check if gateway amount matches local amount
      if (gatewayData?.amount && Number(gatewayData.amount) !== Number(payment.amount)) {
        discrepancies.push({
          paymentId: payment.id,
          issue: 'Amount mismatch between local and gateway records',
          localAmount: Number(payment.amount),
          gatewayAmount: Number(gatewayData.amount)
        });
      }

      // Check for missing gateway transaction ID
      if (payment.status === 'paid' && !payment.gatewayTransactionId) {
        discrepancies.push({
          paymentId: payment.id,
          issue: 'Paid payment missing gateway transaction ID',
          localAmount: Number(payment.amount)
        });
      }
    }

    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRefunds = refunds.length;
    const refundAmount = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const isReconciled = discrepancies.length === 0;

    // Create reconciliation record if not dry run
    if (!options?.dryRun) {
      await prisma.settlementRecord.create({
        data: {
          settlementDate: reconciliationDate,
          paymentGateway: 'xendit',
          totalPayments,
          totalAmount,
          totalFees: payments.reduce((sum, p) => sum + Number(p.gatewayFee), 0),
          netAmount: totalAmount - payments.reduce((sum, p) => sum + Number(p.gatewayFee), 0),
          totalRefunds,
          refundAmount,
          isReconciled,
          reconciledAt: isReconciled ? new Date() : null,
          notes: discrepancies.length > 0
            ? `Found ${discrepancies.length} discrepancies`
            : 'Reconciliation completed successfully'
        }
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[ReconciliationJob] Completed in ${duration}ms.`);
    console.log(`[ReconciliationJob] Payments: ${totalPayments}, Amount: ${totalAmount}`);
    console.log(`[ReconciliationJob] Refunds: ${totalRefunds}, Amount: ${refundAmount}`);
    console.log(`[ReconciliationJob] Discrepancies: ${discrepancies.length}`);

    return {
      date: reconciliationDate,
      totalPayments,
      totalAmount,
      totalRefunds,
      refundAmount,
      discrepancies,
      isReconciled
    };
  } catch (error) {
    console.error('[ReconciliationJob] Error:', error);
    throw error;
  }
}

// Run as standalone script
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dateArg = args.find(a => a.startsWith('--date='));
  const date = dateArg ? new Date(dateArg.split('=')[1]!) : undefined;

  dailyReconciliationJob({ date, dryRun })
    .then(result => {
      console.log('Job completed:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}
