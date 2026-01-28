import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { productDraftService } from '../services/product-draft.service';
import { DraftStatus } from '../generated/prisma';

/**
 * Draft Controller
 *
 * Handles seller draft operations
 */

export class DraftController {
  /**
   * Create a new draft
   * POST /api/drafts
   */
  createDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const sellerId = req.user!.id;
    const draft = await productDraftService.createDraft({
      sellerId,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: draft
    });
  });

  /**
   * Get my drafts
   * GET /api/drafts/my-drafts
   */
  getMyDrafts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const sellerId = req.user!.id;
    const status = req.query.status as DraftStatus | undefined;

    const drafts = await productDraftService.getDraftsBySeller(sellerId, status);

    res.json({
      success: true,
      data: drafts
    });
  });

  /**
   * Get draft by ID
   * GET /api/drafts/:id
   */
  getDraftById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const sellerId = req.user!.id;

    const draft = await productDraftService.getDraftById(id, sellerId);

    res.json({
      success: true,
      data: draft
    });
  });

  /**
   * Update draft
   * PUT /api/drafts/:id
   */
  updateDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const sellerId = req.user!.id;

    const draft = await productDraftService.updateDraft(id, sellerId, req.body);

    res.json({
      success: true,
      data: draft
    });
  });

  /**
   * Submit draft for review
   * POST /api/drafts/:id/submit
   */
  submitDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const sellerId = req.user!.id;

    const draft = await productDraftService.submitForReview(id, sellerId);

    res.json({
      success: true,
      message: 'Draft submitted for review',
      data: draft
    });
  });

  /**
   * Delete draft
   * DELETE /api/drafts/:id
   */
  deleteDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const sellerId = req.user!.id;

    await productDraftService.deleteDraft(id, sellerId);

    res.json({
      success: true,
      message: 'Draft deleted successfully'
    });
  });
}

export const draftController = new DraftController();
