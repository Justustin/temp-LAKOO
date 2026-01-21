import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param, query } from 'express-validator';

/**
 * Middleware to check express-validator results
 * Use after validator array in route definitions
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : err.type,
        message: err.msg
      }))
    });
    return;
  }
  next();
};

// =============================================================================
// Brand Validators
// =============================================================================

export const createBrandValidators = [
  body('brandCode')
    .isString()
    .notEmpty()
    .withMessage('brandCode is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('brandCode must be 2-20 characters'),
  body('brandName')
    .isString()
    .notEmpty()
    .withMessage('brandName is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('brandName must be 2-100 characters'),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('logoUrl must be a valid URL'),
  body('bannerUrl')
    .optional()
    .isURL()
    .withMessage('bannerUrl must be a valid URL'),
  body('primaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('primaryColor must be a valid hex color'),
  body('secondaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('secondaryColor must be a valid hex color'),
  body('brandStory')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('brandStory must be at most 5000 characters'),
  body('tagline')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('tagline must be at most 200 characters'),
  body('targetAudience')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('targetAudience must be at most 500 characters'),
  body('styleCategory')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('styleCategory must be at most 100 characters'),
  body('defaultMarginPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('defaultMarginPercent must be between 0 and 100'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('displayOrder must be a non-negative integer')
];

export const updateBrandValidators = [
  param('id')
    .isUUID()
    .withMessage('Invalid brand ID'),
  body('brandName')
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('brandName must be 2-100 characters'),
  body('logoUrl')
    .optional()
    .isURL()
    .withMessage('logoUrl must be a valid URL'),
  body('bannerUrl')
    .optional()
    .isURL()
    .withMessage('bannerUrl must be a valid URL'),
  body('primaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('primaryColor must be a valid hex color'),
  body('secondaryColor')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('secondaryColor must be a valid hex color'),
  body('brandStory')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('brandStory must be at most 5000 characters'),
  body('tagline')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('tagline must be at most 200 characters'),
  body('targetAudience')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('targetAudience must be at most 500 characters'),
  body('styleCategory')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('styleCategory must be at most 100 characters'),
  body('defaultMarginPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('defaultMarginPercent must be between 0 and 100'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('status must be active, inactive, or draft'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('displayOrder must be a non-negative integer')
];

export const brandIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid brand ID')
];

export const brandSlugValidator = [
  param('slug')
    .isString()
    .notEmpty()
    .withMessage('slug is required')
];

export const getBrandsQueryValidators = [
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('status must be active, inactive, or draft'),
  query('search')
    .optional()
    .isString(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
];

// =============================================================================
// Brand Product Validators
// =============================================================================

export const addBrandProductValidators = [
  param('brandId')
    .isUUID()
    .withMessage('Invalid brand ID'),
  body('productId')
    .isUUID()
    .withMessage('productId must be a valid UUID'),
  body('brandPrice')
    .isFloat({ min: 0.01 })
    .withMessage('brandPrice must be greater than 0'),
  body('brandComparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('brandComparePrice must be non-negative'),
  body('discountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('discountPercent must be between 0 and 100'),
  body('brandProductName')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('brandProductName must be at most 200 characters'),
  body('brandDescription')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('brandDescription must be at most 5000 characters'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('displayOrder must be a non-negative integer'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  body('isBestseller')
    .optional()
    .isBoolean()
    .withMessage('isBestseller must be a boolean'),
  body('isNewArrival')
    .optional()
    .isBoolean()
    .withMessage('isNewArrival must be a boolean')
];

export const updateBrandProductValidators = [
  param('brandId')
    .isUUID()
    .withMessage('Invalid brand ID'),
  param('productId')
    .isUUID()
    .withMessage('Invalid product ID'),
  body('brandPrice')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('brandPrice must be greater than 0'),
  body('brandComparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('brandComparePrice must be non-negative'),
  body('discountPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('discountPercent must be between 0 and 100'),
  body('brandProductName')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('brandProductName must be at most 200 characters'),
  body('brandDescription')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('brandDescription must be at most 5000 characters'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('displayOrder must be a non-negative integer'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  body('isBestseller')
    .optional()
    .isBoolean()
    .withMessage('isBestseller must be a boolean'),
  body('isNewArrival')
    .optional()
    .isBoolean()
    .withMessage('isNewArrival must be a boolean'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

export const brandProductParamsValidators = [
  param('brandId')
    .isUUID()
    .withMessage('Invalid brand ID'),
  param('productId')
    .isUUID()
    .withMessage('Invalid product ID')
];

export const getBrandProductsQueryValidators = [
  param('brandId')
    .isUUID()
    .withMessage('Invalid brand ID'),
  query('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  query('isBestseller')
    .optional()
    .isBoolean()
    .withMessage('isBestseller must be a boolean'),
  query('isNewArrival')
    .optional()
    .isBoolean()
    .withMessage('isNewArrival must be a boolean'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
];

export const limitQueryValidator = [
  param('brandId')
    .isUUID()
    .withMessage('Invalid brand ID'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
];
