import { Response, Request } from 'express';
import { trendingService } from '../services/trending.service';
import { asyncHandler } from '../middleware/error-handler';

export class TrendingController {
  /**
   * Get trending posts
   * GET /trending/posts
   */
  getTrendingPosts = asyncHandler(async (req: Request, res: Response) => {
    const window = req.query['window'] as any || 'daily';
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    const trending = await trendingService.getTrendingPosts({
      window,
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        posts: trending,
        pagination: {
          limit,
          offset,
          count: trending.length
        }
      }
    });
  });

  /**
   * Get trending hashtags
   * GET /trending/hashtags
   */
  getTrendingHashtags = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query['limit'] as string) || 20;

    const hashtags = await trendingService.getTrendingHashtags(limit);

    res.json({
      success: true,
      data: {
        hashtags
      }
    });
  });
}

// Singleton instance
export const trendingController = new TrendingController();
