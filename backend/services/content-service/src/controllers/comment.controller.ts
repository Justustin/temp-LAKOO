import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { commentService } from '../services/comment.service';

/**
 * Comment Controller
 * 
 * Handles HTTP requests for comment operations.
 */
export class CommentController {
  /**
   * Create a new comment
   * POST /api/comments
   */
  createComment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const comment = await commentService.createComment(userId, req.body);

    res.status(201).json({
      success: true,
      data: comment
    });
  });

  /**
   * Get comments for a post
   * GET /api/comments/post/:postId
   */
  getComments = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { postId } = req.params;
    const parentId = req.query.parentId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const comments = await commentService.getCommentsByPost(postId, parentId || null, { limit, offset });

    res.json({
      success: true,
      data: comments,
      pagination: {
        limit,
        offset,
        count: comments.length
      }
    });
  });

  /**
   * Get single comment by ID
   * GET /api/comments/:id
   */
  getCommentById = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const comment = await commentService.getCommentById(id);

    res.json({
      success: true,
      data: comment
    });
  });

  /**
   * Update comment
   * PUT /api/comments/:id
   */
  updateComment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content } = req.body;

    const comment = await commentService.updateComment(id, userId, content);

    res.json({
      success: true,
      data: comment
    });
  });

  /**
   * Delete comment
   * DELETE /api/comments/:id
   */
  deleteComment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await commentService.deleteComment(id, userId);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  });

  /**
   * Like comment
   * POST /api/comments/:id/like
   */
  likeComment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await commentService.likeComment(id, userId);

    res.json({
      success: true,
      message: 'Comment liked successfully'
    });
  });

  /**
   * Unlike comment
   * DELETE /api/comments/:id/like
   */
  unlikeComment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await commentService.unlikeComment(id, userId);

    res.json({
      success: true,
      message: 'Comment unliked successfully'
    });
  });
}

// Export singleton instance
export const commentController = new CommentController();
