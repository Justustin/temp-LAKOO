import { ReviewRepository } from '../repositories/review.repository';
import { outboxService } from './outbox.service';
import { NotFoundError, ConflictError, ForbiddenError } from '../middleware/error-handler';
import {
  CreateReviewDTO,
  UpdateReviewDTO,
  ReviewQuery,
  AddImageDTO,
  VoteType,
  ReportDTO,
  CreateReplyDTO,
  UpdateReplyDTO,
  CreateReviewRequestDTO,
  ReviewRequestQuery,
  ModerationQuery
} from '../types';

export class ReviewService {
  private repository: ReviewRepository;

  constructor() {
    this.repository = new ReviewRepository();
  }

  // =============================================================================
  // Reviews
  // =============================================================================

  async createReview(userId: string, reviewerName: string, reviewerImageUrl: string | undefined, data: CreateReviewDTO) {
    const review = await this.repository.createReview(userId, {
      ...data,
      reviewerName,
      reviewerImageUrl
    });

    // Add to moderation queue
    await this.repository.addToModerationQueue(review.id);

    // Publish event
    await outboxService.reviewCreated(review, review.images.length > 0);

    return review;
  }

  async getReviewById(id: string) {
    const review = await this.repository.findReviewById(id);
    if (!review) {
      throw new NotFoundError('Review not found');
    }
    return review;
  }

  async getReviewsByProduct(productId: string, query: ReviewQuery) {
    return this.repository.findReviewsByProduct(productId, query);
  }

  async getReviewsByUser(userId: string, query: ReviewQuery) {
    return this.repository.findReviewsByUser(userId, query);
  }

  async updateReview(id: string, userId: string, data: UpdateReviewDTO) {
    const review = await this.repository.findReviewById(id);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.user_id !== userId) {
      throw new ForbiddenError('You can only edit your own reviews');
    }

    if (review.deleted_at) {
      throw new NotFoundError('Review has been deleted');
    }

    const updatedReview = await this.repository.updateReview(id, data);

    // Publish event
    const updatedFields = Object.keys(data).filter(k => data[k as keyof UpdateReviewDTO] !== undefined);
    await outboxService.reviewUpdated(updatedReview, updatedFields);

    // Recalculate summary if rating changed
    if (data.rating !== undefined && review.is_visible) {
      await this.repository.recalculateSummary(review.product_id);
    }

    return updatedReview;
  }

  async deleteReview(id: string, userId: string, isAdmin: boolean = false) {
    const review = await this.repository.findReviewById(id);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (!isAdmin && review.user_id !== userId) {
      throw new ForbiddenError('You can only delete your own reviews');
    }

    await this.repository.deleteReview(id);

    // Publish event
    await outboxService.reviewDeleted(review);

    // Recalculate summary
    if (review.is_visible) {
      await this.repository.recalculateSummary(review.product_id);
    }
  }

  // =============================================================================
  // Review Images
  // =============================================================================

  async addImage(reviewId: string, userId: string, data: AddImageDTO) {
    const review = await this.repository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.user_id !== userId) {
      throw new ForbiddenError('You can only add images to your own reviews');
    }

    const imageCount = await this.repository.getImageCount(reviewId);
    if (imageCount >= 10) {
      throw new ConflictError('Maximum 10 images per review');
    }

    return this.repository.addImage(reviewId, data);
  }

  async deleteImage(reviewId: string, imageId: string, userId: string) {
    const review = await this.repository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.user_id !== userId) {
      throw new ForbiddenError('You can only delete images from your own reviews');
    }

    await this.repository.deleteImage(reviewId, imageId);
  }

  // =============================================================================
  // Votes
  // =============================================================================

  async voteReview(reviewId: string, userId: string, voteType: VoteType) {
    const review = await this.repository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.user_id === userId) {
      throw new ConflictError('You cannot vote on your own review');
    }

    if (!review.is_visible) {
      throw new ForbiddenError('Cannot vote on hidden reviews');
    }

    const vote = await this.repository.vote(reviewId, userId, voteType);

    // Publish event
    await outboxService.reviewVoted(reviewId, review.user_id, userId, voteType);

    return vote;
  }

  async removeVote(reviewId: string, userId: string) {
    const existingVote = await this.repository.getUserVote(reviewId, userId);
    if (!existingVote) {
      throw new NotFoundError('Vote not found');
    }

    await this.repository.removeVote(reviewId, userId);
  }

  // =============================================================================
  // Reports
  // =============================================================================

  async reportReview(reviewId: string, reporterId: string, data: ReportDTO) {
    const review = await this.repository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.user_id === reporterId) {
      throw new ConflictError('You cannot report your own review');
    }

    const existingReport = await this.repository.getReportByUser(reviewId, reporterId);
    if (existingReport) {
      throw new ConflictError('You have already reported this review');
    }

    const report = await this.repository.createReport(reviewId, reporterId, data);

    // Publish event
    await outboxService.reviewReported(reviewId, reporterId, data.reason);

    return report;
  }

  // =============================================================================
  // Replies
  // =============================================================================

  async createReply(reviewId: string, responderId: string, data: CreateReplyDTO) {
    const review = await this.repository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (!review.is_visible) {
      throw new ForbiddenError('Cannot reply to hidden reviews');
    }

    const reply = await this.repository.createReply(reviewId, responderId, data);

    // Publish event
    await outboxService.reviewReplied(reviewId, reply.id, data.responderType, responderId);

    return reply;
  }

  async updateReply(reviewId: string, replyId: string, responderId: string, data: UpdateReplyDTO) {
    const reply = await this.repository.findReplyById(replyId);
    if (!reply) {
      throw new NotFoundError('Reply not found');
    }

    if (reply.responder_id !== responderId) {
      throw new ForbiddenError('You can only edit your own replies');
    }

    if (reply.review_id !== reviewId) {
      throw new NotFoundError('Reply not found for this review');
    }

    return this.repository.updateReply(replyId, data);
  }

  async deleteReply(reviewId: string, replyId: string, responderId: string, isAdmin: boolean = false) {
    const reply = await this.repository.findReplyById(replyId);
    if (!reply) {
      throw new NotFoundError('Reply not found');
    }

    if (!isAdmin && reply.responder_id !== responderId) {
      throw new ForbiddenError('You can only delete your own replies');
    }

    if (reply.review_id !== reviewId) {
      throw new NotFoundError('Reply not found for this review');
    }

    await this.repository.deleteReply(reviewId, replyId);
  }

  // =============================================================================
  // Review Requests
  // =============================================================================

  async createReviewRequest(data: CreateReviewRequestDTO) {
    const request = await this.repository.createReviewRequest(data);

    // Publish event
    await outboxService.reviewRequestCreated(request);

    return request;
  }

  async getReviewRequests(userId: string, query: ReviewRequestQuery) {
    return this.repository.findReviewRequestsByUser(userId, query);
  }

  async skipReviewRequest(id: string, userId: string) {
    const request = await this.repository.findReviewRequestById(id);
    if (!request) {
      throw new NotFoundError('Review request not found');
    }

    if (request.user_id !== userId) {
      throw new ForbiddenError('You can only skip your own review requests');
    }

    return this.repository.markRequestSkipped(id);
  }

  async completeReviewRequest(requestId: string, reviewId: string) {
    const request = await this.repository.findReviewRequestById(requestId);
    if (!request) {
      return; // Silently ignore if request doesn't exist
    }

    await this.repository.markRequestCompleted(requestId, reviewId);

    // Publish event
    await outboxService.reviewRequestCompleted(
      requestId,
      request.user_id,
      request.order_id,
      request.product_id,
      reviewId
    );
  }

  // =============================================================================
  // Moderation
  // =============================================================================

  async getModerationQueue(query: ModerationQuery) {
    return this.repository.getModerationQueue(query);
  }

  async approveReview(reviewId: string, moderatorId: string, notes?: string) {
    const review = await this.repository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    const approvedReview = await this.repository.approveReview(reviewId, moderatorId, notes);

    // Publish event
    await outboxService.reviewApproved({
      ...review,
      moderated_by: moderatorId
    });

    // Recalculate summary
    await this.repository.recalculateSummary(review.product_id);

    return approvedReview;
  }

  async rejectReview(reviewId: string, moderatorId: string, rejectionReason: string, notes?: string) {
    const review = await this.repository.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    const rejectedReview = await this.repository.rejectReview(reviewId, moderatorId, rejectionReason, notes);

    // Publish event
    await outboxService.reviewRejected({
      ...review,
      moderated_by: moderatorId,
      rejection_reason: rejectionReason
    });

    return rejectedReview;
  }

  // =============================================================================
  // Review Summary
  // =============================================================================

  async getReviewSummary(productId: string) {
    let summary = await this.repository.getReviewSummary(productId);

    if (!summary) {
      summary = await this.repository.recalculateSummary(productId);
    }

    return summary;
  }

  async recalculateSummary(productId: string) {
    return this.repository.recalculateSummary(productId);
  }
}
