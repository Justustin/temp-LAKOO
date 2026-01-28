import { prisma } from '../lib/prisma';
import { UserFollow, UserFollowStats, FollowStatus } from '../generated/prisma';

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export class FollowRepository {
  /**
   * Create a follow relationship
   */
  async follow(followerId: string, followingId: string): Promise<UserFollow> {
    return prisma.$transaction(async (tx) => {
      // Create or reactivate follow relationship
      const follow = await tx.userFollow.upsert({
        where: {
          followerId_followingId: { followerId, followingId }
        },
        create: {
          followerId,
          followingId,
          status: 'active'
        },
        update: {
          status: 'active',
          unfollowedAt: null
        }
      });

      // Update follower stats (user following count)
      await tx.userFollowStats.upsert({
        where: { userId: followerId },
        create: {
          userId: followerId,
          followingCount: 1,
          followerCount: 0
        },
        update: {
          followingCount: { increment: 1 }
        }
      });

      // Update following stats (user follower count)
      await tx.userFollowStats.upsert({
        where: { userId: followingId },
        create: {
          userId: followingId,
          followerCount: 1,
          followingCount: 0
        },
        update: {
          followerCount: { increment: 1 }
        }
      });

      return follow;
    });
  }

  /**
   * Unfollow a user
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update follow relationship status
      await tx.userFollow.update({
        where: {
          followerId_followingId: { followerId, followingId }
        },
        data: {
          status: 'unfollowed',
          unfollowedAt: new Date()
        }
      });

      // Decrement follower stats
      await tx.userFollowStats.update({
        where: { userId: followerId },
        data: {
          followingCount: { decrement: 1 }
        }
      });

      // Decrement following stats
      await tx.userFollowStats.update({
        where: { userId: followingId },
        data: {
          followerCount: { decrement: 1 }
        }
      });
    });
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, options: PaginationOptions): Promise<UserFollow[]> {
    return prisma.userFollow.findMany({
      where: {
        followingId: userId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, options: PaginationOptions): Promise<UserFollow[]> {
    return prisma.userFollow.findMany({
      where: {
        followerId: userId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId }
      }
    });
    return follow?.status === 'active';
  }

  /**
   * Get follower IDs for a user (for feed fanout)
   */
  async getFollowerIds(userId: string): Promise<string[]> {
    const follows = await prisma.userFollow.findMany({
      where: {
        followingId: userId,
        status: 'active'
      },
      select: { followerId: true }
    });
    return follows.map(f => f.followerId);
  }

  /**
   * Get follow stats for a user
   */
  async getStats(userId: string): Promise<UserFollowStats | null> {
    return prisma.userFollowStats.findUnique({
      where: { userId }
    });
  }

  /**
   * Count followers
   */
  async countFollowers(userId: string): Promise<number> {
    return prisma.userFollow.count({
      where: {
        followingId: userId,
        status: 'active'
      }
    });
  }

  /**
   * Count following
   */
  async countFollowing(userId: string): Promise<number> {
    return prisma.userFollow.count({
      where: {
        followerId: userId,
        status: 'active'
      }
    });
  }

  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Create block record
      await tx.userBlock.upsert({
        where: {
          blockerId_blockedId: { blockerId, blockedId }
        },
        create: {
          blockerId,
          blockedId,
          reason: reason || null
        },
        update: {
          reason: reason || null
        }
      });

      // Unfollow in both directions if following
      const existingFollows = await tx.userFollow.findMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId, status: 'active' },
            { followerId: blockedId, followingId: blockerId, status: 'active' }
          ]
        }
      });

      for (const follow of existingFollows) {
        await tx.userFollow.update({
          where: { id: follow.id },
          data: {
            status: 'unfollowed',
            unfollowedAt: new Date()
          }
        });

        // Update stats
        await tx.userFollowStats.update({
          where: { userId: follow.followerId },
          data: { followingCount: { decrement: 1 } }
        });
        await tx.userFollowStats.update({
          where: { userId: follow.followingId },
          data: { followerCount: { decrement: 1 } }
        });
      }
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await prisma.userBlock.delete({
      where: {
        blockerId_blockedId: { blockerId, blockedId }
      }
    });
  }

  /**
   * Check if user is blocked
   */
  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 }
        ]
      }
    });
    return !!block;
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
      duration?: string; // '1h', '24h', '7d', '30d', 'forever'
    }
  ): Promise<void> {
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

    await prisma.userMute.upsert({
      where: {
        muterId_mutedId: { muterId, mutedId }
      },
      create: {
        muterId,
        mutedId,
        mutePosts: options.mutePosts ?? true,
        muteComments: options.muteComments ?? false,
        expiresAt
      },
      update: {
        mutePosts: options.mutePosts ?? true,
        muteComments: options.muteComments ?? false,
        expiresAt
      }
    });
  }

  /**
   * Unmute a user
   */
  async unmuteUser(muterId: string, mutedId: string): Promise<void> {
    await prisma.userMute.delete({
      where: {
        muterId_mutedId: { muterId, mutedId }
      }
    });
  }

  /**
   * Check if user is muted
   */
  async isMuted(muterId: string, mutedId: string): Promise<boolean> {
    const mute = await prisma.userMute.findUnique({
      where: {
        muterId_mutedId: { muterId, mutedId }
      }
    });

    if (!mute) return false;

    // Check if mute has expired
    if (mute.expiresAt && mute.expiresAt < new Date()) {
      // Auto-unmute
      await this.unmuteUser(muterId, mutedId);
      return false;
    }

    return true;
  }

  /**
   * Get muted users
   */
  async getMutedUsers(userId: string): Promise<string[]> {
    const mutes = await prisma.userMute.findMany({
      where: {
        muterId: userId,
        mutePosts: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      select: { mutedId: true }
    });
    return mutes.map(m => m.mutedId);
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: string): Promise<string[]> {
    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      select: { blockedId: true }
    });
    return blocks.map(b => b.blockedId);
  }
}

// Singleton instance
export const followRepository = new FollowRepository();
