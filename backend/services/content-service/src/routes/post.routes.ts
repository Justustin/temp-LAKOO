import { Router, IRouter } from 'express';
import { body, param, query } from 'express-validator';
import { gatewayAuth, optionalGatewayAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { postController } from '../controllers/post.controller';

const router: IRouter = Router();

// ============ Public/Optional Auth Routes ============

// Get single post (optional auth for visibility check)
router.get('/:id',
  [
    param('id').isUUID().withMessage('Invalid post ID')
  ],
  validateRequest,
  optionalGatewayAuth,
  postController.getPostById
);

// Get published posts (public feed)
router.get('/',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('hashtag').optional().isString().trim().isLength({ min: 1, max: 100 })
  ],
  validateRequest,
  postController.getPosts
);

// Get posts with specific product tag
router.get('/product/:productId',
  [
    param('productId').isUUID().withMessage('Invalid product ID'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
  ],
  validateRequest,
  postController.getPostsByProduct
);

// ============ Authenticated Routes ============

router.use(gatewayAuth);

// Create post
router.post('/',
  [
    body('caption').notEmpty().withMessage('Caption is required')
      .isLength({ min: 1, max: 5000 }).withMessage('Caption must be 1-5000 characters'),
    body('title').optional().isLength({ max: 255 }).withMessage('Title must be max 255 characters'),
    body('postType').optional().isIn(['standard', 'review', 'lookbook', 'tutorial', 'unboxing'])
      .withMessage('Invalid post type'),
    body('visibility').optional().isIn(['public', 'followers_only', 'private'])
      .withMessage('Invalid visibility'),
    body('media').isArray({ min: 1, max: 9 }).withMessage('Must have 1-9 media items'),
    body('media.*.mediaType').isIn(['image', 'video']).withMessage('Invalid media type'),
    body('media.*.mediaUrl').isURL().withMessage('Invalid media URL'),
    body('media.*.thumbnailUrl').optional().isURL().withMessage('Invalid thumbnail URL'),
    body('media.*.width').optional().isInt({ min: 1 }).toInt(),
    body('media.*.height').optional().isInt({ min: 1 }).toInt(),
    body('media.*.durationSec').optional().isInt({ min: 0 }).toInt(),
    body('media.*.fileSizeBytes').optional().isInt({ min: 0 }).toInt(),
    body('media.*.sortOrder').isInt({ min: 0 }).toInt().withMessage('Sort order must be >= 0'),
    body('media.*.altText').optional().isLength({ max: 500 }).withMessage('Alt text too long'),
    body('productTags').optional().isArray({ max: 20 }).withMessage('Max 20 product tags'),
    body('productTags.*.productId').isUUID().withMessage('Invalid product ID'),
    body('productTags.*.mediaIndex').isInt({ min: 0, max: 8 }).toInt()
      .withMessage('Media index must be 0-8'),
    body('productTags.*.positionX').optional().isFloat({ min: 0, max: 100 })
      .withMessage('Position X must be 0-100'),
    body('productTags.*.positionY').optional().isFloat({ min: 0, max: 100 })
      .withMessage('Position Y must be 0-100'),
    body('locationName').optional().isLength({ max: 255 }).withMessage('Location name too long'),
    body('locationLat').optional().isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('locationLng').optional().isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude')
  ],
  validateRequest,
  postController.createPost
);

// Get my posts
router.get('/me/posts',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validateRequest,
  postController.getMyPosts
);

// Update post
router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid post ID'),
    body('title').optional().isLength({ max: 255 }).withMessage('Title too long'),
    body('caption').optional().isLength({ min: 1, max: 5000 })
      .withMessage('Caption must be 1-5000 characters'),
    body('visibility').optional().isIn(['public', 'followers_only', 'private'])
      .withMessage('Invalid visibility'),
    body('locationName').optional().isLength({ max: 255 }).withMessage('Location name too long'),
    body('locationLat').optional().isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),
    body('locationLng').optional().isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude')
  ],
  validateRequest,
  postController.updatePost
);

// Delete post
router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid post ID')
  ],
  validateRequest,
  postController.deletePost
);

// ============ Engagement Routes ============

// Like post
router.post('/:id/like',
  [
    param('id').isUUID().withMessage('Invalid post ID')
  ],
  validateRequest,
  postController.likePost
);

// Unlike post
router.delete('/:id/like',
  [
    param('id').isUUID().withMessage('Invalid post ID')
  ],
  validateRequest,
  postController.unlikePost
);

// Save post
router.post('/:id/save',
  [
    param('id').isUUID().withMessage('Invalid post ID'),
    body('collectionId').optional().isUUID().withMessage('Invalid collection ID')
  ],
  validateRequest,
  postController.savePost
);

// Unsave post
router.delete('/:id/save',
  [
    param('id').isUUID().withMessage('Invalid post ID'),
    query('collectionId').optional().isUUID().withMessage('Invalid collection ID')
  ],
  validateRequest,
  postController.unsavePost
);

// Record view
router.post('/:id/view',
  [
    param('id').isUUID().withMessage('Invalid post ID'),
    body('durationSec').optional().isInt({ min: 0 }).toInt()
  ],
  validateRequest,
  postController.recordView
);

// Track product tag click
router.post('/:postId/tags/:tagId/click',
  [
    param('postId').isUUID().withMessage('Invalid post ID'),
    param('tagId').isUUID().withMessage('Invalid tag ID')
  ],
  validateRequest,
  postController.trackTagClick
);

export default router;
