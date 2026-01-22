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

export type ReviewEventType =
  | 'review.created'
  | 'review.updated'
  | 'review.approved'
  | 'review.rejected'
  | 'review.deleted'
  | 'review.voted'
  | 'review.reported'
  | 'review.replied';

export type ReviewRequestEventType =
  | 'review_request.created'
  | 'review_request.sent'
  | 'review_request.opened'
  | 'review_request.completed'
  | 'review_request.expired'
  | 'review_request.skipped';

export type EventType = ReviewEventType | ReviewRequestEventType;

// =============================================================================
// Event Payloads
// =============================================================================

export interface ReviewCreatedPayload {
  reviewId: string;
  productId: string;
  userId: string;
  rating: number;
  hasPhotos: boolean;
  isVerified: boolean;
  sellerId?: string;
  brandId?: string;
  createdAt: string;
}

export interface ReviewUpdatedPayload {
  reviewId: string;
  productId: string;
  userId: string;
  rating: number;
  updatedFields: string[];
  updatedAt: string;
}

export interface ReviewApprovedPayload {
  reviewId: string;
  productId: string;
  userId: string;
  rating: number;
  moderatedBy: string;
  approvedAt: string;
}

export interface ReviewRejectedPayload {
  reviewId: string;
  productId: string;
  userId: string;
  moderatedBy: string;
  rejectionReason: string;
  rejectedAt: string;
}

export interface ReviewDeletedPayload {
  reviewId: string;
  productId: string;
  userId: string;
  rating: number;
  deletedAt: string;
}

export interface ReviewVotedPayload {
  reviewId: string;
  userId: string;
  voterId: string;
  voteType: 'helpful' | 'unhelpful';
  votedAt: string;
}

export interface ReviewReportedPayload {
  reviewId: string;
  reporterId: string;
  reason: string;
  reportedAt: string;
}

export interface ReviewRepliedPayload {
  reviewId: string;
  replyId: string;
  responderType: string;
  responderId: string;
  repliedAt: string;
}

export interface ReviewRequestCreatedPayload {
  requestId: string;
  userId: string;
  orderId: string;
  productId: string;
  eligibleAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface ReviewRequestCompletedPayload {
  requestId: string;
  userId: string;
  orderId: string;
  productId: string;
  reviewId: string;
  completedAt: string;
}

// =============================================================================
// Outbox Service
// =============================================================================

export class OutboxService {
  /**
   * Publish an event to the outbox
   */
  async publish(
    aggregateType: string,
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

    if (metadata !== undefined) {
      data.metadata = metadata;
    }

    await prisma.serviceOutbox.create({ data });
  }

  // =============================================================================
  // Review Events
  // =============================================================================

  async reviewCreated(review: {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    seller_id?: string | null;
    brand_id?: string | null;
    is_verified: boolean;
    created_at: Date;
  }, hasPhotos: boolean): Promise<void> {
    const payload: ReviewCreatedPayload = {
      reviewId: review.id,
      productId: review.product_id,
      userId: review.user_id,
      rating: review.rating,
      hasPhotos,
      isVerified: review.is_verified,
      sellerId: review.seller_id || undefined,
      brandId: review.brand_id || undefined,
      createdAt: review.created_at.toISOString()
    };

    await this.publish('Review', review.id, 'review.created', payload);
  }

  async reviewUpdated(review: {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
  }, updatedFields: string[]): Promise<void> {
    const payload: ReviewUpdatedPayload = {
      reviewId: review.id,
      productId: review.product_id,
      userId: review.user_id,
      rating: review.rating,
      updatedFields,
      updatedAt: new Date().toISOString()
    };

    await this.publish('Review', review.id, 'review.updated', payload);
  }

  async reviewApproved(review: {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    moderated_by?: string | null;
  }): Promise<void> {
    const payload: ReviewApprovedPayload = {
      reviewId: review.id,
      productId: review.product_id,
      userId: review.user_id,
      rating: review.rating,
      moderatedBy: review.moderated_by || 'system',
      approvedAt: new Date().toISOString()
    };

    await this.publish('Review', review.id, 'review.approved', payload);
  }

  async reviewRejected(review: {
    id: string;
    product_id: string;
    user_id: string;
    moderated_by?: string | null;
    rejection_reason?: string | null;
  }): Promise<void> {
    const payload: ReviewRejectedPayload = {
      reviewId: review.id,
      productId: review.product_id,
      userId: review.user_id,
      moderatedBy: review.moderated_by || 'system',
      rejectionReason: review.rejection_reason || 'Policy violation',
      rejectedAt: new Date().toISOString()
    };

    await this.publish('Review', review.id, 'review.rejected', payload);
  }

  async reviewDeleted(review: {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
  }): Promise<void> {
    const payload: ReviewDeletedPayload = {
      reviewId: review.id,
      productId: review.product_id,
      userId: review.user_id,
      rating: review.rating,
      deletedAt: new Date().toISOString()
    };

    await this.publish('Review', review.id, 'review.deleted', payload);
  }

  async reviewVoted(
    reviewId: string,
    userId: string,
    voterId: string,
    voteType: 'helpful' | 'unhelpful'
  ): Promise<void> {
    const payload: ReviewVotedPayload = {
      reviewId,
      userId,
      voterId,
      voteType,
      votedAt: new Date().toISOString()
    };

    await this.publish('Review', reviewId, 'review.voted', payload);
  }

  async reviewReported(
    reviewId: string,
    reporterId: string,
    reason: string
  ): Promise<void> {
    const payload: ReviewReportedPayload = {
      reviewId,
      reporterId,
      reason,
      reportedAt: new Date().toISOString()
    };

    await this.publish('Review', reviewId, 'review.reported', payload);
  }

  async reviewReplied(
    reviewId: string,
    replyId: string,
    responderType: string,
    responderId: string
  ): Promise<void> {
    const payload: ReviewRepliedPayload = {
      reviewId,
      replyId,
      responderType,
      responderId,
      repliedAt: new Date().toISOString()
    };

    await this.publish('Review', reviewId, 'review.replied', payload);
  }

  // =============================================================================
  // Review Request Events
  // =============================================================================

  async reviewRequestCreated(request: {
    id: string;
    user_id: string;
    order_id: string;
    product_id: string;
    eligible_at: Date;
    expires_at: Date;
    created_at: Date;
  }): Promise<void> {
    const payload: ReviewRequestCreatedPayload = {
      requestId: request.id,
      userId: request.user_id,
      orderId: request.order_id,
      productId: request.product_id,
      eligibleAt: request.eligible_at.toISOString(),
      expiresAt: request.expires_at.toISOString(),
      createdAt: request.created_at.toISOString()
    };

    await this.publish('ReviewRequest', request.id, 'review_request.created', payload);
  }

  async reviewRequestCompleted(
    requestId: string,
    userId: string,
    orderId: string,
    productId: string,
    reviewId: string
  ): Promise<void> {
    const payload: ReviewRequestCompletedPayload = {
      requestId,
      userId,
      orderId,
      productId,
      reviewId,
      completedAt: new Date().toISOString()
    };

    await this.publish('ReviewRequest', requestId, 'review_request.completed', payload);
  }
}

// Singleton instance
export const outboxService = new OutboxService();
