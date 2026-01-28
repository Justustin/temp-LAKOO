import { prisma } from '../lib/prisma';
import { TrendingContent, TrendingHashtag, TrendingWindow } from '../generated/prisma';
import { contentClient, EngagementData } from '../clients/content.client';
import { PaginationOptions } from '../repositories/follow.repository';

export class TrendingService {
  /**
   * Get trending posts
   */
  async getTrendingPosts(options: PaginationOptions & { window?: TrendingWindow }): Promise<TrendingContent[]> {
    const windowType = options.window || 'daily';

    return prisma.trendingContent.findMany({
      where: {
        contentType: 'post',
        windowType,
        windowEnd: { gt: new Date() }
      },
      orderBy: { score: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags(limit: number = 20): Promise<TrendingHashtag[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.trendingHashtag.findMany({
      where: {
        windowType: 'daily',
        windowDate: today
      },
      orderBy: { rank: 'asc' },
      take: limit
    });
  }

  /**
   * Compute trending content (run as background job)
   */
  async computeTrending(windowType: TrendingWindow = 'daily'): Promise<void> {
    const now = new Date();
    let windowStart: Date;

    switch (windowType) {
      case 'hourly':
        windowStart = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    console.log(`[Trending] Computing ${windowType} trending from ${windowStart} to ${now}`);

    // 1. Get engagement data from content-service
    const engagementData = await contentClient.getEngagementStats(windowStart, now);
    
    if (engagementData.length === 0) {
      console.log('[Trending] No engagement data found');
      return;
    }

    // 2. Calculate trending scores
    const scores = engagementData.map(item => ({
      contentType: 'post',
      contentId: item.postId,
      score: this.calculateTrendingScore(item),
      windowType,
      windowStart,
      windowEnd: now,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      shareCount: item.shareCount
    }));

    // 3. Sort and rank
    scores.sort((a, b) => Number(b.score) - Number(a.score));
    
    // 4. Upsert trending content (top 100)
    const topScores = scores.slice(0, 100);
    for (let i = 0; i < topScores.length; i++) {
      const item = topScores[i];
      if (!item) continue;
      
      await prisma.trendingContent.upsert({
        where: {
          contentType_contentId_windowType_windowStart: {
            contentType: item.contentType,
            contentId: item.contentId,
            windowType: item.windowType,
            windowStart: item.windowStart
          }
        },
        create: {
          ...item,
          rank: i + 1
        },
        update: {
          score: item.score,
          rank: i + 1,
          viewCount: item.viewCount,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          shareCount: item.shareCount,
          windowEnd: item.windowEnd
        }
      });
    }

    console.log(`[Trending] Computed ${windowType} trending: ${topScores.length} items`);
  }

  /**
   * Calculate trending score using engagement velocity
   */
  calculateTrendingScore(item: EngagementData): number {
    // Weighted engagement
    const engagement =
      item.viewCount * 1 +
      item.likeCount * 5 +
      item.commentCount * 10 +
      item.shareCount * 15 +
      item.saveCount * 8;

    // Time decay (newer content gets boost)
    const ageHours = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
    const timeFactor = Math.pow(0.95, ageHours / 24); // Decay by 5% per day

    // Velocity (engagement per hour)
    const velocity = engagement / Math.max(1, ageHours);

    // Final score: weighted combination of total engagement and velocity
    return (engagement * 0.4 + velocity * 100 * 0.6) * timeFactor;
  }

  /**
   * Compute trending hashtags
   */
  async computeTrendingHashtags(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`[Trending] Computing trending hashtags for ${today.toDateString()}`);

    // Get hashtag usage stats from content-service
    const hashtagStats = await contentClient.getHashtagStats();

    if (hashtagStats.length === 0) {
      console.log('[Trending] No hashtag stats found');
      return;
    }

    // Calculate scores and rank (boost recent usage)
    const scored = hashtagStats
      .map(h => ({
        hashtag: h.tag,
        score: h.postCount * 10 + h.recentPostCount * 50,
        postCount: h.postCount
      }))
      .sort((a, b) => b.score - a.score);

    // Upsert trending hashtags (top 50)
    const topHashtags = scored.slice(0, 50);
    for (let i = 0; i < topHashtags.length; i++) {
      const item = topHashtags[i];
      if (!item) continue;

      await prisma.trendingHashtag.upsert({
        where: {
          hashtag_windowType_windowDate: {
            hashtag: item.hashtag,
            windowType: 'daily',
            windowDate: today
          }
        },
        create: {
          hashtag: item.hashtag,
          score: item.score,
          postCount: item.postCount,
          windowType: 'daily',
          windowDate: today,
          rank: i + 1
        },
        update: {
          score: item.score,
          postCount: item.postCount,
          rank: i + 1
        }
      });
    }

    console.log(`[Trending] Computed trending hashtags: ${topHashtags.length} items`);
  }

  /**
   * Clean up old trending data
   */
  async cleanupOldTrending(retentionDays: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [contentDeleted, hashtagDeleted] = await Promise.all([
      prisma.trendingContent.deleteMany({
        where: {
          windowEnd: { lt: cutoffDate }
        }
      }),
      prisma.trendingHashtag.deleteMany({
        where: {
          windowDate: { lt: cutoffDate }
        }
      })
    ]);

    console.log(`[Trending] Cleaned up: ${contentDeleted.count} content items, ${hashtagDeleted.count} hashtags`);
  }
}

// Singleton instance
export const trendingService = new TrendingService();
