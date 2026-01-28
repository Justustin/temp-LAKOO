import { followRepository, PaginationOptions } from '../repositories/follow.repository';
import { outboxService } from './outbox.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../middleware/error-handler';
import { UserFollow, UserFollowStats } from '../generated/prisma';

export interface FollowListItem {
  userId: string;
  followedAt: Date;
}

export interface FollowStatsResponse {
  userId: string;
  followerCount: number;
  followingCount: number;
}

export class FollowService {
  /**
   * Follow a user
   */
  async follow(followerId: string, followingId: string): Promise<UserFollow> {
    // Can't follow yourself
    if (followerId === followingId) {
      throw new BadRequestError('Cannot follow yourself');
    }

    // Check if already following
    const existing = await followRepository.isFollowing(followerId, followingId);
    if (existing) {
      throw new BadRequestError('Already following this user');
    }

    // Check if blocked
    const blocked = await followRepository.isBlocked(followerId, followingId);
    if (blocked) {
      throw new ForbiddenError('Cannot follow this user');
    }

    // Create follow
    const follow = await followRepository.follow(followerId, followingId);

    // Publish event
    await outboxService.userFollowed(follow);

    return follow;
  }

  /**
   * Unfollow a user
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    // Check if following
    const existing = await followRepository.isFollowing(followerId, followingId);
    if (!existing) {
      throw new BadRequestError('Not following this user');
    }

    await followRepository.unfollow(followerId, followingId);

    // Publish event
    await outboxService.userUnfollowed({
      id: `${followerId}-${followingId}`,
      followerId,
      followingId
    });
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, options: PaginationOptions): Promise<FollowListItem[]> {
    const follows = await followRepository.getFollowers(userId, options);
    return follows.map(f => ({
      userId: f.followerId,
      followedAt: f.createdAt
    }));
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, options: PaginationOptions): Promise<FollowListItem[]> {
    const follows = await followRepository.getFollowing(userId, options);
    return follows.map(f => ({
      userId: f.followingId,
      followedAt: f.createdAt
    }));
  }

  /**
   * Check if following
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return followRepository.isFollowing(followerId, followingId);
  }

  /**
   * Get follow stats for a user
   */
  async getStats(userId: string): Promise<FollowStatsResponse> {
    const stats = await followRepository.getStats(userId);
    
    if (!stats) {
      // Return default stats if user doesn't have any
      return {
        userId,
        followerCount: 0,
        followingCount: 0
      };
    }

    return {
      userId: stats.userId,
      followerCount: stats.followerCount,
      followingCount: stats.followingCount
    };
  }

  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<void> {
    // Can't block yourself
    if (blockerId === blockedId) {
      throw new BadRequestError('Cannot block yourself');
    }

    await followRepository.blockUser(blockerId, blockedId, reason);

    // Publish event
    await outboxService.userBlocked({
      id: `${blockerId}-${blockedId}`,
      blockerId,
      blockedId,
      reason: reason || null,
      createdAt: new Date()
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await followRepository.unblockUser(blockerId, blockedId);

    // Publish event
    await outboxService.userUnblocked({
      blockerId,
      blockedId
    });
  }

  /**
   * Mute a user
   */
  async muteUser(
    muterId: string,
    mutedId: string,
    options: {
      mutePosts?: boolean;
      muteComments?: boolean;
      duration?: string;
    }
  ): Promise<void> {
    // Can't mute yourself
    if (muterId === mutedId) {
      throw new BadRequestError('Cannot mute yourself');
    }

    await followRepository.muteUser(muterId, mutedId, options);

    // Calculate expiresAt for event
    let expiresAt: Date | null = null;
    if (options.duration && options.duration !== 'forever') {
      const now = new Date();
      switch (options.duration) {
        case '1h':
          expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '24h':
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case '7d':
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Publish event
    await outboxService.userMuted({
      id: `${muterId}-${mutedId}`,
      muterId,
      mutedId,
      mutePosts: options.mutePosts ?? true,
      muteComments: options.muteComments ?? false,
      expiresAt,
      createdAt: new Date()
    });
  }

  /**
   * Unmute a user
   */
  async unmuteUser(muterId: string, mutedId: string): Promise<void> {
    await followRepository.unmuteUser(muterId, mutedId);

    // Publish event
    await outboxService.userUnmuted({
      muterId,
      mutedId
    });
  }

  /**
   * Check if blocked (in either direction)
   */
  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    return followRepository.isBlocked(userId1, userId2);
  }

  /**
   * Check if muted
   */
  async isMuted(muterId: string, mutedId: string): Promise<boolean> {
    return followRepository.isMuted(muterId, mutedId);
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
}

// Singleton instance
export const followService = new FollowService();
