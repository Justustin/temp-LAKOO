/**
 * Cleanup Job
 * 
 * Periodically cleans up expired and old data.
 * Runs as cron jobs at different intervals.
 */

import cron from 'node-cron';
import { feedRepository } from '../repositories/feed.repository';
import { interestService } from '../services/interest.service';

/**
 * Start all cleanup cron jobs
 */
export function startCleanupJobs(): void {
  // Clean expired feed items daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[CleanupJob] Cleaning up expired feed items...');
    try {
      const count = await feedRepository.cleanupExpired();
      console.log(`[CleanupJob] Cleaned up ${count} expired feed items`);
    } catch (error) {
      console.error('[CleanupJob] Error cleaning up expired feed items:', error);
    }
  });

  // Clean old feed items weekly (Sunday at 4 AM)
  cron.schedule('0 4 * * 0', async () => {
    console.log('[CleanupJob] Cleaning up old feed items...');
    try {
      const maxAgeDays = parseInt(process.env.FEED_MAX_AGE_DAYS || '30');
      const count = await feedRepository.cleanupOld(maxAgeDays);
      console.log(`[CleanupJob] Cleaned up ${count} old feed items`);
    } catch (error) {
      console.error('[CleanupJob] Error cleaning up old feed items:', error);
    }
  });

  // Decay interest scores weekly (Sunday at 5 AM)
  cron.schedule('0 5 * * 0', async () => {
    console.log('[CleanupJob] Decaying interest scores...');
    try {
      await interestService.decayInterests();
      console.log('[CleanupJob] Interest scores decayed successfully');
    } catch (error) {
      console.error('[CleanupJob] Error decaying interest scores:', error);
    }
  });

  console.log('[CleanupJob] All cleanup jobs scheduled successfully');
}
