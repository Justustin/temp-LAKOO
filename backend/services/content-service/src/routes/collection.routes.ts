import { Router, IRouter } from 'express';
import { body, param, query } from 'express-validator';
import { gatewayAuth, optionalGatewayAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { collectionController } from '../controllers/collection.controller';

const router: IRouter = Router();

// ============ Public Routes (optional auth) ============

// Get collection by ID (public if not private)
router.get('/:id',
  [
    param('id').isUUID().withMessage('Invalid collection ID')
  ],
  validateRequest,
  optionalGatewayAuth,
  collectionController.getCollectionById
);

// Get posts in collection (public if collection is public)
router.get('/:id/posts',
  [
    param('id').isUUID().withMessage('Invalid collection ID'),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validateRequest,
  optionalGatewayAuth,
  collectionController.getCollectionPosts
);

// ============ Authenticated Routes ============

router.use(gatewayAuth);

// Get my collections
router.get('/',
  collectionController.getMyCollections
);

// Get my saved posts
router.get('/saved/all',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validateRequest,
  collectionController.getMySavedPosts
);

// Create collection
router.post('/',
  [
    body('name').notEmpty().withMessage('Name is required')
      .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    body('isPrivate').optional().isBoolean().withMessage('isPrivate must be boolean'),
    body('coverImageUrl').optional().isURL().withMessage('Invalid cover image URL')
  ],
  validateRequest,
  collectionController.createCollection
);

// Update collection
router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid collection ID'),
    body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    body('isPrivate').optional().isBoolean().withMessage('isPrivate must be boolean'),
    body('coverImageUrl').optional().isURL().withMessage('Invalid cover image URL')
  ],
  validateRequest,
  collectionController.updateCollection
);

// Delete collection
router.delete('/:id',
  [
    param('id').isUUID().withMessage('Invalid collection ID')
  ],
  validateRequest,
  collectionController.deleteCollection
);

export default router;
