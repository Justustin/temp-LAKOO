import { Response, RequestHandler } from 'express';
import { ReviewService } from '../services/review.service';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ReviewQuery, ReviewRequestQuery, ModerationQuery } from '../types';

type Handler = RequestHandler;

const service = new ReviewService();

export class ReviewController {
  // =============================================================================
  // Reviews
  // =============================================================================

  createReview: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { reviewerName, reviewerImageUrl, ...data } = req.body;

    const review = await service.createReview(
      userId,
      reviewerName || 'Anonymous',
      reviewerImageUrl,
      data
    );

    res.status(201).json({
      success: true,
      data: review
    });
  });

  getReviewById: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const review = await service.getReviewById(req.params.id!);
    res.json({
      success: true,
      data: review
    });
  });

  getReviewsByProduct: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query: ReviewQuery = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
      hasPhotos: req.query.hasPhotos === 'true' ? true : undefined,
      isVerified: req.query.isVerified === 'true' ? true : undefined,
      sortBy: req.query.sortBy as any
    };

    const result = await service.getReviewsByProduct(req.params.productId!, query);
    res.json({
      success: true,
      data: result.reviews,
      pagination: result.pagination
    });
  });

  getReviewsByUser: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query: ReviewQuery = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as any
    };

    const result = await service.getReviewsByUser(req.params.userId!, query);
    res.json({
      success: true,
      data: result.reviews,
      pagination: result.pagination
    });
  });

  updateReview: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const review = await service.updateReview(req.params.id!, req.user!.id, req.body);
    res.json({
      success: true,
      data: review
    });
  });

  deleteReview: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const isAdmin = req.user!.role === 'admin';
    await service.deleteReview(req.params.id!, req.user!.id, isAdmin);
    res.status(204).send();
  });

  // =============================================================================
  // Images
  // =============================================================================

  addImage: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const image = await service.addImage(req.params.id!, req.user!.id, req.body);
    res.status(201).json({
      success: true,
      data: image
    });
  });

  deleteImage: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await service.deleteImage(req.params.id!, req.params.imageId!, req.user!.id);
    res.status(204).send();
  });

  // =============================================================================
  // Votes
  // =============================================================================

  voteReview: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vote = await service.voteReview(req.params.id!, req.user!.id, req.body.voteType);
    res.json({
      success: true,
      data: vote
    });
  });

  removeVote: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await service.removeVote(req.params.id!, req.user!.id);
    res.status(204).send();
  });

  // =============================================================================
  // Reports
  // =============================================================================

  reportReview: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const report = await service.reportReview(req.params.id!, req.user!.id, req.body);
    res.status(201).json({
      success: true,
      data: report
    });
  });

  // =============================================================================
  // Replies
  // =============================================================================

  createReply: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reply = await service.createReply(req.params.id!, req.user!.id, req.body);
    res.status(201).json({
      success: true,
      data: reply
    });
  });

  updateReply: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const reply = await service.updateReply(
      req.params.id!,
      req.params.replyId!,
      req.user!.id,
      req.body
    );
    res.json({
      success: true,
      data: reply
    });
  });

  deleteReply: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const isAdmin = req.user!.role === 'admin';
    await service.deleteReply(req.params.id!, req.params.replyId!, req.user!.id, isAdmin);
    res.status(204).send();
  });

  // =============================================================================
  // Review Requests
  // =============================================================================

  createReviewRequest: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const request = await service.createReviewRequest({
      ...req.body,
      eligibleAt: new Date(req.body.eligibleAt),
      expiresAt: new Date(req.body.expiresAt)
    });
    res.status(201).json({
      success: true,
      data: request
    });
  });

  getReviewRequests: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query: ReviewRequestQuery = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as any
    };

    const result = await service.getReviewRequests(req.user!.id, query);
    res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination
    });
  });

  skipReviewRequest: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const request = await service.skipReviewRequest(req.params.id!, req.user!.id);
    res.json({
      success: true,
      data: request
    });
  });

  // =============================================================================
  // Moderation (Admin)
  // =============================================================================

  getModerationQueue: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query: ModerationQuery = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as any,
      priority: req.query.priority as any
    };

    const result = await service.getModerationQueue(query);
    res.json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  });

  approveReview: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const review = await service.approveReview(
      req.params.id!,
      req.user!.id,
      req.body.notes
    );
    res.json({
      success: true,
      data: review
    });
  });

  rejectReview: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const review = await service.rejectReview(
      req.params.id!,
      req.user!.id,
      req.body.rejectionReason || 'Policy violation',
      req.body.notes
    );
    res.json({
      success: true,
      data: review
    });
  });

  // =============================================================================
  // Review Summary
  // =============================================================================

  getReviewSummary: Handler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const summary = await service.getReviewSummary(req.params.productId!);
    res.json({
      success: true,
      data: summary
    });
  });
}
