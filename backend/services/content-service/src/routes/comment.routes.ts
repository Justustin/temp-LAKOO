import { Router, IRouter } from 'express';
import { body, param, query } from 'express-validator';
import { gatewayAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { commentController } from '../controllers/comment.controller';

const router: IRouter = Router();

// ============ Public Routes ============

// Get comments for post
router.get('/post/:postId',
  [
    param('postId').isUUID().withMessage('Invalid post ID'),
    query('parentId').optional().isUUID().withMessage('Invalid parent ID'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validateRequest,
  commentController.getComments
);

// Get single comment
router.get('/:id',
  [
    param('id').isUUID().withMessage('Invalid comment ID')
  ],
  validateRequest,
  commentController.getCommentById
);

// ============ Authenticated Routes ============

router.use(gatewayAuth);

// Create comment
router.post('/',
  [
    body('postId').isUUID().withMessage('Invalid post ID'),
    body('content').notEmpty().withMessage('Content is required')
      .isLength({ min: 1, max: 2000 }).withMessage('Content must be 1-2000 characters'),
    body('parentId').optional().isUUID().withMessage('Invalid parent ID')
  ],
  validateRequest,
  commentController.createComment
);

// Update comment
router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid comment ID'),
    body('content').notEmpty().withMessage('Content is required')
      .isLength({ min: 1, max: 2000 }).withMessage('Content must be 1-2000 characters')
  ],
  validateRequest,
  commentController.updateComment
);

// Delete comment
router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid comment ID')
  ],
  validateRequest,
  commentController.deleteComment
);

// Like comment
router.post('/:id/like',
  [
    param('id').isUUID().withMessage('Invalid comment ID')
  ],
  validateRequest,
  commentController.likeComment
);

// Unlike comment
router.delete('/:id/like',
  [
    param('id').isUUID().withMessage('Invalid comment ID')
  ],
  validateRequest,
  commentController.unlikeComment
);

export default router;
