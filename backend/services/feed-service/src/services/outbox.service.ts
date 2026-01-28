import { prisma } from '../lib/prisma';

/**
 * Outbox Service
 *
 * Publishes domain events to the ServiceOutbox table for eventual delivery
 * to other services via Kafka/message broker.
 */

// =============================================================================
// Event Types
// =============================================================================

export type FollowEventType =
  | 'user.followed'
  | 'user.unfollowed'
  | 'user.blocked'
  | 'user.unblocked'
  | 'user.muted'
  | 'user.unmuted';

export type FeedEventType = 'feed.refreshed';

export type EventType = FollowEventType | FeedEventType;

// =============================================================================
// Event Payloads
// =============================================================================

export interface UserFollowedPayload {
  followerId: string;
  followingId: string;
  followedAt: string;
}

export interface UserUnfollowedPayload {
  followerId: string;
  followingId: string;
  unfollowedAt: string;
}

export interface UserBlockedPayload {
  blockerId: string;
  blockedId: string;
  reason?: string;
  blockedAt: string;
}

export interface UserUnblockedPayload {
  blockerId: string;
  blockedId: string;
  unblockedAt: string;
}

export interface UserMutedPayload {
  muterId: string;
  mutedId: string;
  mutePosts: boolean;
  muteComments: boolean;
  expiresAt: string | null;
  mutedAt: string;
}

export interface UserUnmutedPayload {
  muterId: string;
  mutedId: string;
  unmutedAt: string;
}

export interface FeedRefreshedPayload {
  userId: string;
  refreshedAt: string;
}

// =============================================================================
// Outbox Service
// =============================================================================

export class OutboxService {
  /**
   * Publish an event to the outbox
   */
  async publish(
    aggregateType: 'UserFollow' | 'UserBlock' | 'UserMute' | 'Feed',
    aggregateId: string,
    eventType: EventType,
    payload: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const data: any = {
      aggregateType,
      aggregateId,
      eventType,
      payload
    };

    // Prisma JSON fields accept undefined (omit), but not raw null unless using Prisma.JsonNull/DbNull.
    if (metadata !== undefined) {
      data.metadata = metadata;
    }

    await prisma.serviceOutbox.create({
      data: {
        ...data
      }
    });
  }

  // =============================================================================
  // Follow Events
  // =============================================================================

  async userFollowed(follow: {
    id: string;
    followerId: string;
    followingId: string;
    createdAt: Date;
  }): Promise<void> {
    const payload: UserFollowedPayload = {
      followerId: follow.followerId,
      followingId: follow.followingId,
      followedAt: follow.createdAt.toISOString()
    };

    await this.publish('UserFollow', follow.id, 'user.followed', payload);
  }

  async userUnfollowed(follow: {
    id: string;
    followerId: string;
    followingId: string;
  }): Promise<void> {
    const payload: UserUnfollowedPayload = {
      followerId: follow.followerId,
      followingId: follow.followingId,
      unfollowedAt: new Date().toISOString()
    };

    await this.publish('UserFollow', follow.id, 'user.unfollowed', payload);
  }

  // =============================================================================
  // Block Events
  // =============================================================================

  async userBlocked(block: {
    id: string;
    blockerId: string;
    blockedId: string;
    reason: string | null;
    createdAt: Date;
  }): Promise<void> {
    const payload: UserBlockedPayload = {
      blockerId: block.blockerId,
      blockedId: block.blockedId,
      reason: block.reason || undefined,
      blockedAt: block.createdAt.toISOString()
    };

    await this.publish('UserBlock', block.id, 'user.blocked', payload);
  }

  async userUnblocked(block: {
    blockerId: string;
    blockedId: string;
  }): Promise<void> {
    const payload: UserUnblockedPayload = {
      blockerId: block.blockerId,
      blockedId: block.blockedId,
      unblockedAt: new Date().toISOString()
    };

    await this.publish('UserBlock', `${block.blockerId}-${block.blockedId}`, 'user.unblocked', payload);
  }

  // =============================================================================
  // Mute Events
  // =============================================================================

  async userMuted(mute: {
    id: string;
    muterId: string;
    mutedId: string;
    mutePosts: boolean;
    muteComments: boolean;
    expiresAt: Date | null;
    createdAt: Date;
  }): Promise<void> {
    const payload: UserMutedPayload = {
      muterId: mute.muterId,
      mutedId: mute.mutedId,
      mutePosts: mute.mutePosts,
      muteComments: mute.muteComments,
      expiresAt: mute.expiresAt?.toISOString() || null,
      mutedAt: mute.createdAt.toISOString()
    };

    await this.publish('UserMute', mute.id, 'user.muted', payload);
  }

  async userUnmuted(mute: {
    muterId: string;
    mutedId: string;
  }): Promise<void> {
    const payload: UserUnmutedPayload = {
      muterId: mute.muterId,
      mutedId: mute.mutedId,
      unmutedAt: new Date().toISOString()
    };

    await this.publish('UserMute', `${mute.muterId}-${mute.mutedId}`, 'user.unmuted', payload);
  }

  // =============================================================================
  // Feed Events
  // =============================================================================

  async feedRefreshed(userId: string): Promise<void> {
    const payload: FeedRefreshedPayload = {
      userId,
      refreshedAt: new Date().toISOString()
    };

    await this.publish('Feed', userId, 'feed.refreshed', payload);
  }
}

// Singleton instance
export const outboxService = new OutboxService();
