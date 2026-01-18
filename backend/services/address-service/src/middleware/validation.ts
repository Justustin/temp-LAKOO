import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param } from 'express-validator';

/**
 * Middleware to check express-validator results and return 400 if validation failed.
 * Use AFTER validator arrays in route definitions.
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  return next();
};

// =============================================================================
// ADDRESS VALIDATORS
// =============================================================================

export const createAddressValidators = [
  // userId is derived from authenticated user, not from body
  body('recipientName').notEmpty().withMessage('recipientName is required'),
  body('phoneNumber').notEmpty().withMessage('phoneNumber is required'),
  body('streetAddress').notEmpty().withMessage('streetAddress is required'),
  body('cityName').notEmpty().withMessage('cityName is required'),
  body('provinceName').notEmpty().withMessage('provinceName is required'),
  body('postalCode').notEmpty().withMessage('postalCode is required'),
  // Optional fields
  body('label').optional().isString(),
  body('alternatePhone').optional().isString(),
  body('addressLine2').optional().isString(),
  body('rt').optional().isString(),
  body('rw').optional().isString(),
  body('villageId').optional().isUUID(),
  body('villageName').optional().isString(),
  body('districtId').optional().isUUID(),
  body('districtName').optional().isString(),
  body('cityId').optional().isUUID(),
  body('provinceId').optional().isUUID(),
  body('country').optional().isString(),
  body('countryCode').optional().isString().isLength({ min: 2, max: 2 }),
  body('latitude').optional().isDecimal(),
  body('longitude').optional().isDecimal(),
  body('geoAccuracy').optional().isString(),
  body('biteshipAreaId').optional().isString(),
  body('jneAreaCode').optional().isString(),
  body('jntAreaCode').optional().isString(),
  body('isDefault').optional().isBoolean(),
  body('deliveryNotes').optional().isString(),
  body('landmark').optional().isString()
];

export const updateAddressValidators = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
  // All fields optional for update
  body('label').optional().isString(),
  body('recipientName').optional().isString(),
  body('phoneNumber').optional().isString(),
  body('alternatePhone').optional().isString(),
  body('streetAddress').optional().isString(),
  body('addressLine2').optional().isString(),
  body('rt').optional().isString(),
  body('rw').optional().isString(),
  body('villageId').optional().isUUID(),
  body('villageName').optional().isString(),
  body('districtId').optional().isUUID(),
  body('districtName').optional().isString(),
  body('cityId').optional().isUUID(),
  body('cityName').optional().isString(),
  body('provinceId').optional().isUUID(),
  body('provinceName').optional().isString(),
  body('postalCode').optional().isString(),
  body('country').optional().isString(),
  body('countryCode').optional().isString().isLength({ min: 2, max: 2 }),
  body('latitude').optional().isDecimal(),
  body('longitude').optional().isDecimal(),
  body('geoAccuracy').optional().isString(),
  body('biteshipAreaId').optional().isString(),
  body('jneAreaCode').optional().isString(),
  body('jntAreaCode').optional().isString(),
  body('isDefault').optional().isBoolean(),
  body('deliveryNotes').optional().isString(),
  body('landmark').optional().isString()
];

export const idParamValidator = [
  param('id').isUUID().withMessage('id must be a valid UUID')
];

export const userIdParamValidator = [
  param('userId').isUUID().withMessage('userId must be a valid UUID')
];

export const setDefaultValidators = [
  param('id').isUUID().withMessage('id must be a valid UUID')
];

export const deleteAddressValidators = [
  param('id').isUUID().withMessage('id must be a valid UUID')
];
