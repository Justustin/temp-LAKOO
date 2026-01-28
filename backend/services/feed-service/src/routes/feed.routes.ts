import { Router } from 'express';
import { query } from 'express-validator';
import { feedController } from '../controllers/feed.controller';
import { validateRequest } from '../middleware/validation';
import { gatewayAuth } from '../middleware/auth';

const router: Router = Router();

// All feed routes require authentication
router.use(gatewayAuth);

/**
 * Get personalized "For You" feed
 * GET /feed/for-you
 */
router.get(
  '/for-you',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  feedController.getForYouFeed
);

/**
 * Get following-only feed
 * GET /feed/following
 */
router.get(
  '/following',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  feedController.getFollowingFeed
);

/**
 * Get explore/discover feed
 * GET /feed/explore
 */
router.get(
  '/explore',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  feedController.getExploreFeed
);

/**
 * Refresh user's feed
 * POST /feed/refresh
 */
router.post('/refresh', feedController.refreshFeed);

export default router;
