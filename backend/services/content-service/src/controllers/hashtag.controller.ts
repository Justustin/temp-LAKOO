import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { hashtagService } from '../services/hashtag.service';

/**
 * Hashtag Controller
 * 
 * Handles HTTP requests for hashtag operations.
 */
export class HashtagController {
  /**
   * Get trending hashtags
   * GET /api/hashtags/trending
   */
  getTrending = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const limit = parseInt(req.query.limit as string) || 20;

    const hashtags = await hashtagService.getTrending(limit);

    res.json({
      success: true,
      data: hashtags
    });
  });

  /**
   * Search hashtags
   * GET /api/hashtags/search
   */
  search = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;

    const hashtags = await hashtagService.search(query, limit);

    res.json({
      success: true,
      data: hashtags
    });
  });

  /**
   * Get popular hashtags
   * GET /api/hashtags/popular
   */
  getPopular = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const limit = parseInt(req.query.limit as string) || 50;

    const hashtags = await hashtagService.getPopular(limit);

    res.json({
      success: true,
      data: hashtags
    });
  });

  /**
   * Get hashtag by tag
   * GET /api/hashtags/:tag
   */
  getByTag = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { tag } = req.params;

    const hashtag = await hashtagService.getByTag(tag);

    res.json({
      success: true,
      data: hashtag
    });
  });

  /**
   * Get posts by hashtag
   * GET /api/hashtags/:tag/posts
   */
  getPostsByHashtag = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { tag } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await hashtagService.getPostsByHashtag(tag, { limit, offset });

    res.json({
      success: true,
      data: posts,
      pagination: {
        limit,
        offset,
        count: posts.length
      }
    });
  });

  /**
   * Get related hashtags
   * GET /api/hashtags/:tag/related
   */
  getRelated = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { tag } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const hashtags = await hashtagService.getRelated(tag, limit);

    res.json({
      success: true,
      data: hashtags
    });
  });
}

// Export singleton instance
export const hashtagController = new HashtagController();
