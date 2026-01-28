import { prisma } from '../lib/prisma';
import type { Product } from '../generated/prisma';
import { CreateProductDTO, UpdateProductDTO, ProductQuery, CreateVariantDTO } from '../types';
import slugify from 'slugify';

// Generate unique product code
function generateProductCode(): string {
  const prefix = 'PRD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

export class ProductRepository {
  async create(data: CreateProductDTO): Promise<Product> {
    const slug = slugify(data.name, { lower: true, strict: true });
    const productCode = generateProductCode();

    return prisma.product.create({
      data: {
        categoryId: data.categoryId,
        sellerId: data.sellerId || null,
        productCode,
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        baseCostPrice: data.baseCostPrice || 0,
        baseSellPrice: data.baseSellPrice,
        weightGrams: data.weightGrams,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        primaryImageUrl: data.primaryImageUrl,
        material: data.material,
        careInstructions: data.careInstructions,
        countryOfOrigin: data.countryOfOrigin,
        tags: data.tags || [],
        grosirUnitSize: data.grosirUnitSize,
        status: 'draft'
      },
      include: {
        category: true
      }
    });
  }

  async findAll(query: ProductQuery) {
    const { sellerId, categoryId, status, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null
    };
    if (sellerId) where.sellerId = sellerId;
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { productCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          images: {
            orderBy: { displayOrder: 'asc' }
          },
          variants: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: {
          orderBy: { displayOrder: 'asc' }
        },
        variants: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
  }

  async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: { displayOrder: 'asc' }
        },
        variants: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
  }

  async update(id: string, data: UpdateProductDTO) {
    const updateData: any = {};

    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = slugify(data.name, { lower: true, strict: true });
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.baseCostPrice !== undefined) updateData.baseCostPrice = data.baseCostPrice;
    if (data.baseSellPrice !== undefined) updateData.baseSellPrice = data.baseSellPrice;
    if (data.weightGrams !== undefined) updateData.weightGrams = data.weightGrams;
    if (data.lengthCm !== undefined) updateData.lengthCm = data.lengthCm;
    if (data.widthCm !== undefined) updateData.widthCm = data.widthCm;
    if (data.heightCm !== undefined) updateData.heightCm = data.heightCm;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.primaryImageUrl !== undefined) updateData.primaryImageUrl = data.primaryImageUrl;
    if (data.material !== undefined) updateData.material = data.material;
    if (data.careInstructions !== undefined) updateData.careInstructions = data.careInstructions;
    if (data.countryOfOrigin !== undefined) updateData.countryOfOrigin = data.countryOfOrigin;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.grosirUnitSize !== undefined) updateData.grosirUnitSize = data.grosirUnitSize;

    return prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        images: true,
        variants: {
          where: { deletedAt: null }
        }
      }
    });
  }

  async delete(id: string) {
    // Soft delete
    return prisma.product.update({
      where: { id },
      data: {
        status: 'inactive',
        deletedAt: new Date()
      }
    });
  }

  async publish(id: string) {
    return prisma.product.update({
      where: { id },
      data: {
        status: 'approved',
        publishedAt: new Date()
      }
    });
  }

  async addImages(productId: string, images: { imageUrl: string; sortOrder: number; altText?: string }[]) {
    return prisma.productImage.createMany({
      data: images.map((img, idx) => ({
        productId,
        imageUrl: img.imageUrl,
        displayOrder: img.sortOrder || idx,
        altText: img.altText,
        isPrimary: idx === 0
      }))
    });
  }

  async createVariant(data: CreateVariantDTO) {
    return prisma.productVariant.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        color: data.color,
        colorHex: data.colorHex,
        colorName: data.colorName,
        size: data.size,
        sizeName: data.sizeName,
        material: data.material,
        style: data.style,
        costPrice: data.costPrice,
        sellPrice: data.sellPrice,
        weightGrams: data.weightGrams,
        imageUrl: data.imageUrl,
        barcode: data.barcode,
        sortOrder: data.sortOrder || 0,
        isDefault: data.isDefault || false
      }
    });
  }

  async findVariantById(variantId: string) {
    return prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productCode: true,
            sellerId: true,
            baseSellPrice: true
          }
        }
      }
    });
  }
}
