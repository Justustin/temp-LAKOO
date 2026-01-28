import { Router, IRouter } from 'express';
import { body, param, query } from 'express-validator';
import { gatewayAuth, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { moderationController } from '../controllers/moderation.controller';

const router: IRouter = Router();

// All moderation routes require authentication
router.use(gatewayAuth);

// ============ User Routes (Report Content) ============

// Report content
router.post('/reports',
  [
    body('contentType').isIn(['post', 'comment']).withMessage('Invalid content type'),
    body('contentId').isUUID().withMessage('Invalid content ID'),
    body('reason').isIn(['spam', 'inappropriate', 'harassment', 'misinformation', 'copyright', 'counterfeit', 'other'])
      .withMessage('Invalid reason'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description too long')
  ],
  validateRequest,
  moderationController.reportContent
);

// Get my reports
router.get('/my-reports',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validateRequest,
  moderationController.getMyReports
);

// ============ Moderator Routes (require 'moderator' or 'admin' role) ============

// Get pending reports
router.get('/reports',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validateRequest,
  requireRole('moderator', 'admin'),
  moderationController.getPendingReports
);

// Get report by ID
router.get('/reports/:id',
  [
    param('id').isUUID().withMessage('Invalid report ID')
  ],
  validateRequest,
  requireRole('moderator', 'admin'),
  moderationController.getReportById
);

// Update report status
router.put('/reports/:id/status',
  [
    param('id').isUUID().withMessage('Invalid report ID'),
    body('status').isIn(['under_review', 'resolved', 'dismissed']).withMessage('Invalid status')
  ],
  validateRequest,
  requireRole('moderator', 'admin'),
  moderationController.updateReportStatus
);

// Resolve report with action
router.post('/reports/:id/resolve',
  [
    param('id').isUUID().withMessage('Invalid report ID'),
    body('action').isIn(['none', 'warning', 'content_removed', 'user_suspended', 'user_banned'])
      .withMessage('Invalid action'),
    body('resolution').notEmpty().withMessage('Resolution is required')
      .isLength({ max: 500 }).withMessage('Resolution too long')
  ],
  validateRequest,
  requireRole('moderator', 'admin'),
  moderationController.resolveReport
);

// Dismiss report
router.post('/reports/:id/dismiss',
  [
    param('id').isUUID().withMessage('Invalid report ID'),
    body('reason').notEmpty().withMessage('Reason is required')
      .isLength({ max: 500 }).withMessage('Reason too long')
  ],
  validateRequest,
  requireRole('moderator', 'admin'),
  moderationController.dismissReport
);

export default router;
