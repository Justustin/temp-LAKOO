import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { productDraftService } from '../services/product-draft.service';
import { moderationService } from '../services/moderation.service';
import { ModerationPriority } from '../generated/prisma';

/**
 * Moderation Controller
 *
 * Handles moderation operations (admin/moderator only)
 */

export class ModerationController {
  /**
   * Get pending drafts
   * GET /api/moderation/pending
   */
  getPendingDrafts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const drafts = await productDraftService.getPendingDrafts(limit, offset);

    res.json({
      success: true,
      data: drafts,
      pagination: {
        limit,
        offset,
        total: drafts.length
      }
    });
  });

  /**
   * Get moderation queue
   * GET /api/moderation/queue
   */
  getQueue = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const queue = await moderationService.getPendingQueue(limit, offset);

    res.json({
      success: true,
      data: queue,
      pagination: {
        limit,
        offset,
        total: queue.length
      }
    });
  });

  /**
   * Get my assigned queue
   * GET /api/moderation/my-queue
   */
  getMyQueue = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const moderatorId = req.user!.id;
    const includeCompleted = req.query.includeCompleted === 'true';

    const queue = await moderationService.getAssignedQueue(moderatorId, includeCompleted);

    res.json({
      success: true,
      data: queue
    });
  });

  /**
   * Assign draft to moderator
   * POST /api/moderation/:id/assign
   */
  assignDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: draftId } = req.params;
    const moderatorId = req.user!.id;

    const queue = await moderationService.assignToModerator(draftId, moderatorId);

    res.json({
      success: true,
      message: 'Draft assigned successfully',
      data: queue
    });
  });

  /**
   * Approve draft
   * POST /api/moderation/:id/approve
   */
  approveDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: draftId } = req.params;
    const moderatorId = req.user!.id;

    const result = await productDraftService.approveDraft(draftId, moderatorId);

    res.json({
      success: true,
      message: 'Draft approved and product created',
      data: result
    });
  });

  /**
   * Reject draft
   * POST /api/moderation/:id/reject
   */
  rejectDraft = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: draftId } = req.params;
    const { reason } = req.body;
    const moderatorId = req.user!.id;

    const draft = await productDraftService.rejectDraft(draftId, moderatorId, reason);

    res.json({
      success: true,
      message: 'Draft rejected',
      data: draft
    });
  });

  /**
   * Request changes
   * POST /api/moderation/:id/request-changes
   */
  requestChanges = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: draftId } = req.params;
    const { feedback } = req.body;
    const moderatorId = req.user!.id;

    const draft = await productDraftService.requestChanges(draftId, moderatorId, feedback);

    res.json({
      success: true,
      message: 'Changes requested',
      data: draft
    });
  });

  /**
   * Update priority
   * POST /api/moderation/:id/priority
   */
  updatePriority = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id: draftId } = req.params;
    const { priority } = req.body;

    const queue = await moderationService.updatePriority(draftId, priority as ModerationPriority);

    res.json({
      success: true,
      message: 'Priority updated',
      data: queue
    });
  });

  /**
   * Get moderation statistics
   * GET /api/moderation/stats
   */
  getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stats = await moderationService.getStats();

    res.json({
      success: true,
      data: stats
    });
  });
}

export const moderationController = new ModerationController();
