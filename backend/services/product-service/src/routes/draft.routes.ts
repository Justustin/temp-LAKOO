import { Router } from 'express';
import { body } from 'express-validator';
import { gatewayAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { draftController } from '../controllers/draft.controller';

const router = Router();

// All draft routes require gateway authentication
router.use(gatewayAuth);

// =============================================================================
// Validation Rules
// =============================================================================

const createDraftValidators = [
  body('categoryId')
    .isUUID()
    .withMessage('Valid category ID is required'),
  body('name')
    .isString()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Name must be between 3 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('shortDescription')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Short description must be less than 500 characters'),
  body('baseSellPrice')
    .isNumeric()
    .custom((value) => value > 0)
    .withMessage('Base sell price must be greater than 0'),
  body('images')
    .isArray({ min: 3 })
    .withMessage('At least 3 images are required'),
  body('images.*')
    .isURL()
    .withMessage('Each image must be a valid URL'),
  body('variants')
    .isArray({ min: 1 })
    .withMessage('At least 1 variant is required'),
  body('variants.*.color')
    .isString()
    .notEmpty()
    .withMessage('Variant color is required'),
  body('variants.*.size')
    .isString()
    .notEmpty()
    .withMessage('Variant size is required'),
  body('variants.*.sellPrice')
    .isNumeric()
    .custom((value) => value > 0)
    .withMessage('Variant sell price must be greater than 0'),
  body('weightGrams')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Weight must be a positive integer'),
  body('material')
    .optional()
    .isString()
    .withMessage('Material must be a string'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const updateDraftValidators = [
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('Valid category ID is required'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Name must be between 3 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('baseSellPrice')
    .optional()
    .isNumeric()
    .custom((value) => value > 0)
    .withMessage('Base sell price must be greater than 0'),
  body('images')
    .optional()
    .isArray({ min: 3 })
    .withMessage('At least 3 images are required'),
  body('variants')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least 1 variant is required')
];

// =============================================================================
// Routes
// =============================================================================

/**
 * @route   POST /api/drafts
 * @desc    Create a new product draft
 * @access  Seller (authenticated)
 */
router.post(
  '/',
  createDraftValidators,
  validateRequest,
  draftController.createDraft
);

/**
 * @route   GET /api/drafts/my-drafts
 * @desc    Get my drafts (optionally filter by status)
 * @access  Seller (authenticated)
 * @query   status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested'
 */
router.get(
  '/my-drafts',
  draftController.getMyDrafts
);

/**
 * @route   GET /api/drafts/:id
 * @desc    Get draft by ID (own drafts only)
 * @access  Seller (authenticated)
 */
router.get(
  '/:id',
  draftController.getDraftById
);

/**
 * @route   PUT /api/drafts/:id
 * @desc    Update draft (only if status is 'draft' or 'changes_requested')
 * @access  Seller (authenticated)
 */
router.put(
  '/:id',
  updateDraftValidators,
  validateRequest,
  draftController.updateDraft
);

/**
 * @route   POST /api/drafts/:id/submit
 * @desc    Submit draft for review
 * @access  Seller (authenticated)
 */
router.post(
  '/:id/submit',
  draftController.submitDraft
);

/**
 * @route   DELETE /api/drafts/:id
 * @desc    Delete draft (only if status is 'draft', 'rejected', or 'changes_requested')
 * @access  Seller (authenticated)
 */
router.delete(
  '/:id',
  draftController.deleteDraft
);

export default router;
