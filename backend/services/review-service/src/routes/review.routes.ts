import { Router, type Router as ExpressRouter } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { gatewayOrInternalAuth, internalAuth, requireRole } from '../middleware/auth';
import {
  validateRequest,
  createReviewValidators,
  updateReviewValidators,
  reviewIdValidator,
  productIdValidator,
  userIdValidator,
  addImageValidators,
  imageIdValidator,
  voteValidators,
  reportValidators,
  createReplyValidators,
  updateReplyValidators,
  replyIdValidator,
  createReviewRequestValidators,
  reviewRequestIdValidator,
  moderationDecisionValidators,
  getReviewsQueryValidators,
  getModerationQueueValidators
} from '../middleware/validation';

const router: ExpressRouter = Router();
const controller = new ReviewController();

// =============================================================================
// Public Routes (no auth required)
// =============================================================================

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get a review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Review details
 */
router.get(
  '/:id',
  reviewIdValidator,
  validateRequest,
  controller.getReviewById
);

/**
 * @swagger
 * /api/products/{productId}/reviews:
 *   get:
 *     summary: Get reviews for a product
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get(
  '/products/:productId',
  productIdValidator,
  getReviewsQueryValidators,
  validateRequest,
  controller.getReviewsByProduct
);

/**
 * @swagger
 * /api/products/{productId}/review-summary:
 *   get:
 *     summary: Get review summary for a product
 *     tags: [Reviews]
 */
router.get(
  '/products/:productId/summary',
  productIdValidator,
  validateRequest,
  controller.getReviewSummary
);

// =============================================================================
// Protected Routes (require authentication)
// =============================================================================

router.use(gatewayOrInternalAuth);

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/',
  createReviewValidators,
  validateRequest,
  controller.createReview
);

/**
 * @swagger
 * /api/reviews/{id}:
 *   patch:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id',
  reviewIdValidator,
  updateReviewValidators,
  validateRequest,
  controller.updateReview
);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  reviewIdValidator,
  validateRequest,
  controller.deleteReview
);

// =============================================================================
// Review Images
// =============================================================================

router.post(
  '/:id/images',
  reviewIdValidator,
  addImageValidators,
  validateRequest,
  controller.addImage
);

router.delete(
  '/:id/images/:imageId',
  reviewIdValidator,
  imageIdValidator,
  validateRequest,
  controller.deleteImage
);

// =============================================================================
// Review Votes
// =============================================================================

router.post(
  '/:id/vote',
  reviewIdValidator,
  voteValidators,
  validateRequest,
  controller.voteReview
);

router.delete(
  '/:id/vote',
  reviewIdValidator,
  validateRequest,
  controller.removeVote
);

// =============================================================================
// Review Reports
// =============================================================================

router.post(
  '/:id/report',
  reviewIdValidator,
  reportValidators,
  validateRequest,
  controller.reportReview
);

// =============================================================================
// Review Replies
// =============================================================================

router.post(
  '/:id/replies',
  reviewIdValidator,
  createReplyValidators,
  validateRequest,
  controller.createReply
);

router.patch(
  '/:id/replies/:replyId',
  reviewIdValidator,
  replyIdValidator,
  updateReplyValidators,
  validateRequest,
  controller.updateReply
);

router.delete(
  '/:id/replies/:replyId',
  reviewIdValidator,
  replyIdValidator,
  validateRequest,
  controller.deleteReply
);

// =============================================================================
// User's Reviews
// =============================================================================

router.get(
  '/users/:userId',
  userIdValidator,
  getReviewsQueryValidators,
  validateRequest,
  controller.getReviewsByUser
);

// =============================================================================
// Review Requests
// =============================================================================

router.get(
  '/review-requests',
  validateRequest,
  controller.getReviewRequests
);

router.post(
  '/review-requests/:id/skip',
  reviewRequestIdValidator,
  validateRequest,
  controller.skipReviewRequest
);

// =============================================================================
// Internal Routes (service-to-service)
// =============================================================================

router.post(
  '/internal/review-requests',
  internalAuth,
  createReviewRequestValidators,
  validateRequest,
  controller.createReviewRequest
);

// =============================================================================
// Admin Routes
// =============================================================================

router.get(
  '/admin/moderation/queue',
  requireRole('admin'),
  getModerationQueueValidators,
  validateRequest,
  controller.getModerationQueue
);

router.post(
  '/admin/reviews/:id/approve',
  requireRole('admin'),
  reviewIdValidator,
  validateRequest,
  controller.approveReview
);

router.post(
  '/admin/reviews/:id/reject',
  requireRole('admin'),
  reviewIdValidator,
  moderationDecisionValidators,
  validateRequest,
  controller.rejectReview
);

export default router;
