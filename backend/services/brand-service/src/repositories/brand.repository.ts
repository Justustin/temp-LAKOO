import { prisma } from '../lib/prisma';
import slugify from 'slugify';
import {
  CreateBrandDTO,
  UpdateBrandDTO,
  BrandQuery,
  AddBrandProductDTO,
  UpdateBrandProductDTO,
  BrandProductQuery
} from '../types';

export class BrandRepository {
  // ==================== Brand CRUD ====================

  async create(data: CreateBrandDTO) {
    const slug = slugify(data.brandName, { lower: true, strict: true });

    return prisma.brands.create({
      data: {
        brand_code: data.brandCode,
        brand_name: data.brandName,
        slug,
        logo_url: data.logoUrl,
        banner_url: data.bannerUrl,
        primary_color: data.primaryColor || '#000000',
        secondary_color: data.secondaryColor || '#FFFFFF',
        brand_story: data.brandStory,
        tagline: data.tagline,
        target_audience: data.targetAudience,
        style_category: data.styleCategory,
        default_margin_percent: data.defaultMarginPercent || 50.00,
        display_order: data.displayOrder || 0,
        status: 'active'
      }
    });
  }

  async findAll(query: BrandQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { brand_name: { contains: query.search, mode: 'insensitive' } },
        { brand_code: { contains: query.search, mode: 'insensitive' } },
        { tagline: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [brands, total] = await Promise.all([
      prisma.brands.findMany({
        where,
        orderBy: [
          { display_order: 'asc' },
          { brand_name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.brands.count({ where })
    ]);

    return {
      brands,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findById(id: string) {
    return prisma.brands.findUnique({
      where: { id },
      include: {
        _count: {
          select: { brand_products: true }
        }
      }
    });
  }

  async findBySlug(slug: string) {
    return prisma.brands.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { brand_products: true }
        }
      }
    });
  }

  async findByCode(brandCode: string) {
    return prisma.brands.findUnique({
      where: { brand_code: brandCode }
    });
  }

  async update(id: string, data: UpdateBrandDTO) {
    const updateData: any = {
      updated_at: new Date()
    };

    if (data.brandName !== undefined) {
      updateData.brand_name = data.brandName;
      updateData.slug = slugify(data.brandName, { lower: true, strict: true });
    }
    if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;
    if (data.bannerUrl !== undefined) updateData.banner_url = data.bannerUrl;
    if (data.primaryColor !== undefined) updateData.primary_color = data.primaryColor;
    if (data.secondaryColor !== undefined) updateData.secondary_color = data.secondaryColor;
    if (data.brandStory !== undefined) updateData.brand_story = data.brandStory;
    if (data.tagline !== undefined) updateData.tagline = data.tagline;
    if (data.targetAudience !== undefined) updateData.target_audience = data.targetAudience;
    if (data.styleCategory !== undefined) updateData.style_category = data.styleCategory;
    if (data.defaultMarginPercent !== undefined) updateData.default_margin_percent = data.defaultMarginPercent;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;

    return prisma.brands.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string) {
    // Soft delete by setting status to inactive
    return prisma.brands.update({
      where: { id },
      data: {
        status: 'inactive',
        updated_at: new Date()
      }
    });
  }

  // ==================== Brand Products ====================

  async addProduct(brandId: string, data: AddBrandProductDTO) {
    return prisma.brand_products.create({
      data: {
        brand_id: brandId,
        product_id: data.productId,
        brand_price: data.brandPrice,
        brand_compare_price: data.brandComparePrice,
        discount_percent: data.discountPercent,
        brand_product_name: data.brandProductName,
        brand_description: data.brandDescription,
        display_order: data.displayOrder || 0,
        is_featured: data.isFeatured || false,
        is_bestseller: data.isBestseller || false,
        is_new_arrival: data.isNewArrival || false,
        is_active: true
      },
      include: {
        products: {
          select: {
            id: true,
            sku: true,
            name: true,
            slug: true,
            primary_image_url: true,
            cost_price: true
          }
        }
      }
    });
  }

  async findBrandProducts(brandId: string, query: BrandProductQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      brand_id: brandId
    };

    if (query.isFeatured !== undefined) where.is_featured = query.isFeatured;
    if (query.isBestseller !== undefined) where.is_bestseller = query.isBestseller;
    if (query.isNewArrival !== undefined) where.is_new_arrival = query.isNewArrival;
    if (query.isActive !== undefined) where.is_active = query.isActive;

    const [products, total] = await Promise.all([
      prisma.brand_products.findMany({
        where,
        orderBy: [
          { display_order: 'asc' },
          { created_at: 'desc' }
        ],
        skip,
        take: limit,
        include: {
          products: {
            select: {
              id: true,
              sku: true,
              name: true,
              slug: true,
              description: true,
              primary_image_url: true,
              cost_price: true,
              weight_grams: true,
              categories: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              },
              product_images: {
                take: 5,
                orderBy: { display_order: 'asc' }
              }
            }
          }
        }
      }),
      prisma.brand_products.count({ where })
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

  async findBrandProduct(brandId: string, productId: string) {
    return prisma.brand_products.findUnique({
      where: {
        brand_id_product_id: {
          brand_id: brandId,
          product_id: productId
        }
      },
      include: {
        products: true
      }
    });
  }

  async updateBrandProduct(brandId: string, productId: string, data: UpdateBrandProductDTO) {
    const updateData: any = {
      updated_at: new Date()
    };

    if (data.brandPrice !== undefined) updateData.brand_price = data.brandPrice;
    if (data.brandComparePrice !== undefined) updateData.brand_compare_price = data.brandComparePrice;
    if (data.discountPercent !== undefined) updateData.discount_percent = data.discountPercent;
    if (data.brandProductName !== undefined) updateData.brand_product_name = data.brandProductName;
    if (data.brandDescription !== undefined) updateData.brand_description = data.brandDescription;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
    if (data.isFeatured !== undefined) updateData.is_featured = data.isFeatured;
    if (data.isBestseller !== undefined) updateData.is_bestseller = data.isBestseller;
    if (data.isNewArrival !== undefined) updateData.is_new_arrival = data.isNewArrival;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    return prisma.brand_products.update({
      where: {
        brand_id_product_id: {
          brand_id: brandId,
          product_id: productId
        }
      },
      data: updateData,
      include: {
        products: true
      }
    });
  }

  async removeBrandProduct(brandId: string, productId: string) {
    return prisma.brand_products.delete({
      where: {
        brand_id_product_id: {
          brand_id: brandId,
          product_id: productId
        }
      }
    });
  }

  async getFeaturedProducts(brandId: string, limit: number = 10) {
    return prisma.brand_products.findMany({
      where: {
        brand_id: brandId,
        is_featured: true,
        is_active: true
      },
      orderBy: { display_order: 'asc' },
      take: limit,
      include: {
        products: {
          select: {
            id: true,
            sku: true,
            name: true,
            slug: true,
            primary_image_url: true,
            cost_price: true
          }
        }
      }
    });
  }

  async getBestsellers(brandId: string, limit: number = 10) {
    return prisma.brand_products.findMany({
      where: {
        brand_id: brandId,
        is_bestseller: true,
        is_active: true
      },
      orderBy: { display_order: 'asc' },
      take: limit,
      include: {
        products: {
          select: {
            id: true,
            sku: true,
            name: true,
            slug: true,
            primary_image_url: true,
            cost_price: true
          }
        }
      }
    });
  }

  async getNewArrivals(brandId: string, limit: number = 10) {
    return prisma.brand_products.findMany({
      where: {
        brand_id: brandId,
        is_new_arrival: true,
        is_active: true
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        products: {
          select: {
            id: true,
            sku: true,
            name: true,
            slug: true,
            primary_image_url: true,
            cost_price: true
          }
        }
      }
    });
  }
}
