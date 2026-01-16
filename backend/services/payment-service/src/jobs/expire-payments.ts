/**
 * Expire Payments Job
 * Runs periodically to mark expired pending payments
 */

import { prisma } from '../lib/prisma';

export async function expirePaymentsJob(): Promise<{
  expiredCount: number;
  processedAt: Date;
}> {
  console.log('[ExpirePaymentsJob] Starting...');
  const startTime = Date.now();

  try {
    // Find and update all expired pending payments
    const result = await prisma.payment.updateMany({
      where: {
        status: 'pending',
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: 'expired',
        updatedAt: new Date()
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[ExpirePaymentsJob] Completed in ${duration}ms. Expired ${result.count} payments.`);

    return {
      expiredCount: result.count,
      processedAt: new Date()
    };
  } catch (error) {
    console.error('[ExpirePaymentsJob] Error:', error);
    throw error;
  }
}

// Run as standalone script
if (require.main === module) {
  expirePaymentsJob()
    .then(result => {
      console.log('Job completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}
