import { Router } from 'express';
import { param, query, body } from 'express-validator';
import { followController } from '../controllers/follow.controller';
import { validateRequest } from '../middleware/validation';
import { gatewayAuth, optionalGatewayAuth } from '../middleware/auth';

const router: Router = Router();

// =============================================================================
// Public Routes (optional auth)
// =============================================================================

/**
 * Get follow stats (public)
 * GET /users/:userId/stats
 */
router.get(
  '/users/:userId/stats',
  [param('userId').isUUID()],
  validateRequest,
  optionalGatewayAuth,
  followController.getStats
);

/**
 * Get followers list (public)
 * GET /users/:userId/followers
 */
router.get(
  '/users/:userId/followers',
  [
    param('userId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  optionalGatewayAuth,
  followController.getFollowers
);

/**
 * Get following list (public)
 * GET /users/:userId/following
 */
router.get(
  '/users/:userId/following',
  [
    param('userId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  optionalGatewayAuth,
  followController.getFollowing
);

// =============================================================================
// Authenticated Routes
// =============================================================================

// Apply authentication to all routes below
router.use(gatewayAuth);

/**
 * Follow a user
 * POST /users/:userId/follow
 */
router.post(
  '/users/:userId/follow',
  [param('userId').isUUID()],
  validateRequest,
  followController.follow
);

/**
 * Unfollow a user
 * DELETE /users/:userId/follow
 */
router.delete(
  '/users/:userId/follow',
  [param('userId').isUUID()],
  validateRequest,
  followController.unfollow
);

/**
 * Check if following
 * GET /users/:userId/is-following
 */
router.get(
  '/users/:userId/is-following',
  [param('userId').isUUID()],
  validateRequest,
  followController.isFollowing
);

/**
 * Block a user
 * POST /users/:userId/block
 */
router.post(
  '/users/:userId/block',
  [
    param('userId').isUUID(),
    body('reason').optional().isString().isLength({ max: 500 })
  ],
  validateRequest,
  followController.blockUser
);

/**
 * Unblock a user
 * DELETE /users/:userId/block
 */
router.delete(
  '/users/:userId/block',
  [param('userId').isUUID()],
  validateRequest,
  followController.unblockUser
);

/**
 * Mute a user
 * POST /users/:userId/mute
 */
router.post(
  '/users/:userId/mute',
  [
    param('userId').isUUID(),
    body('mutePosts').optional().isBoolean(),
    body('muteComments').optional().isBoolean(),
    body('duration')
      .optional()
      .isIn(['1h', '24h', '7d', '30d', 'forever'])
  ],
  validateRequest,
  followController.muteUser
);

/**
 * Unmute a user
 * DELETE /users/:userId/mute
 */
router.delete(
  '/users/:userId/mute',
  [param('userId').isUUID()],
  validateRequest,
  followController.unmuteUser
);

export default router;
