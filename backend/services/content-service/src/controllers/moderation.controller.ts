import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { moderationService } from '../services/moderation.service';

/**
 * Moderation Controller
 * 
 * Handles HTTP requests for content moderation.
 */
export class ModerationController {
  /**
   * Report content
   * POST /api/moderation/reports
   */
  reportContent = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const report = await moderationService.reportContent(userId, req.body);

    res.status(201).json({
      success: true,
      data: report,
      message: 'Content reported successfully'
    });
  });

  /**
   * Get pending reports (moderators only)
   * GET /api/moderation/reports
   */
  getPendingReports = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const reports = await moderationService.getPendingReports(limit, offset);

    res.json({
      success: true,
      data: reports,
      pagination: {
        limit,
        offset,
        count: reports.length
      }
    });
  });

  /**
   * Get report by ID (moderators only)
   * GET /api/moderation/reports/:id
   */
  getReportById = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const report = await moderationService.getReportById(id);

    res.json({
      success: true,
      data: report
    });
  });

  /**
   * Update report status (moderators only)
   * PUT /api/moderation/reports/:id/status
   */
  updateReportStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status } = req.body;

    const report = await moderationService.updateReportStatus(id, status);

    res.json({
      success: true,
      data: report
    });
  });

  /**
   * Resolve report with action (moderators only)
   * POST /api/moderation/reports/:id/resolve
   */
  resolveReport = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const moderatorId = req.user!.id;

    const report = await moderationService.resolveReport(id, moderatorId, req.body);

    res.json({
      success: true,
      data: report,
      message: 'Report resolved successfully'
    });
  });

  /**
   * Dismiss report (moderators only)
   * POST /api/moderation/reports/:id/dismiss
   */
  dismissReport = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const moderatorId = req.user!.id;
    const { reason } = req.body;

    const report = await moderationService.dismissReport(id, moderatorId, reason);

    res.json({
      success: true,
      data: report,
      message: 'Report dismissed successfully'
    });
  });

  /**
   * Get my reports
   * GET /api/moderation/my-reports
   */
  getMyReports = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const reports = await moderationService.getUserReports(userId, limit, offset);

    res.json({
      success: true,
      data: reports,
      pagination: {
        limit,
        offset,
        count: reports.length
      }
    });
  });
}

// Export singleton instance
export const moderationController = new ModerationController();
