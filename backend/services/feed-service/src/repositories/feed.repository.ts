import { prisma } from '../lib/prisma';
import { FeedItem, FeedType } from '../generated/prisma';
import { PaginationOptions } from './follow.repository';

export interface AddToFeedData {
  userId: string;
  postId: string;
  authorId: string;
  feedType: FeedType;
  postCreatedAt: Date;
  reasons: string[];
  relevanceScore?: number;
}

export class FeedRepository {
  /**
   * Get user's following feed (pre-computed)
   */
  async getFollowingFeed(userId: string, options: PaginationOptions): Promise<FeedItem[]> {
    return prisma.feedItem.findMany({
      where: {
        userId,
        feedType: 'following',
        expiresAt: { gt: new Date() }
      },
      orderBy: { postCreatedAt: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }

  /**
   * Get feed items by type
   */
  async getFeedByType(
    userId: string,
    feedType: FeedType,
    options: PaginationOptions
  ): Promise<FeedItem[]> {
    return prisma.feedItem.findMany({
      where: {
        userId,
        feedType,
        expiresAt: { gt: new Date() }
      },
      orderBy: { relevanceScore: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }

  /**
   * Add item to user's feed
   */
  async addToFeed(data: AddToFeedData): Promise<FeedItem> {
    const maxAgeDays = parseInt(process.env.FEED_MAX_AGE_DAYS || '30');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + maxAgeDays);

    return prisma.feedItem.upsert({
      where: {
        userId_postId_feedType: {
          userId: data.userId,
          postId: data.postId,
          feedType: data.feedType
        }
      },
      create: {
        userId: data.userId,
        postId: data.postId,
        authorId: data.authorId,
        feedType: data.feedType,
        postCreatedAt: data.postCreatedAt,
        reasons: data.reasons,
        relevanceScore: data.relevanceScore,
        expiresAt
      },
      update: {
        relevanceScore: data.relevanceScore,
        reasons: data.reasons,
        expiresAt
      }
    });
  }

  /**
   * Fan out post to all followers
   * Used when a user creates a new post
   */
  async fanOutToFollowers(
    authorId: string,
    postId: string,
    postCreatedAt: Date
  ): Promise<number> {
    // Get all active followers
    const followers = await prisma.userFollow.findMany({
      where: {
        followingId: authorId,
        status: 'active'
      },
      select: { followerId: true }
    });

    if (followers.length === 0) return 0;

    const maxAgeDays = parseInt(process.env.FEED_MAX_AGE_DAYS || '30');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + maxAgeDays);

    // Batch insert feed items
    const feedItems = followers.map(f => ({
      userId: f.followerId,
      postId,
      authorId,
      feedType: 'following' as const,
      postCreatedAt,
      reasons: ['following'],
      expiresAt
    }));

    // Use createMany for efficient batch insert
    await prisma.feedItem.createMany({
      data: feedItems,
      skipDuplicates: true
    });

    return followers.length;
  }

  /**
   * Remove post from all feeds (when post is deleted)
   */
  async removeFromAllFeeds(postId: string): Promise<void> {
    await prisma.feedItem.deleteMany({
      where: { postId }
    });
  }

  /**
   * Remove post from a specific user's feed
   */
  async removeFromUserFeed(userId: string, postId: string): Promise<void> {
    await prisma.feedItem.deleteMany({
      where: {
        userId,
        postId
      }
    });
  }

  /**
   * Clean up expired feed items
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.feedItem.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    return result.count;
  }

  /**
   * Clean up old feed items (beyond retention period)
   */
  async cleanupOld(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.feedItem.deleteMany({
      where: {
        postCreatedAt: { lt: cutoffDate }
      }
    });
    return result.count;
  }

  /**
   * Get feed item count for a user
   */
  async getFeedCount(userId: string, feedType?: FeedType): Promise<number> {
    return prisma.feedItem.count({
      where: {
        userId,
        ...(feedType && { feedType }),
        expiresAt: { gt: new Date() }
      }
    });
  }

  /**
   * Remove all feed items from/to blocked users
   */
  async removeBlockedUserFeeds(userId: string, blockedUserId: string): Promise<void> {
    await prisma.$transaction([
      // Remove blocked user's posts from user's feed
      prisma.feedItem.deleteMany({
        where: {
          userId,
          authorId: blockedUserId
        }
      }),
      // Remove user's posts from blocked user's feed
      prisma.feedItem.deleteMany({
        where: {
          userId: blockedUserId,
          authorId: userId
        }
      })
    ]);
  }

  /**
   * Bulk add trending posts to user feeds
   */
  async addTrendingToFeeds(
    userIds: string[],
    postId: string,
    authorId: string,
    postCreatedAt: Date,
    relevanceScore: number
  ): Promise<void> {
    if (userIds.length === 0) return;

    const maxAgeDays = parseInt(process.env.FEED_MAX_AGE_DAYS || '30');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + maxAgeDays);

    const feedItems = userIds.map(userId => ({
      userId,
      postId,
      authorId,
      feedType: 'trending' as const,
      postCreatedAt,
      reasons: ['trending'],
      relevanceScore,
      expiresAt
    }));

    await prisma.feedItem.createMany({
      data: feedItems,
      skipDuplicates: true
    });
  }
}

// Singleton instance
export const feedRepository = new FeedRepository();
