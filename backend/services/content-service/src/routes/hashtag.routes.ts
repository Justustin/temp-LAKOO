import { Router, IRouter } from 'express';
import { param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { hashtagController } from '../controllers/hashtag.controller';

const router: IRouter = Router();

// All hashtag routes are public (no auth required)

// Get trending hashtags
router.get('/trending',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  validateRequest,
  hashtagController.getTrending
);

// Search hashtags
router.get('/search',
  [
    query('q').notEmpty().withMessage('Query is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
  ],
  validateRequest,
  hashtagController.search
);

// Get popular hashtags
router.get('/popular',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  validateRequest,
  hashtagController.getPopular
);

// Get hashtag by tag
router.get('/:tag',
  [
    param('tag').notEmpty().withMessage('Tag is required')
      .matches(/^[\w]+$/).withMessage('Invalid tag format')
  ],
  validateRequest,
  hashtagController.getByTag
);

// Get posts by hashtag
router.get('/:tag/posts',
  [
    param('tag').notEmpty().withMessage('Tag is required')
      .matches(/^[\w]+$/).withMessage('Invalid tag format'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validateRequest,
  hashtagController.getPostsByHashtag
);

// Get related hashtags
router.get('/:tag/related',
  [
    param('tag').notEmpty().withMessage('Tag is required')
      .matches(/^[\w]+$/).withMessage('Invalid tag format'),
    query('limit').optional().isInt({ min: 1, max: 20 }).toInt()
  ],
  validateRequest,
  hashtagController.getRelated
);

export default router;
