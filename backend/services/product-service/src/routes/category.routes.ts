import { Router } from 'express';
import { prisma } from '../lib/prisma';
import slugify from 'slugify';

const router:Router = Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: Filter by parent category ID (null for root categories)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get('/', async (req, res) => {
  try {
    const { parentId, isActive } = req.query;
    
    const where: any = {};
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { 
            products: true,
            children: true // subcategories count
          }
        },
        parent: { // parent category
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    
    res.json(categories);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID with subcategories
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        children: { // subcategories
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        parent: { // parent
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
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
 *                 example: Batik & Textiles
 *               description:
 *                 type: string
 *                 example: Traditional Indonesian fabrics
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 description: Parent category ID (for subcategories)
 *               iconUrl:
 *                 type: string
 *                 example: https://example.com/icon.svg
 *               displayOrder:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, parentId, iconUrl, displayOrder } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const slug = slugify(name, { lower: true, strict: true });

    // Check if slug already exists
    const existing = await prisma.category.findUnique({
      where: { slug }
    });

    if (existing) {
      return res.status(400).json({ 
        error: 'Category with this name already exists (slug conflict)' 
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        parentId: parentId || null,
        iconUrl: iconUrl || null,
        displayOrder: displayOrder || 0,
        isActive: true
      }
    });
    
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Update category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               parentId:
 *                 type: string
 *               iconUrl:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated
 *       404:
 *         description: Category not found
 */
router.patch('/:id', async (req, res) => {
  try {
    const { name, parentId, iconUrl, displayOrder, isActive } = req.body;
    
    const updateData: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = slugify(name, { lower: true, strict: true });
    }
    if (parentId !== undefined) updateData.parentId = parentId;
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(category);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete category (soft delete - sets is_active to false)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       204:
 *         description: Category deleted
 *       404:
 *         description: Category not found
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.category.update({
      where: { id: req.params.id },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });
    
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;