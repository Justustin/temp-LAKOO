import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware to check express-validator results and return 400 if validation failed.
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  next();
};

// =============================================================================
// Review Validators
// =============================================================================

export const createReviewValidators = [
  body('productId').isUUID().withMessage('Valid product ID is required'),
  body('variantId').optional().isUUID().withMessage('Variant ID must be a valid UUID'),
  body('orderId').optional().isUUID().withMessage('Order ID must be a valid UUID'),
  body('orderItemId').optional().isUUID().withMessage('Order item ID must be a valid UUID'),
  body('productName').isString().trim().notEmpty().withMessage('Product name is required'),
  body('variantName').optional().isString().trim(),
  body('productImageUrl').optional().isURL().withMessage('Valid image URL required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().isString().trim().isLength({ max: 255 }),
  body('reviewText').optional().isString().trim().isLength({ max: 5000 }),
  body('qualityRating').optional().isInt({ min: 1, max: 5 }),
  body('valueRating').optional().isInt({ min: 1, max: 5 }),
  body('fitRating').optional().isInt({ min: 1, max: 5 }),
];

export const updateReviewValidators = [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().isString().trim().isLength({ max: 255 }),
  body('reviewText').optional().isString().trim().isLength({ max: 5000 }),
  body('qualityRating').optional().isInt({ min: 1, max: 5 }),
  body('valueRating').optional().isInt({ min: 1, max: 5 }),
  body('fitRating').optional().isInt({ min: 1, max: 5 }),
];

export const reviewIdValidator = [
  param('id').isUUID().withMessage('Valid review ID is required'),
];

export const productIdValidator = [
  param('productId').isUUID().withMessage('Valid product ID is required'),
];

export const userIdValidator = [
  param('userId').isUUID().withMessage('Valid user ID is required'),
];

// =============================================================================
// Review Image Validators
// =============================================================================

export const addImageValidators = [
  body('imageUrl').isURL().withMessage('Valid image URL is required'),
  body('thumbnailUrl').optional().isURL().withMessage('Valid thumbnail URL required'),
  body('altText').optional().isString().trim().isLength({ max: 255 }),
  body('displayOrder').optional().isInt({ min: 0 }),
  body('width').optional().isInt({ min: 1 }),
  body('height').optional().isInt({ min: 1 }),
  body('sizeBytes').optional().isInt({ min: 1 }),
];

export const imageIdValidator = [
  param('imageId').isUUID().withMessage('Valid image ID is required'),
];

// =============================================================================
// Vote Validators
// =============================================================================

export const voteValidators = [
  body('voteType').isIn(['helpful', 'unhelpful']).withMessage('Vote type must be helpful or unhelpful'),
];

// =============================================================================
// Report Validators
// =============================================================================

export const reportValidators = [
  body('reason').isIn([
    'spam', 'fake_review', 'inappropriate_content', 'wrong_product',
    'offensive_language', 'personal_information', 'copyright', 'other'
  ]).withMessage('Valid report reason is required'),
  body('description').optional().isString().trim().isLength({ max: 500 }),
];

// =============================================================================
// Reply Validators
// =============================================================================

export const createReplyValidators = [
  body('replyText').isString().trim().notEmpty().isLength({ max: 2000 })
    .withMessage('Reply text is required and must be under 2000 characters'),
  body('responderType').isIn(['seller', 'brand_manager', 'admin'])
    .withMessage('Valid responder type is required'),
  body('responderName').isString().trim().notEmpty().isLength({ max: 255 })
    .withMessage('Responder name is required'),
];

export const updateReplyValidators = [
  body('replyText').isString().trim().notEmpty().isLength({ max: 2000 })
    .withMessage('Reply text is required and must be under 2000 characters'),
];

export const replyIdValidator = [
  param('replyId').isUUID().withMessage('Valid reply ID is required'),
];

// =============================================================================
// Review Request Validators
// =============================================================================

export const createReviewRequestValidators = [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('orderId').isUUID().withMessage('Valid order ID is required'),
  body('orderItemId').optional().isUUID(),
  body('productId').isUUID().withMessage('Valid product ID is required'),
  body('variantId').optional().isUUID(),
  body('productName').isString().trim().notEmpty(),
  body('productImageUrl').optional().isURL(),
  body('channel').optional().isIn(['in_app', 'email', 'push', 'sms']),
  body('eligibleAt').isISO8601().withMessage('Valid eligible date is required'),
  body('expiresAt').isISO8601().withMessage('Valid expiration date is required'),
];

export const reviewRequestIdValidator = [
  param('id').isUUID().withMessage('Valid review request ID is required'),
];

// =============================================================================
// Moderation Validators
// =============================================================================

export const moderationDecisionValidators = [
  body('decision').isIn(['approved', 'rejected', 'needs_edit', 'escalated'])
    .withMessage('Valid decision is required'),
  body('notes').optional().isString().trim().isLength({ max: 500 }),
  body('rejectionReason').optional().isString().trim().isLength({ max: 255 }),
];

// =============================================================================
// Query Validators
// =============================================================================

export const getReviewsQueryValidators = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('rating').optional().isInt({ min: 1, max: 5 }).toInt(),
  query('hasPhotos').optional().isBoolean().toBoolean(),
  query('isVerified').optional().isBoolean().toBoolean(),
  query('sortBy').optional().isIn(['newest', 'oldest', 'highest', 'lowest', 'helpful']),
];

export const getModerationQueueValidators = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['pending', 'in_progress', 'completed']),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
];
