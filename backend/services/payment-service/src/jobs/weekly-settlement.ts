/**
 * Weekly Settlement Job
 * Processes settlements for factories based on completed payments
 */

import { prisma } from '../lib/prisma';

interface SettlementSummary {
  factoryId: string;
  totalAmount: number;
  paymentCount: number;
  totalFees: number;
  netAmount: number;
}

export async function weeklySettlementJob(options?: {
  periodStart?: Date;
  periodEnd?: Date;
  dryRun?: boolean;
}): Promise<{
  settlements: SettlementSummary[];
  processedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}> {
  console.log('[WeeklySettlementJob] Starting...');
  const startTime = Date.now();

  // Default to last 7 days if not specified
  const periodEnd = options?.periodEnd || new Date();
  const periodStart = options?.periodStart || new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Find all paid payments that haven't been settled
    const eligiblePayments = await prisma.payment.findMany({
      where: {
        status: 'paid',
        paidAt: {
          gte: periodStart,
          lt: periodEnd
        }
      },
      select: {
        id: true,
        amount: true,
        gatewayFee: true,
        netAmount: true,
        orderId: true,
        metadata: true
      }
    });

    if (eligiblePayments.length === 0) {
      console.log('[WeeklySettlementJob] No eligible payments found for settlement.');
      return {
        settlements: [],
        processedAt: new Date(),
        periodStart,
        periodEnd
      };
    }

    // Group payments by factory (from metadata or order)
    const factoryPayments = new Map<string, typeof eligiblePayments>();

    for (const payment of eligiblePayments) {
      const factoryId = (payment.metadata as any)?.factoryId || 'unknown';
      if (!factoryPayments.has(factoryId)) {
        factoryPayments.set(factoryId, []);
      }
      factoryPayments.get(factoryId)!.push(payment);
    }

    const settlements: SettlementSummary[] = [];

    for (const [factoryId, payments] of factoryPayments) {
      const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalFees = payments.reduce((sum, p) => sum + Number(p.gatewayFee), 0);
      const netAmount = totalAmount - totalFees;

      settlements.push({
        factoryId,
        totalAmount,
        paymentCount: payments.length,
        totalFees,
        netAmount
      });

      if (!options?.dryRun) {
        // Create settlement record
        await prisma.settlementRecord.create({
          data: {
            settlementDate: new Date(),
            paymentGateway: 'xendit',
            totalPayments: payments.length,
            totalAmount,
            totalFees,
            netAmount,
            totalRefunds: 0,
            refundAmount: 0,
            notes: `Weekly settlement for factory ${factoryId} (${periodStart.toISOString()} - ${periodEnd.toISOString()})`
          }
        });

        // Publish settlement event to outbox for other services
        await prisma.serviceOutbox.create({
          data: {
            aggregateType: 'Settlement',
            aggregateId: factoryId,
            eventType: 'settlement.completed',
            payload: {
              factoryId,
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
              totalPayments: payments.length,
              totalAmount,
              totalFees,
              netAmount,
              paymentIds: payments.map(p => p.id)
            }
          }
        });
      }

      console.log(`[WeeklySettlementJob] Factory ${factoryId}: ${payments.length} payments, net amount: ${netAmount}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[WeeklySettlementJob] Completed in ${duration}ms. Processed ${settlements.length} factory settlements.`);

    return {
      settlements,
      processedAt: new Date(),
      periodStart,
      periodEnd
    };
  } catch (error) {
    console.error('[WeeklySettlementJob] Error:', error);
    throw error;
  }
}

// Run as standalone script
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  weeklySettlementJob({ dryRun })
    .then(result => {
      console.log('Job completed:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}
