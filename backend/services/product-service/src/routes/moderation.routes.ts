import { Router } from 'express';
import { body } from 'express-validator';
import { gatewayAuth, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { moderationController } from '../controllers/moderation.controller';

const router = Router();

// All moderation routes require gateway authentication AND admin/moderator role
router.use(gatewayAuth);
router.use(requireRole('admin', 'moderator'));

// =============================================================================
// Validation Rules
// =============================================================================

const rejectDraftValidators = [
  body('reason')
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters')
];

const requestChangesValidators = [
  body('feedback')
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Feedback must be between 10 and 500 characters')
];

const updatePriorityValidators = [
  body('priority')
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, normal, high, urgent')
];

// =============================================================================
// Routes
// =============================================================================

/**
 * @route   GET /api/moderation/pending
 * @desc    Get pending drafts for moderation
 * @access  Admin/Moderator
 * @query   limit?: number, offset?: number
 */
router.get(
  '/pending',
  moderationController.getPendingDrafts
);

/**
 * @route   GET /api/moderation/queue
 * @desc    Get moderation queue
 * @access  Admin/Moderator
 * @query   limit?: number, offset?: number
 */
router.get(
  '/queue',
  moderationController.getQueue
);

/**
 * @route   GET /api/moderation/my-queue
 * @desc    Get my assigned moderation queue
 * @access  Admin/Moderator
 * @query   includeCompleted?: boolean
 */
router.get(
  '/my-queue',
  moderationController.getMyQueue
);

/**
 * @route   POST /api/moderation/:id/assign
 * @desc    Assign draft to current moderator
 * @access  Admin/Moderator
 */
router.post(
  '/:id/assign',
  moderationController.assignDraft
);

/**
 * @route   POST /api/moderation/:id/approve
 * @desc    Approve draft and create product
 * @access  Admin/Moderator
 */
router.post(
  '/:id/approve',
  moderationController.approveDraft
);

/**
 * @route   POST /api/moderation/:id/reject
 * @desc    Reject draft with reason
 * @access  Admin/Moderator
 */
router.post(
  '/:id/reject',
  rejectDraftValidators,
  validateRequest,
  moderationController.rejectDraft
);

/**
 * @route   POST /api/moderation/:id/request-changes
 * @desc    Request changes to draft with feedback
 * @access  Admin/Moderator
 */
router.post(
  '/:id/request-changes',
  requestChangesValidators,
  validateRequest,
  moderationController.requestChanges
);

/**
 * @route   POST /api/moderation/:id/priority
 * @desc    Update priority of moderation item
 * @access  Admin/Moderator
 */
router.post(
  '/:id/priority',
  updatePriorityValidators,
  validateRequest,
  moderationController.updatePriority
);

/**
 * @route   GET /api/moderation/stats
 * @desc    Get moderation statistics
 * @access  Admin/Moderator
 */
router.get(
  '/stats',
  moderationController.getStats
);

export default router;
