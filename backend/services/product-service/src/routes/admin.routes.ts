import { Router } from 'express';
import { body, param } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';

const router:Router = Router();
const controller = new AdminController();

/**
 * @swagger
 * /api/admin/products:
 *   post:
 *     summary: Create a new product (Admin)
 *     tags: [Admin - Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [factoryId, categoryId, sku, name, basePrice, moq]
 *             properties:
 *               factoryId:
 *                 type: string
 *                 format: uuid
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               basePrice:
 *                 type: number
 *               costPrice:
 *                 type: number
 *               moq:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Product with this SKU already exists
 */
router.post('/products', [
  body('categoryId').isUUID().withMessage('Invalid category ID'),
  body('sellerId').optional().isUUID().withMessage('Invalid seller ID'),
  body('name').notEmpty().withMessage('Product name is required'),
  body('baseSellPrice').isNumeric().withMessage('Base sell price must be a number')
], controller.createProduct);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   put:
 *     summary: Update a product (Admin)
 *     tags: [Admin - Products]
 *     parameters:
 *       - in: path
 *         name: id
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
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put('/products/:id', [
  param('id').isUUID().withMessage('Invalid product ID')
], controller.updateProduct);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin)
 *     tags: [Admin - Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete('/products/:id', [
  param('id').isUUID().withMessage('Invalid product ID')
], controller.deleteProduct);

/**
 * @swagger
 * /api/admin/products/{id}/status:
 *   put:
 *     summary: Update product status (Admin)
 *     tags: [Admin - Products]
 *     parameters:
 *       - in: path
 *         name: id
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, active, archived]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: Product not found
 */
router.put('/products/:id/status', [
  param('id').isUUID().withMessage('Invalid product ID'),
  body('status').isIn(['draft', 'active', 'archived']).withMessage('Invalid status')
], controller.updateProductStatus);

// Variant Routes
/**
 * @swagger
 * /api/admin/products/{id}/variants:
 *   post:
 *     summary: Add variant to product (Admin)
 *     tags: [Admin - Variants]
 *     parameters:
 *       - in: path
 *         name: id
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
 *             required: [sku, variantName]
 *             properties:
 *               sku:
 *                 type: string
 *               variantName:
 *                 type: string
 *               priceAdjustment:
 *                 type: number
 *               stockQuantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Variant created successfully
 *       409:
 *         description: Variant with this SKU already exists
 */
router.post('/products/:id/variants', [
  param('id').isUUID().withMessage('Invalid product ID'),
  body('sku').notEmpty().withMessage('SKU is required'),
  body('variantName').notEmpty().withMessage('Variant name is required')
], controller.createVariant);

/**
 * @swagger
 * /api/admin/products/{id}/variants/{variantId}:
 *   put:
 *     summary: Update variant (Admin)
 *     tags: [Admin - Variants]
 */
router.put('/products/:id/variants/:variantId', [
  param('id').isUUID().withMessage('Invalid product ID'),
  param('variantId').isUUID().withMessage('Invalid variant ID')
], controller.updateVariant);

/**
 * @swagger
 * /api/admin/products/{id}/variants/{variantId}:
 *   delete:
 *     summary: Delete variant (Admin)
 *     tags: [Admin - Variants]
 */
router.delete('/products/:id/variants/:variantId', [
  param('id').isUUID().withMessage('Invalid product ID'),
  param('variantId').isUUID().withMessage('Invalid variant ID')
], controller.deleteVariant);

// Image Routes
/**
 * @swagger
 * /api/admin/products/{id}/images:
 *   post:
 *     summary: Add images to product (Admin)
 *     tags: [Admin - Images]
 *     parameters:
 *       - in: path
 *         name: id
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
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                     altText:
 *                       type: string
 *                     displayOrder:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Images added successfully
 */
router.post('/products/:id/images', [
  param('id').isUUID().withMessage('Invalid product ID'),
  body('images').isArray({ min: 1 }).withMessage('Images array is required')
], controller.addImages);

/**
 * @swagger
 * /api/admin/products/{id}/images/reorder:
 *   put:
 *     summary: Reorder product images (Admin)
 *     tags: [Admin - Images]
 */
router.put('/products/:id/images/reorder', [
  param('id').isUUID().withMessage('Invalid product ID'),
  body('imageOrder').isArray().withMessage('Image order array is required')
], controller.reorderImages);

/**
 * @swagger
 * /api/admin/products/{id}/images/{imageId}:
 *   delete:
 *     summary: Delete product image (Admin)
 *     tags: [Admin - Images]
 */
router.delete('/products/:id/images/:imageId', [
  param('id').isUUID().withMessage('Invalid product ID'),
  param('imageId').isUUID().withMessage('Invalid image ID')
], controller.deleteImage);

// Bulk Operations
/**
 * @swagger
 * /api/admin/products/bulk/import:
 *   post:
 *     summary: Import products from CSV (Admin)
 *     tags: [Admin - Bulk Operations]
 *     responses:
 *       501:
 *         description: Not implemented
 */
router.post('/products/bulk/import', controller.bulkImport);

/**
 * @swagger
 * /api/admin/products/bulk/update:
 *   post:
 *     summary: Bulk update products (Admin)
 *     tags: [Admin - Bulk Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [products]
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     data:
 *                       type: object
 *     responses:
 *       200:
 *         description: Products updated successfully
 */
router.post('/products/bulk/update', [
  body('products').isArray({ min: 1 }).withMessage('Products array is required')
], controller.bulkUpdate);

/**
 * @swagger
 * /api/admin/products/bulk/delete:
 *   post:
 *     summary: Bulk delete products (Admin)
 *     tags: [Admin - Bulk Operations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productIds]
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Products deleted successfully
 */
router.post('/products/bulk/delete', [
  body('productIds').isArray({ min: 1 }).withMessage('Product IDs array is required')
], controller.bulkDelete);

// Category Routes
/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create a category (Admin)
 *     tags: [Admin - Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 format: uuid
 *               iconUrl:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Category created successfully
 *       409:
 *         description: Category with this name already exists
 */
router.post('/categories', [
  body('name').notEmpty().withMessage('Category name is required')
], controller.createCategory);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update a category (Admin)
 *     tags: [Admin - Categories]
 */
router.put('/categories/:id', [
  param('id').isUUID().withMessage('Invalid category ID')
], controller.updateCategory);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete a category (Admin)
 *     tags: [Admin - Categories]
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with products or children
 *       404:
 *         description: Category not found
 */
router.delete('/categories/:id', [
  param('id').isUUID().withMessage('Invalid category ID')
], controller.deleteCategory);

export default router;