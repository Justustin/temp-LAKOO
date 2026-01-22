import { prisma } from '../lib/prisma';
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
  ModerationQuery,
  ModerationDecisionDTO,
  ResponderType
} from '../types';

export class ReviewRepository {
  // =============================================================================
  // Product Reviews
  // =============================================================================

  async createReview(userId: string, data: CreateReviewDTO) {
    return prisma.product_reviews.create({
      data: {
        user_id: userId,
        product_id: data.productId,
        variant_id: data.variantId,
        order_id: data.orderId,
        order_item_id: data.orderItemId,
        seller_id: data.sellerId,
        brand_id: data.brandId,
        product_name: data.productName,
        variant_name: data.variantName,
        product_image_url: data.productImageUrl,
        reviewer_name: data.reviewerName,
        reviewer_image_url: data.reviewerImageUrl,
        rating: data.rating,
        title: data.title,
        review_text: data.reviewText,
        quality_rating: data.qualityRating,
        value_rating: data.valueRating,
        fit_rating: data.fitRating,
        is_verified: data.isVerified || false,
        purchased_at: data.purchasedAt,
        delivered_at: data.deliveredAt,
        status: 'pending'
      },
      include: {
        images: true
      }
    });
  }

  async findReviewById(id: string) {
    return prisma.product_reviews.findUnique({
      where: { id },
      include: {
        images: { orderBy: { display_order: 'asc' } },
        replies: {
          where: { deleted_at: null, status: 'visible' },
          orderBy: { created_at: 'asc' }
        }
      }
    });
  }

  async findReviewsByProduct(productId: string, query: ReviewQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      product_id: productId,
      is_visible: true,
      deleted_at: null
    };

    if (query.rating) {
      where.rating = query.rating;
    }

    if (query.hasPhotos) {
      where.images = { some: {} };
    }

    if (query.isVerified !== undefined) {
      where.is_verified = query.isVerified;
    }

    const orderBy: any = {};
    switch (query.sortBy) {
      case 'oldest':
        orderBy.created_at = 'asc';
        break;
      case 'highest':
        orderBy.rating = 'desc';
        break;
      case 'lowest':
        orderBy.rating = 'asc';
        break;
      case 'helpful':
        orderBy.helpful_count = 'desc';
        break;
      default:
        orderBy.created_at = 'desc';
    }

    const [reviews, total] = await Promise.all([
      prisma.product_reviews.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { orderBy: { display_order: 'asc' } },
          replies: {
            where: { deleted_at: null, status: 'visible' },
            orderBy: { created_at: 'asc' }
          }
        }
      }),
      prisma.product_reviews.count({ where })
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findReviewsByUser(userId: string, query: ReviewQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      user_id: userId,
      deleted_at: null
    };

    if (query.status) {
      where.status = query.status;
    }

    const [reviews, total] = await Promise.all([
      prisma.product_reviews.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          images: { orderBy: { display_order: 'asc' } }
        }
      }),
      prisma.product_reviews.count({ where })
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateReview(id: string, data: UpdateReviewDTO) {
    const updateData: any = {
      updated_at: new Date(),
      is_edited: true,
      edited_at: new Date()
    };

    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.reviewText !== undefined) updateData.review_text = data.reviewText;
    if (data.qualityRating !== undefined) updateData.quality_rating = data.qualityRating;
    if (data.valueRating !== undefined) updateData.value_rating = data.valueRating;
    if (data.fitRating !== undefined) updateData.fit_rating = data.fitRating;

    return prisma.product_reviews.update({
      where: { id },
      data: {
        ...updateData,
        edit_count: { increment: 1 }
      },
      include: {
        images: { orderBy: { display_order: 'asc' } }
      }
    });
  }

  async deleteReview(id: string) {
    return prisma.product_reviews.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_visible: false
      }
    });
  }

  // =============================================================================
  // Review Images
  // =============================================================================

  async addImage(reviewId: string, data: AddImageDTO) {
    return prisma.review_images.create({
      data: {
        review_id: reviewId,
        image_url: data.imageUrl,
        thumbnail_url: data.thumbnailUrl,
        alt_text: data.altText,
        display_order: data.displayOrder || 0,
        width: data.width,
        height: data.height,
        size_bytes: data.sizeBytes
      }
    });
  }

  async deleteImage(reviewId: string, imageId: string) {
    return prisma.review_images.delete({
      where: { id: imageId, review_id: reviewId }
    });
  }

  async getImageCount(reviewId: string): Promise<number> {
    return prisma.review_images.count({ where: { review_id: reviewId } });
  }

  // =============================================================================
  // Review Votes
  // =============================================================================

  async vote(reviewId: string, userId: string, voteType: VoteType) {
    // Upsert the vote
    const vote = await prisma.review_votes.upsert({
      where: {
        review_id_user_id: { review_id: reviewId, user_id: userId }
      },
      create: {
        review_id: reviewId,
        user_id: userId,
        vote_type: voteType
      },
      update: {
        vote_type: voteType
      }
    });

    // Recalculate counts
    const [helpfulCount, unhelpfulCount] = await Promise.all([
      prisma.review_votes.count({ where: { review_id: reviewId, vote_type: 'helpful' } }),
      prisma.review_votes.count({ where: { review_id: reviewId, vote_type: 'unhelpful' } })
    ]);

    await prisma.product_reviews.update({
      where: { id: reviewId },
      data: { helpful_count: helpfulCount, unhelpful_count: unhelpfulCount }
    });

    return vote;
  }

  async removeVote(reviewId: string, userId: string) {
    await prisma.review_votes.delete({
      where: {
        review_id_user_id: { review_id: reviewId, user_id: userId }
      }
    });

    // Recalculate counts
    const [helpfulCount, unhelpfulCount] = await Promise.all([
      prisma.review_votes.count({ where: { review_id: reviewId, vote_type: 'helpful' } }),
      prisma.review_votes.count({ where: { review_id: reviewId, vote_type: 'unhelpful' } })
    ]);

    await prisma.product_reviews.update({
      where: { id: reviewId },
      data: { helpful_count: helpfulCount, unhelpful_count: unhelpfulCount }
    });
  }

  async getUserVote(reviewId: string, userId: string) {
    return prisma.review_votes.findUnique({
      where: {
        review_id_user_id: { review_id: reviewId, user_id: userId }
      }
    });
  }

  // =============================================================================
  // Review Reports
  // =============================================================================

  async createReport(reviewId: string, reporterId: string, data: ReportDTO) {
    const report = await prisma.review_reports.create({
      data: {
        review_id: reviewId,
        reporter_id: reporterId,
        reason: data.reason,
        description: data.description
      }
    });

    // Increment report count
    await prisma.product_reviews.update({
      where: { id: reviewId },
      data: { report_count: { increment: 1 } }
    });

    return report;
  }

  async getReportByUser(reviewId: string, reporterId: string) {
    return prisma.review_reports.findUnique({
      where: {
        review_id_reporter_id: { review_id: reviewId, reporter_id: reporterId }
      }
    });
  }

  // =============================================================================
  // Review Replies
  // =============================================================================

  async createReply(reviewId: string, responderId: string, data: CreateReplyDTO) {
    const reply = await prisma.review_replies.create({
      data: {
        review_id: reviewId,
        responder_id: responderId,
        responder_type: data.responderType,
        responder_name: data.responderName,
        reply_text: data.replyText
      }
    });

    // Increment reply count
    await prisma.product_reviews.update({
      where: { id: reviewId },
      data: { reply_count: { increment: 1 } }
    });

    return reply;
  }

  async findReplyById(replyId: string) {
    return prisma.review_replies.findUnique({
      where: { id: replyId }
    });
  }

  async updateReply(replyId: string, data: UpdateReplyDTO) {
    return prisma.review_replies.update({
      where: { id: replyId },
      data: {
        reply_text: data.replyText,
        is_edited: true,
        edited_at: new Date()
      }
    });
  }

  async deleteReply(reviewId: string, replyId: string) {
    await prisma.review_replies.update({
      where: { id: replyId },
      data: {
        deleted_at: new Date(),
        status: 'removed'
      }
    });

    // Decrement reply count
    await prisma.product_reviews.update({
      where: { id: reviewId },
      data: { reply_count: { decrement: 1 } }
    });
  }

  // =============================================================================
  // Review Requests
  // =============================================================================

  async createReviewRequest(data: CreateReviewRequestDTO) {
    return prisma.review_requests.create({
      data: {
        user_id: data.userId,
        order_id: data.orderId,
        order_item_id: data.orderItemId,
        product_id: data.productId,
        variant_id: data.variantId,
        product_name: data.productName,
        product_image_url: data.productImageUrl,
        channel: data.channel || 'in_app',
        eligible_at: data.eligibleAt,
        expires_at: data.expiresAt
      }
    });
  }

  async findReviewRequestById(id: string) {
    return prisma.review_requests.findUnique({ where: { id } });
  }

  async findReviewRequestsByUser(userId: string, query: ReviewRequestQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      user_id: userId,
      eligible_at: { lte: new Date() },
      expires_at: { gt: new Date() }
    };

    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { in: ['pending', 'sent'] };
    }

    const [requests, total] = await Promise.all([
      prisma.review_requests.findMany({
        where,
        orderBy: { eligible_at: 'asc' },
        skip,
        take: limit
      }),
      prisma.review_requests.count({ where })
    ]);

    return {
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async markRequestSkipped(id: string) {
    return prisma.review_requests.update({
      where: { id },
      data: { status: 'skipped' }
    });
  }

  async markRequestCompleted(id: string, reviewId: string) {
    return prisma.review_requests.update({
      where: { id },
      data: {
        status: 'completed',
        completed_at: new Date(),
        review_id: reviewId
      }
    });
  }

  // =============================================================================
  // Moderation
  // =============================================================================

  async addToModerationQueue(reviewId: string, autoScore?: number, autoFlags?: string[]) {
    return prisma.moderation_queue.create({
      data: {
        review_id: reviewId,
        auto_score: autoScore,
        auto_flags: autoFlags || [],
        priority: (autoScore && autoScore > 70) ? 'high' : 'normal'
      }
    });
  }

  async getModerationQueue(query: ModerationQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    const [items, total] = await Promise.all([
      prisma.moderation_queue.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { created_at: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.moderation_queue.count({ where })
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async approveReview(reviewId: string, moderatorId: string, notes?: string) {
    await prisma.$transaction([
      prisma.product_reviews.update({
        where: { id: reviewId },
        data: {
          status: 'approved',
          is_visible: true,
          moderated_at: new Date(),
          moderated_by: moderatorId,
          moderation_notes: notes
        }
      }),
      prisma.moderation_queue.update({
        where: { review_id: reviewId },
        data: {
          status: 'completed',
          processed_at: new Date(),
          processed_by: moderatorId,
          decision: 'approved',
          notes
        }
      })
    ]);

    return prisma.product_reviews.findUnique({ where: { id: reviewId } });
  }

  async rejectReview(reviewId: string, moderatorId: string, rejectionReason: string, notes?: string) {
    await prisma.$transaction([
      prisma.product_reviews.update({
        where: { id: reviewId },
        data: {
          status: 'rejected',
          is_visible: false,
          moderated_at: new Date(),
          moderated_by: moderatorId,
          moderation_notes: notes,
          rejection_reason: rejectionReason
        }
      }),
      prisma.moderation_queue.update({
        where: { review_id: reviewId },
        data: {
          status: 'completed',
          processed_at: new Date(),
          processed_by: moderatorId,
          decision: 'rejected',
          notes
        }
      })
    ]);

    return prisma.product_reviews.findUnique({ where: { id: reviewId } });
  }

  // =============================================================================
  // Review Summary
  // =============================================================================

  async getReviewSummary(productId: string) {
    return prisma.product_review_summaries.findUnique({
      where: { product_id: productId }
    });
  }

  async recalculateSummary(productId: string) {
    const reviews = await prisma.product_reviews.findMany({
      where: {
        product_id: productId,
        is_visible: true,
        deleted_at: null
      },
      include: {
        images: true
      }
    });

    const totalReviews = reviews.length;
    const totalWithPhotos = reviews.filter((r: any) => r.images.length > 0).length;
    const totalVerified = reviews.filter((r: any) => r.is_verified).length;

    const ratings = reviews.map((r: any) => r.rating as number);
    const avgRating = totalReviews > 0
      ? ratings.reduce((a: number, b: number) => a + b, 0) / totalReviews
      : null;

    const rating5Count = reviews.filter((r: any) => r.rating === 5).length;
    const rating4Count = reviews.filter((r: any) => r.rating === 4).length;
    const rating3Count = reviews.filter((r: any) => r.rating === 3).length;
    const rating2Count = reviews.filter((r: any) => r.rating === 2).length;
    const rating1Count = reviews.filter((r: any) => r.rating === 1).length;

    const qualityRatings = reviews.map((r: any) => r.quality_rating).filter((r: any) => r !== null) as number[];
    const valueRatings = reviews.map((r: any) => r.value_rating).filter((r: any) => r !== null) as number[];
    const fitRatings = reviews.map((r: any) => r.fit_rating).filter((r: any) => r !== null) as number[];

    const avgQualityRating = qualityRatings.length > 0
      ? qualityRatings.reduce((a: number, b: number) => a + b, 0) / qualityRatings.length
      : null;
    const avgValueRating = valueRatings.length > 0
      ? valueRatings.reduce((a: number, b: number) => a + b, 0) / valueRatings.length
      : null;
    const avgFitRating = fitRatings.length > 0
      ? fitRatings.reduce((a: number, b: number) => a + b, 0) / fitRatings.length
      : null;

    const lastReview = reviews.sort((a: any, b: any) =>
      b.created_at.getTime() - a.created_at.getTime()
    )[0];

    return prisma.product_review_summaries.upsert({
      where: { product_id: productId },
      create: {
        product_id: productId,
        total_reviews: totalReviews,
        total_with_photos: totalWithPhotos,
        total_verified: totalVerified,
        avg_rating: avgRating,
        rating_5_count: rating5Count,
        rating_4_count: rating4Count,
        rating_3_count: rating3Count,
        rating_2_count: rating2Count,
        rating_1_count: rating1Count,
        avg_quality_rating: avgQualityRating,
        avg_value_rating: avgValueRating,
        avg_fit_rating: avgFitRating,
        last_review_at: lastReview?.created_at || null,
        recalculated_at: new Date()
      },
      update: {
        total_reviews: totalReviews,
        total_with_photos: totalWithPhotos,
        total_verified: totalVerified,
        avg_rating: avgRating,
        rating_5_count: rating5Count,
        rating_4_count: rating4Count,
        rating_3_count: rating3Count,
        rating_2_count: rating2Count,
        rating_1_count: rating1Count,
        avg_quality_rating: avgQualityRating,
        avg_value_rating: avgValueRating,
        avg_fit_rating: avgFitRating,
        last_review_at: lastReview?.created_at || null,
        recalculated_at: new Date()
      }
    });
  }
}
