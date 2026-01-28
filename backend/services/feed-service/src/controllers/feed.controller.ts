import { Response } from 'express';
import { feedService } from '../services/feed.service';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';

export class FeedController {
  /**
   * Get personalized "For You" feed
   * GET /feed/for-you
   */
  getForYouFeed = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    const feed = await feedService.getForYouFeed(userId, { limit, offset });

    res.json({
      success: true,
      data: {
        posts: feed,
        pagination: {
          limit,
          offset,
          count: feed.length
        }
      }
    });
  });

  /**
   * Get following-only feed
   * GET /feed/following
   */
  getFollowingFeed = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    const feed = await feedService.getFollowingFeed(userId, { limit, offset });

    res.json({
      success: true,
      data: {
        posts: feed,
        pagination: {
          limit,
          offset,
          count: feed.length
        }
      }
    });
  });

  /**
   * Get explore/discover feed
   * GET /feed/explore
   */
  getExploreFeed = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    const feed = await feedService.getExploreFeed(userId, { limit, offset });

    res.json({
      success: true,
      data: {
        posts: feed,
        pagination: {
          limit,
          offset,
          count: feed.length
        }
      }
    });
  });

  /**
   * Refresh user's feed
   * POST /feed/refresh
   */
  refreshFeed = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    await feedService.refreshFeed(userId);

    res.json({
      success: true,
      message: 'Feed refreshed successfully'
    });
  });
}

// Singleton instance
export const feedController = new FeedController();
