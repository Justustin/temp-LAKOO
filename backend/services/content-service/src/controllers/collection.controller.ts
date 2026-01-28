import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { collectionService } from '../services/collection.service';

/**
 * Collection Controller
 * 
 * Handles HTTP requests for saved post collections.
 */
export class CollectionController {
  /**
   * Get my collections
   * GET /api/collections
   */
  getMyCollections = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    const collections = await collectionService.getUserCollections(userId);

    res.json({
      success: true,
      data: collections
    });
  });

  /**
   * Get collection by ID
   * GET /api/collections/:id
   */
  getCollectionById = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const viewerId = req.user?.id;

    const collection = await collectionService.getCollectionById(id, viewerId);

    res.json({
      success: true,
      data: collection
    });
  });

  /**
   * Get posts in collection
   * GET /api/collections/:id/posts
   */
  getCollectionPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const viewerId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await collectionService.getCollectionPosts(id, viewerId, { limit, offset });

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
   * Create collection
   * POST /api/collections
   */
  createCollection = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    const collection = await collectionService.createCollection(userId, req.body);

    res.status(201).json({
      success: true,
      data: collection
    });
  });

  /**
   * Update collection
   * PUT /api/collections/:id
   */
  updateCollection = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const collection = await collectionService.updateCollection(id, userId, req.body);

    res.json({
      success: true,
      data: collection
    });
  });

  /**
   * Delete collection
   * DELETE /api/collections/:id
   */
  deleteCollection = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await collectionService.deleteCollection(id, userId);

    res.json({
      success: true,
      message: 'Collection deleted successfully'
    });
  });

  /**
   * Get my saved posts
   * GET /api/collections/saved
   */
  getMySavedPosts = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const saves = await collectionService.getUserSavedPosts(userId, { limit, offset });

    res.json({
      success: true,
      data: saves,
      pagination: {
        limit,
        offset,
        count: saves.length
      }
    });
  });
}

// Export singleton instance
export const collectionController = new CollectionController();
