import { Router, type Router as ExpressRouter } from 'express';
import { BrandController } from '../controllers/brand.controller';
import { gatewayOrInternalAuth, requireRole } from '../middleware/auth';
import {
  validateRequest,
  createBrandValidators,
  updateBrandValidators,
  brandIdValidator,
  brandSlugValidator,
  getBrandsQueryValidators,
  addBrandProductValidators,
  updateBrandProductValidators,
  brandProductParamsValidators,
  getBrandProductsQueryValidators,
  limitQueryValidator
} from '../middleware/validation';

const router: ExpressRouter = Router();
const controller = new BrandController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Brand:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         brand_code:
 *           type: string
 *         brand_name:
 *           type: string
 *         slug:
 *           type: string
 *         logo_url:
 *           type: string
 *         banner_url:
 *           type: string
 *         primary_color:
 *           type: string
 *         secondary_color:
 *           type: string
 *         brand_story:
 *           type: string
 *         tagline:
 *           type: string
 *         target_audience:
 *           type: string
 *         style_category:
 *           type: string
 *         default_margin_percent:
 *           type: number
 *         status:
 *           type: string
 *           enum: [active, inactive, draft]
 *         display_order:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     BrandProduct:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         brand_id:
 *           type: string
 *           format: uuid
 *         product_id:
 *           type: string
 *           format: uuid
 *         brand_price:
 *           type: number
 *         brand_compare_price:
 *           type: number
 *         discount_percent:
 *           type: number
 *         brand_product_name:
 *           type: string
 *         brand_description:
 *           type: string
 *         display_order:
 *           type: integer
 *         is_featured:
 *           type: boolean
 *         is_bestseller:
 *           type: boolean
 *         is_new_arrival:
 *           type: boolean
 *         is_active:
 *           type: boolean
 *   securitySchemes:
 *     GatewayAuth:
 *       type: apiKey
 *       in: header
 *       name: x-gateway-key
 *     ServiceAuth:
 *       type: apiKey
 *       in: header
 *       name: x-service-auth
 */

// ==================== Public Routes (with optional auth) ====================

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Get all brands
 *     tags: [Brands]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, draft]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of brands
 */
router.get('/', getBrandsQueryValidators, validateRequest, controller.getBrands);

/**
 * @swagger
 * /api/brands/slug/{slug}:
 *   get:
 *     summary: Get brand by slug
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brand details
 *       404:
 *         description: Brand not found
 */
router.get('/slug/:slug', brandSlugValidator, validateRequest, controller.getBrandBySlug);

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Brand details
 *       404:
 *         description: Brand not found
 */
router.get('/:id', brandIdValidator, validateRequest, controller.getBrandById);

// ==================== Brand Product Public Routes ====================

/**
 * @swagger
 * /api/brands/{brandId}/products:
 *   get:
 *     summary: Get all products in a brand
 *     tags: [Brand Products]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isBestseller
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isNewArrival
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of brand products
 *       404:
 *         description: Brand not found
 */
router.get('/:brandId/products', getBrandProductsQueryValidators, validateRequest, controller.getBrandProducts);

/**
 * @swagger
 * /api/brands/{brandId}/products/featured:
 *   get:
 *     summary: Get featured products for a brand
 *     tags: [Brand Products]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Featured products
 *       404:
 *         description: Brand not found
 */
router.get('/:brandId/products/featured', limitQueryValidator, validateRequest, controller.getFeaturedProducts);

/**
 * @swagger
 * /api/brands/{brandId}/products/bestsellers:
 *   get:
 *     summary: Get bestseller products for a brand
 *     tags: [Brand Products]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bestseller products
 *       404:
 *         description: Brand not found
 */
router.get('/:brandId/products/bestsellers', limitQueryValidator, validateRequest, controller.getBestsellers);

/**
 * @swagger
 * /api/brands/{brandId}/products/new-arrivals:
 *   get:
 *     summary: Get new arrival products for a brand
 *     tags: [Brand Products]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: New arrival products
 *       404:
 *         description: Brand not found
 */
router.get('/:brandId/products/new-arrivals', limitQueryValidator, validateRequest, controller.getNewArrivals);

/**
 * @swagger
 * /api/brands/{brandId}/products/{productId}:
 *   get:
 *     summary: Get a specific brand product
 *     tags: [Brand Products]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Brand product details
 *       404:
 *         description: Brand product not found
 */
router.get('/:brandId/products/:productId', brandProductParamsValidators, validateRequest, controller.getBrandProduct);

// ==================== Protected Routes (require auth) ====================

// All routes below require authentication
router.use(gatewayOrInternalAuth);

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Create a new brand
 *     tags: [Brands]
 *     security:
 *       - GatewayAuth: []
 *       - ServiceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brandCode
 *               - brandName
 *             properties:
 *               brandCode:
 *                 type: string
 *               brandName:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *               bannerUrl:
 *                 type: string
 *               primaryColor:
 *                 type: string
 *               secondaryColor:
 *                 type: string
 *               brandStory:
 *                 type: string
 *               tagline:
 *                 type: string
 *               targetAudience:
 *                 type: string
 *               styleCategory:
 *                 type: string
 *               defaultMarginPercent:
 *                 type: number
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Brand created successfully
 *       409:
 *         description: Brand code already exists
 */
router.post('/', createBrandValidators, validateRequest, controller.createBrand);

/**
 * @swagger
 * /api/brands/{id}:
 *   patch:
 *     summary: Update a brand
 *     tags: [Brands]
 *     security:
 *       - GatewayAuth: []
 *       - ServiceAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brandName:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *               bannerUrl:
 *                 type: string
 *               primaryColor:
 *                 type: string
 *               secondaryColor:
 *                 type: string
 *               brandStory:
 *                 type: string
 *               tagline:
 *                 type: string
 *               targetAudience:
 *                 type: string
 *               styleCategory:
 *                 type: string
 *               defaultMarginPercent:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Brand updated successfully
 *       404:
 *         description: Brand not found
 */
router.patch('/:id', updateBrandValidators, validateRequest, controller.updateBrand);

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Delete a brand (soft delete)
 *     tags: [Brands]
 *     security:
 *       - GatewayAuth: []
 *       - ServiceAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Brand deleted successfully
 *       404:
 *         description: Brand not found
 */
router.delete('/:id', brandIdValidator, validateRequest, controller.deleteBrand);

// ==================== Brand Products Protected Routes ====================

/**
 * @swagger
 * /api/brands/{brandId}/products:
 *   post:
 *     summary: Add a product to a brand
 *     tags: [Brand Products]
 *     security:
 *       - GatewayAuth: []
 *       - ServiceAuth: []
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - brandPrice
 *             properties:
 *               productId:
 *                 type: string
 *                 format: uuid
 *               brandPrice:
 *                 type: number
 *               brandComparePrice:
 *                 type: number
 *               discountPercent:
 *                 type: number
 *               brandProductName:
 *                 type: string
 *               brandDescription:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isFeatured:
 *                 type: boolean
 *               isBestseller:
 *                 type: boolean
 *               isNewArrival:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product added to brand
 *       404:
 *         description: Brand not found
 *       409:
 *         description: Product already exists in brand
 */
router.post('/:brandId/products', addBrandProductValidators, validateRequest, controller.addProductToBrand);

/**
 * @swagger
 * /api/brands/{brandId}/products/{productId}:
 *   patch:
 *     summary: Update a brand product
 *     tags: [Brand Products]
 *     security:
 *       - GatewayAuth: []
 *       - ServiceAuth: []
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brandPrice:
 *                 type: number
 *               brandComparePrice:
 *                 type: number
 *               discountPercent:
 *                 type: number
 *               brandProductName:
 *                 type: string
 *               brandDescription:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isFeatured:
 *                 type: boolean
 *               isBestseller:
 *                 type: boolean
 *               isNewArrival:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Brand product updated
 *       404:
 *         description: Brand product not found
 */
router.patch('/:brandId/products/:productId', updateBrandProductValidators, validateRequest, controller.updateBrandProduct);

/**
 * @swagger
 * /api/brands/{brandId}/products/{productId}:
 *   delete:
 *     summary: Remove a product from a brand
 *     tags: [Brand Products]
 *     security:
 *       - GatewayAuth: []
 *       - ServiceAuth: []
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Product removed from brand
 *       404:
 *         description: Brand product not found
 */
router.delete('/:brandId/products/:productId', brandProductParamsValidators, validateRequest, controller.removeProductFromBrand);

export default router;
