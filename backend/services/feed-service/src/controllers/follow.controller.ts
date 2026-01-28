import { Response } from 'express';
import { followService } from '../services/follow.service';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';

export class FollowController {
  /**
   * Follow a user
   * POST /users/:userId/follow
   */
  follow = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const followerId = req.user!.id;
    const followingId = req.params['userId'];

    if (!followingId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    const follow = await followService.follow(followerId, followingId);

    res.status(201).json({
      success: true,
      data: {
        followerId: follow.followerId,
        followingId: follow.followingId,
        followedAt: follow.createdAt
      }
    });
  });

  /**
   * Unfollow a user
   * DELETE /users/:userId/follow
   */
  unfollow = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const followerId = req.user!.id;
    const followingId = req.params['userId'];

    if (!followingId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    await followService.unfollow(followerId, followingId);

    res.json({
      success: true,
      message: 'Successfully unfollowed user'
    });
  });

  /**
   * Get followers list
   * GET /users/:userId/followers
   */
  getFollowers = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.params['userId'];
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    const followers = await followService.getFollowers(userId, { limit, offset });

    res.json({
      success: true,
      data: {
        followers,
        pagination: {
          limit,
          offset,
          total: followers.length
        }
      }
    });
  });

  /**
   * Get following list
   * GET /users/:userId/following
   */
  getFollowing = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.params['userId'];
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    const following = await followService.getFollowing(userId, { limit, offset });

    res.json({
      success: true,
      data: {
        following,
        pagination: {
          limit,
          offset,
          total: following.length
        }
      }
    });
  });

  /**
   * Get follow stats
   * GET /users/:userId/stats
   */
  getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.params['userId'];

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    const stats = await followService.getStats(userId);

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Check if following
   * GET /users/:userId/is-following
   */
  isFollowing = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const followerId = req.user!.id;
    const followingId = req.params['userId'];

    if (!followingId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    const isFollowing = await followService.isFollowing(followerId, followingId);

    res.json({
      success: true,
      data: {
        isFollowing
      }
    });
  });

  /**
   * Block a user
   * POST /users/:userId/block
   */
  blockUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const blockerId = req.user!.id;
    const blockedId = req.params['userId'];
    const { reason } = req.body;

    if (!blockedId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    await followService.blockUser(blockerId, blockedId, reason);

    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  });

  /**
   * Unblock a user
   * DELETE /users/:userId/block
   */
  unblockUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const blockerId = req.user!.id;
    const blockedId = req.params['userId'];

    if (!blockedId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    await followService.unblockUser(blockerId, blockedId);

    res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  });

  /**
   * Mute a user
   * POST /users/:userId/mute
   */
  muteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const muterId = req.user!.id;
    const mutedId = req.params['userId'];
    const { mutePosts, muteComments, duration } = req.body;

    if (!mutedId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    await followService.muteUser(muterId, mutedId, {
      mutePosts,
      muteComments,
      duration
    });

    res.json({
      success: true,
      message: 'User muted successfully'
    });
  });

  /**
   * Unmute a user
   * DELETE /users/:userId/mute
   */
  unmuteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const muterId = req.user!.id;
    const mutedId = req.params['userId'];

    if (!mutedId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    await followService.unmuteUser(muterId, mutedId);

    res.json({
      success: true,
      message: 'User unmuted successfully'
    });
  });
}

// Singleton instance
export const followController = new FollowController();
