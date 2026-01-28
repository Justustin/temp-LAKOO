/**
 * Trending Computation Job
 * 
 * Periodically computes trending content and hashtags.
 * Runs as cron jobs at different intervals.
 */

import cron from 'node-cron';
import { trendingService } from '../services/trending.service';

/**
 * Start all trending computation cron jobs
 */
export function startTrendingJobs(): void {
  // Compute hourly trending every hour (at minute 0)
  cron.schedule('0 * * * *', async () => {
    console.log('[TrendingJob] Computing hourly trending...');
    try {
      await trendingService.computeTrending('hourly');
      console.log('[TrendingJob] Hourly trending computation completed');
    } catch (error) {
      console.error('[TrendingJob] Error computing hourly trending:', error);
    }
  });

  // Compute daily trending every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[TrendingJob] Computing daily trending...');
    try {
      await trendingService.computeTrending('daily');
      await trendingService.computeTrendingHashtags();
      console.log('[TrendingJob] Daily trending computation completed');
    } catch (error) {
      console.error('[TrendingJob] Error computing daily trending:', error);
    }
  });

  // Compute weekly trending once a day (at midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('[TrendingJob] Computing weekly trending...');
    try {
      await trendingService.computeTrending('weekly');
      console.log('[TrendingJob] Weekly trending computation completed');
    } catch (error) {
      console.error('[TrendingJob] Error computing weekly trending:', error);
    }
  });

  // Compute monthly trending once a day (at 1 AM)
  cron.schedule('0 1 * * *', async () => {
    console.log('[TrendingJob] Computing monthly trending...');
    try {
      await trendingService.computeTrending('monthly');
      console.log('[TrendingJob] Monthly trending computation completed');
    } catch (error) {
      console.error('[TrendingJob] Error computing monthly trending:', error);
    }
  });

  // Clean up old trending data weekly (Sunday at 2 AM)
  cron.schedule('0 2 * * 0', async () => {
    console.log('[TrendingJob] Cleaning up old trending data...');
    try {
      await trendingService.cleanupOldTrending();
      console.log('[TrendingJob] Old trending data cleanup completed');
    } catch (error) {
      console.error('[TrendingJob] Error cleaning up old trending data:', error);
    }
  });

  console.log('[TrendingJob] All trending jobs scheduled successfully');
}
