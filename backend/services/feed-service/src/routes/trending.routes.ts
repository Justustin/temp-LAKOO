import { Router } from 'express';
import { query } from 'express-validator';
import { trendingController } from '../controllers/trending.controller';
import { validateRequest } from '../middleware/validation';

const router: Router = Router();

/**
 * Get trending posts (public)
 * GET /trending/posts
 */
router.get(
  '/posts',
  [
    query('window').optional().isIn(['hourly', 'daily', 'weekly', 'monthly']),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  validateRequest,
  trendingController.getTrendingPosts
);

/**
 * Get trending hashtags (public)
 * GET /trending/hashtags
 */
router.get(
  '/hashtags',
  [query('limit').optional().isInt({ min: 1, max: 50 })],
  validateRequest,
  trendingController.getTrendingHashtags
);

export default router;
