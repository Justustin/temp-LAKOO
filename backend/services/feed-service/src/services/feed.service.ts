import { feedRepository } from '../repositories/feed.repository';
import { followRepository, PaginationOptions } from '../repositories/follow.repository';
import { interestService } from './interest.service';
import { trendingService } from './trending.service';
import { contentClient, Post } from '../clients/content.client';

export interface FeedPost extends Post {
  reasons: string[];
  relevanceScore?: number;
}

export interface SuggestedPost {
  postId: string;
  score: number;
}

export class FeedService {
  /**
   * Get user's personalized "For You" feed
   * Combines: following + suggested + trending
   */
  async getForYouFeed(userId: string, options: PaginationOptions): Promise<FeedPost[]> {
    // 1. Get following feed items (60% of feed)
    const followingLimit = Math.floor(options.limit * 0.6);
    const followingItems = await feedRepository.getFollowingFeed(userId, {
      limit: followingLimit,
      offset: options.offset
    });

    // 2. Get suggested posts based on interests (30% of feed)
    const suggestedLimit = Math.floor(options.limit * 0.3);
    const suggestedPosts = await this.getSuggestedPosts(userId, {
      limit: suggestedLimit,
      offset: 0
    });

    // 3. Get trending posts (10% of feed)
    const trendingLimit = Math.floor(options.limit * 0.1);
    const trendingPosts = await trendingService.getTrendingPosts({
      limit: trendingLimit,
      offset: 0
    });

    // 4. Merge and deduplicate
    const postIds = new Set<string>();
    const merged: Array<{ postId: string; reasons: string[]; score?: number }> = [];

    // Add following posts
    for (const item of followingItems) {
      if (!postIds.has(item.postId)) {
        postIds.add(item.postId);
        merged.push({
          postId: item.postId,
          reasons: item.reasons,
          score: item.relevanceScore ? Number(item.relevanceScore) : undefined
        });
      }
    }

    // Add suggested posts
    for (const post of suggestedPosts) {
      if (!postIds.has(post.postId)) {
        postIds.add(post.postId);
        merged.push({
          postId: post.postId,
          reasons: ['suggested'],
          score: post.score
        });
      }
    }

    // Add trending posts
    for (const post of trendingPosts) {
      if (!postIds.has(post.contentId)) {
        postIds.add(post.contentId);
        merged.push({
          postId: post.contentId,
          reasons: ['trending'],
          score: Number(post.score)
        });
      }
    }

    // 5. Get blocked/muted users to filter
    const blockedUsers = await followRepository.getBlockedUsers(userId);
    const mutedUsers = await followRepository.getMutedUsers(userId);
    const filteredUserIds = new Set([...blockedUsers, ...mutedUsers]);

    // 6. Fetch post details from content-service
    const allPostIds = merged.map(m => m.postId);
    const posts = await contentClient.getPosts(allPostIds);

    // 7. Filter out blocked/muted users and combine with reasons
    const postsWithReasons: FeedPost[] = posts
      .filter(post => !filteredUserIds.has(post.userId))
      .map(post => {
        const feedItem = merged.find(m => m.postId === post.id);
        return {
          ...post,
          reasons: feedItem?.reasons || [],
          relevanceScore: feedItem?.score
        };
      });

    // 8. Rank and return
    return this.rankPosts(postsWithReasons);
  }

  /**
   * Get following-only feed
   */
  async getFollowingFeed(userId: string, options: PaginationOptions): Promise<FeedPost[]> {
    const feedItems = await feedRepository.getFollowingFeed(userId, options);

    if (feedItems.length === 0) return [];

    // Fetch post details from content-service
    const postIds = feedItems.map(f => f.postId);
    const posts = await contentClient.getPosts(postIds);

    // Combine posts with feed item metadata
    return posts.map(post => {
      const feedItem = feedItems.find(f => f.postId === post.id);
      return {
        ...post,
        reasons: feedItem?.reasons || ['following'],
        relevanceScore: feedItem?.relevanceScore ? Number(feedItem.relevanceScore) : undefined
      };
    });
  }

  /**
   * Get explore/discover feed (trending + suggested)
   */
  async getExploreFeed(userId: string, options: PaginationOptions): Promise<FeedPost[]> {
    // Mix trending and suggested content
    const trendingPosts = await trendingService.getTrendingPosts({
      limit: Math.floor(options.limit * 0.6),
      offset: options.offset
    });

    const suggestedPosts = await this.getSuggestedPosts(userId, {
      limit: Math.floor(options.limit * 0.4),
      offset: 0
    });

    // Combine and deduplicate
    const postIds = new Set<string>();
    const merged: Array<{ postId: string; reasons: string[]; score?: number }> = [];

    for (const post of trendingPosts) {
      if (!postIds.has(post.contentId)) {
        postIds.add(post.contentId);
        merged.push({
          postId: post.contentId,
          reasons: ['trending'],
          score: Number(post.score)
        });
      }
    }

    for (const post of suggestedPosts) {
      if (!postIds.has(post.postId)) {
        postIds.add(post.postId);
        merged.push({
          postId: post.postId,
          reasons: ['suggested'],
          score: post.score
        });
      }
    }

    // Fetch post details
    const posts = await contentClient.getPosts(merged.map(m => m.postId));

    // Filter blocked/muted users
    const filteredUserIds = await this.getBlockedAndMutedUsers(userId);
    const postsWithReasons: FeedPost[] = posts
      .filter(post => !filteredUserIds.has(post.userId))
      .map(post => {
        const feedItem = merged.find(m => m.postId === post.id);
        return {
          ...post,
          reasons: feedItem?.reasons || [],
          relevanceScore: feedItem?.score
        };
      });

    return this.rankPosts(postsWithReasons);
  }

  /**
   * Get suggested posts based on user interests
   */
  async getSuggestedPosts(userId: string, options: PaginationOptions): Promise<SuggestedPost[]> {
    // 1. Get user interests
    const interests = await interestService.getUserInterests(userId);

    if (interests.length === 0) {
      // No interests yet, return trending
      const trending = await trendingService.getTrendingPosts(options);
      return trending.map(t => ({
        postId: t.contentId,
        score: Number(t.score)
      }));
    }

    // 2. Build query based on interests
    const categoryInterests = interests.filter(i => i.interestType === 'category');
    const hashtagInterests = interests.filter(i => i.interestType === 'hashtag');
    const sellerInterests = interests.filter(i => i.interestType === 'seller');

    // 3. Query content-service for matching posts
    const posts = await contentClient.searchPosts({
      categories: categoryInterests.map(i => i.interestValue),
      hashtags: hashtagInterests.map(i => i.interestValue),
      sellerIds: sellerInterests.map(i => i.interestValue),
      limit: options.limit,
      excludeAuthorIds: [userId] // Don't suggest own posts
    });

    // 4. Calculate relevance scores
    return posts.map(p => ({
      postId: p.id,
      score: this.calculateRelevanceScore(p, interests)
    }));
  }

  /**
   * Calculate relevance score for a post
   */
  calculateRelevanceScore(post: Post, interests: any[]): number {
    let score = 0;

    // Base score from engagement
    score += Math.log10(post.likeCount + 1) * 10;
    score += Math.log10(post.commentCount + 1) * 15;
    score += Math.log10(post.saveCount + 1) * 20;

    // Recency boost (newer = higher)
    const ageHours = (Date.now() - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 100 - ageHours); // Max 100 points for brand new

    // Interest matching
    for (const interest of interests) {
      const interestScore = Number(interest.score);
      
      if (interest.interestType === 'category' && post.categoryId === interest.interestValue) {
        score += interestScore * 50;
      }
      if (interest.interestType === 'hashtag' && post.hashtags?.includes(interest.interestValue)) {
        score += interestScore * 30;
      }
      if (interest.interestType === 'seller' && post.sellerId === interest.interestValue) {
        score += interestScore * 40;
      }
    }

    return score;
  }

  /**
   * Rank posts using combined signals
   */
  rankPosts(posts: FeedPost[]): FeedPost[] {
    // Sort by relevance score descending
    return posts.sort((a, b) => {
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Get blocked and muted users for filtering feeds
   */
  async getBlockedAndMutedUsers(userId: string): Promise<Set<string>> {
    const [blocked, muted] = await Promise.all([
      followRepository.getBlockedUsers(userId),
      followRepository.getMutedUsers(userId)
    ]);

    return new Set([...blocked, ...muted]);
  }

  /**
   * Refresh user's feed (rebuild from scratch)
   */
  async refreshFeed(userId: string): Promise<void> {
    // This would trigger a background job to rebuild the user's feed
    // For now, we just clear expired items
    await feedRepository.cleanupExpired();
  }
}

// Singleton instance
export const feedService = new FeedService();
