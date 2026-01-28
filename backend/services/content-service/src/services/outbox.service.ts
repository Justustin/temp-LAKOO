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

export type PostEventType =
  | 'post.created'
  | 'post.updated'
  | 'post.deleted'
  | 'post.liked'
  | 'post.unliked'
  | 'post.saved'
  | 'post.unsaved'
  | 'post.viewed';

export type CommentEventType =
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted'
  | 'comment.liked'
  | 'comment.unliked';

export type ModerationEventType =
  | 'content.reported'
  | 'content.moderated';

export type ProductTagEventType =
  | 'product_tag.clicked';

export type EventType = PostEventType | CommentEventType | ModerationEventType | ProductTagEventType;

// =============================================================================
// Event Payloads
// =============================================================================

export interface PostCreatedPayload {
  postId: string;
  postCode: string;
  userId: string;
  postType: string;
  visibility: string;
  productIds: string[];
  hashtags: string[];
  createdAt: string;
}

export interface PostUpdatedPayload {
  postId: string;
  postCode: string;
  userId: string;
  changes: string[];
  updatedAt: string;
}

export interface PostDeletedPayload {
  postId: string;
  postCode: string;
  userId: string;
  deletedAt: string;
}

export interface PostLikedPayload {
  postId: string;
  userId: string;
  postAuthorId: string;
  createdAt: string;
}

export interface PostSavedPayload {
  postId: string;
  userId: string;
  collectionId: string | null;
  createdAt: string;
}

export interface PostViewedPayload {
  postId: string;
  userId: string | null;
  durationSec: number | null;
  createdAt: string;
}

export interface CommentCreatedPayload {
  commentId: string;
  postId: string;
  userId: string;
  postAuthorId: string;
  parentId: string | null;
  isReply: boolean;
  mentions: string[];
  createdAt: string;
}

export interface CommentLikedPayload {
  commentId: string;
  postId: string;
  userId: string;
  commentAuthorId: string;
  createdAt: string;
}

export interface ContentReportedPayload {
  reportId: string;
  contentType: string;
  contentId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
}

export interface ContentModeratedPayload {
  reportId: string;
  contentType: string;
  contentId: string;
  actionTaken: string;
  moderatorId: string;
  moderatedAt: string;
}

export interface ProductTagClickedPayload {
  postId: string;
  tagId: string;
  productId: string;
  userId: string | null;
  clickedAt: string;
}

// =============================================================================
// Outbox Service
// =============================================================================

export class OutboxService {
  /**
   * Publish an event to the outbox
   */
  async publish(
    aggregateType: 'Post' | 'Comment' | 'ContentReport' | 'ProductTag',
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
  // Post Events
  // =============================================================================

  async postCreated(post: {
    id: string;
    postCode: string;
    userId: string;
    postType: string;
    visibility: string;
    productIds: string[];
    hashtags: string[];
    createdAt: Date;
  }): Promise<void> {
    const payload: PostCreatedPayload = {
      postId: post.id,
      postCode: post.postCode,
      userId: post.userId,
      postType: post.postType,
      visibility: post.visibility,
      productIds: post.productIds,
      hashtags: post.hashtags,
      createdAt: post.createdAt.toISOString()
    };

    await this.publish('Post', post.id, 'post.created', payload);
  }

  async postUpdated(post: {
    id: string;
    postCode: string;
    userId: string;
    changes: string[];
    updatedAt: Date;
  }): Promise<void> {
    const payload: PostUpdatedPayload = {
      postId: post.id,
      postCode: post.postCode,
      userId: post.userId,
      changes: post.changes,
      updatedAt: post.updatedAt.toISOString()
    };

    await this.publish('Post', post.id, 'post.updated', payload);
  }

  async postDeleted(post: {
    id: string;
    postCode: string;
    userId: string;
  }): Promise<void> {
    const payload: PostDeletedPayload = {
      postId: post.id,
      postCode: post.postCode,
      userId: post.userId,
      deletedAt: new Date().toISOString()
    };

    await this.publish('Post', post.id, 'post.deleted', payload);
  }

  async postLiked(like: {
    postId: string;
    userId: string;
    postAuthorId: string;
  }): Promise<void> {
    const payload: PostLikedPayload = {
      postId: like.postId,
      userId: like.userId,
      postAuthorId: like.postAuthorId,
      createdAt: new Date().toISOString()
    };

    await this.publish('Post', like.postId, 'post.liked', payload);
  }

  async postUnliked(unlike: {
    postId: string;
    userId: string;
  }): Promise<void> {
    await this.publish('Post', unlike.postId, 'post.unliked', {
      postId: unlike.postId,
      userId: unlike.userId,
      unlikedAt: new Date().toISOString()
    });
  }

  async postSaved(save: {
    postId: string;
    userId: string;
    collectionId: string | null;
  }): Promise<void> {
    const payload: PostSavedPayload = {
      postId: save.postId,
      userId: save.userId,
      collectionId: save.collectionId,
      createdAt: new Date().toISOString()
    };

    await this.publish('Post', save.postId, 'post.saved', payload);
  }

  async postUnsaved(unsave: {
    postId: string;
    userId: string;
  }): Promise<void> {
    await this.publish('Post', unsave.postId, 'post.unsaved', {
      postId: unsave.postId,
      userId: unsave.userId,
      unsavedAt: new Date().toISOString()
    });
  }

  async postViewed(view: {
    postId: string;
    userId: string | null;
    durationSec: number | null;
  }): Promise<void> {
    const payload: PostViewedPayload = {
      postId: view.postId,
      userId: view.userId,
      durationSec: view.durationSec,
      createdAt: new Date().toISOString()
    };

    await this.publish('Post', view.postId, 'post.viewed', payload);
  }

  // =============================================================================
  // Comment Events
  // =============================================================================

  async commentCreated(comment: {
    id: string;
    postId: string;
    userId: string;
    postAuthorId: string;
    parentId: string | null;
    isReply: boolean;
    mentions: string[];
    createdAt: Date;
  }): Promise<void> {
    const payload: CommentCreatedPayload = {
      commentId: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      postAuthorId: comment.postAuthorId,
      parentId: comment.parentId,
      isReply: comment.isReply,
      mentions: comment.mentions,
      createdAt: comment.createdAt.toISOString()
    };

    await this.publish('Comment', comment.id, 'comment.created', payload);
  }

  async commentLiked(like: {
    commentId: string;
    postId: string;
    userId: string;
    commentAuthorId: string;
  }): Promise<void> {
    const payload: CommentLikedPayload = {
      commentId: like.commentId,
      postId: like.postId,
      userId: like.userId,
      commentAuthorId: like.commentAuthorId,
      createdAt: new Date().toISOString()
    };

    await this.publish('Comment', like.commentId, 'comment.liked', payload);
  }

  async commentDeleted(comment: {
    id: string;
    postId: string;
    userId: string;
  }): Promise<void> {
    await this.publish('Comment', comment.id, 'comment.deleted', {
      commentId: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      deletedAt: new Date().toISOString()
    });
  }

  // =============================================================================
  // Moderation Events
  // =============================================================================

  async contentReported(report: {
    id: string;
    contentType: string;
    contentId: string;
    reporterId: string;
    reason: string;
    createdAt: Date;
  }): Promise<void> {
    const payload: ContentReportedPayload = {
      reportId: report.id,
      contentType: report.contentType,
      contentId: report.contentId,
      reporterId: report.reporterId,
      reason: report.reason,
      createdAt: report.createdAt.toISOString()
    };

    await this.publish('ContentReport', report.id, 'content.reported', payload);
  }

  async contentModerated(moderation: {
    reportId: string;
    contentType: string;
    contentId: string;
    actionTaken: string;
    moderatorId: string;
  }): Promise<void> {
    const payload: ContentModeratedPayload = {
      reportId: moderation.reportId,
      contentType: moderation.contentType,
      contentId: moderation.contentId,
      actionTaken: moderation.actionTaken,
      moderatorId: moderation.moderatorId,
      moderatedAt: new Date().toISOString()
    };

    await this.publish('ContentReport', moderation.reportId, 'content.moderated', payload);
  }

  // =============================================================================
  // Product Tag Events
  // =============================================================================

  async productTagClicked(click: {
    postId: string;
    tagId: string;
    productId: string;
    userId: string | null;
  }): Promise<void> {
    const payload: ProductTagClickedPayload = {
      postId: click.postId,
      tagId: click.tagId,
      productId: click.productId,
      userId: click.userId,
      clickedAt: new Date().toISOString()
    };

    await this.publish('ProductTag', click.tagId, 'product_tag.clicked', payload);
  }
}

// Singleton instance
export const outboxService = new OutboxService();
