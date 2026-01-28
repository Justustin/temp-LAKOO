import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { postService } from '../services/post.service';

/**
 * Post Controller
 * 
 * Handles HTTP requests for post operations.
 * Delegates business logic to PostService.
 */
export class PostController {
  /**
   * Create a new post
   * POST /api/posts
   */
  createPost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const post = await postService.createPost(userId, req.body);

    res.status(201).json({
      success: true,
      data: post
    });
  });

  /**
   * Get single post by ID
   * GET /api/posts/:id
   */
  getPostById = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const viewerId = req.user?.id;

    const post = await postService.getPostById(id, viewerId);

    res.json({
      success: true,
      data: post
    });
  });

  /**
   * Get posts (public feed)
   * GET /api/posts
   */
  getPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const hashtag = req.query.hashtag as string;

    let posts;
    if (hashtag) {
      posts = await postService.getPostsByHashtag(hashtag, { limit, offset });
    } else {
      posts = await postService.getPublicPosts({ limit, offset });
    }

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
   * Get posts by product
   * GET /api/posts/product/:productId
   */
  getPostsByProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await postService.getPostsByProduct(productId, { limit, offset });

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
   * Get my posts
   * GET /api/posts/me/posts
   */
  getMyPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await postService.getPostsByUser(userId, { limit, offset }, userId);

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
   * Update post
   * PUT /api/posts/:id
   */
  updatePost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const post = await postService.updatePost(id, userId, req.body);

    res.json({
      success: true,
      data: post
    });
  });

  /**
   * Delete post
   * DELETE /api/posts/:id
   */
  deletePost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await postService.deletePost(id, userId);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  });

  /**
   * Like post
   * POST /api/posts/:id/like
   */
  likePost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await postService.likePost(id, userId);

    res.json({
      success: true,
      message: 'Post liked successfully'
    });
  });

  /**
   * Unlike post
   * DELETE /api/posts/:id/like
   */
  unlikePost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await postService.unlikePost(id, userId);

    res.json({
      success: true,
      message: 'Post unliked successfully'
    });
  });

  /**
   * Save post
   * POST /api/posts/:id/save
   */
  savePost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { collectionId } = req.body;

    await postService.savePost(id, userId, collectionId);

    res.json({
      success: true,
      message: 'Post saved successfully'
    });
  });

  /**
   * Unsave post
   * DELETE /api/posts/:id/save
   */
  unsavePost = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { collectionId } = req.query;

    await postService.unsavePost(id, userId, collectionId as string);

    res.json({
      success: true,
      message: 'Post unsaved successfully'
    });
  });

  /**
   * Record view
   * POST /api/posts/:id/view
   */
  recordView = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { durationSec } = req.body;

    await postService.recordView(id, userId, durationSec);

    res.json({
      success: true,
      message: 'View recorded successfully'
    });
  });

  /**
   * Track product tag click
   * POST /api/posts/:postId/tags/:tagId/click
   */
  trackTagClick = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { postId, tagId } = req.params;
    const userId = req.user?.id;

    await postService.trackTagClick(postId, tagId, userId);

    res.json({
      success: true,
      message: 'Tag click tracked successfully'
    });
  });
}

// Export singleton instance
export const postController = new PostController();
