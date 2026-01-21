import { BrandRepository } from '../repositories/brand.repository';
import { outboxService } from './outbox.service';
import { NotFoundError, ConflictError } from '../middleware/error-handler';
import {
  CreateBrandDTO,
  UpdateBrandDTO,
  BrandQuery,
  AddBrandProductDTO,
  UpdateBrandProductDTO,
  BrandProductQuery
} from '../types';

export class BrandService {
  private repository: BrandRepository;

  constructor() {
    this.repository = new BrandRepository();
  }

  // ==================== Brand Operations ====================

  async createBrand(data: CreateBrandDTO) {
    // Check if brand code already exists
    const existing = await this.repository.findByCode(data.brandCode);
    if (existing) {
      throw new ConflictError('Brand code already exists');
    }

    const brand = await this.repository.create(data);

    // Publish outbox event
    await outboxService.brandCreated(brand);

    return brand;
  }

  async getBrands(query: BrandQuery) {
    return this.repository.findAll(query);
  }

  async getBrandById(id: string) {
    const brand = await this.repository.findById(id);
    if (!brand) {
      throw new NotFoundError('Brand not found');
    }
    return brand;
  }

  async getBrandBySlug(slug: string) {
    const brand = await this.repository.findBySlug(slug);
    if (!brand) {
      throw new NotFoundError('Brand not found');
    }
    return brand;
  }

  async updateBrand(id: string, data: UpdateBrandDTO) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Brand not found');
    }

    // Track if status is changing
    const oldStatus = existing.status;
    const newStatus = data.status;

    const brand = await this.repository.update(id, data);

    // Determine which fields were updated
    const updatedFields: string[] = [];
    if (data.brandName !== undefined) updatedFields.push('brandName');
    if (data.logoUrl !== undefined) updatedFields.push('logoUrl');
    if (data.bannerUrl !== undefined) updatedFields.push('bannerUrl');
    if (data.primaryColor !== undefined) updatedFields.push('primaryColor');
    if (data.secondaryColor !== undefined) updatedFields.push('secondaryColor');
    if (data.brandStory !== undefined) updatedFields.push('brandStory');
    if (data.tagline !== undefined) updatedFields.push('tagline');
    if (data.targetAudience !== undefined) updatedFields.push('targetAudience');
    if (data.styleCategory !== undefined) updatedFields.push('styleCategory');
    if (data.defaultMarginPercent !== undefined) updatedFields.push('defaultMarginPercent');
    if (data.status !== undefined) updatedFields.push('status');
    if (data.displayOrder !== undefined) updatedFields.push('displayOrder');

    // Publish outbox events
    await outboxService.brandUpdated(brand, updatedFields);

    // If status changed, also publish a status change event
    if (newStatus && oldStatus !== newStatus) {
      await outboxService.brandStatusChanged(brand, oldStatus, newStatus);
    }

    return brand;
  }

  async deleteBrand(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Brand not found');
    }

    const result = await this.repository.delete(id);

    // Publish outbox event
    await outboxService.brandDeleted(existing);

    return result;
  }

  // ==================== Brand Product Operations ====================

  async addProductToBrand(brandId: string, data: AddBrandProductDTO) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new NotFoundError('Brand not found');
    }

    // Check if product is already in this brand
    const existing = await this.repository.findBrandProduct(brandId, data.productId);
    if (existing) {
      throw new ConflictError('Product already exists in this brand');
    }

    const brandProduct = await this.repository.addProduct(brandId, data);

    // Publish outbox event
    await outboxService.brandProductAdded(brandProduct);

    return brandProduct;
  }

  async getBrandProducts(brandId: string, query: BrandProductQuery) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new NotFoundError('Brand not found');
    }

    return this.repository.findBrandProducts(brandId, query);
  }

  async getBrandProduct(brandId: string, productId: string) {
    const brandProduct = await this.repository.findBrandProduct(brandId, productId);
    if (!brandProduct) {
      throw new NotFoundError('Brand product not found');
    }
    return brandProduct;
  }

  async updateBrandProduct(brandId: string, productId: string, data: UpdateBrandProductDTO) {
    const existing = await this.repository.findBrandProduct(brandId, productId);
    if (!existing) {
      throw new NotFoundError('Brand product not found');
    }

    // Track price change for special event
    const oldPrice = Number(existing.brand_price);
    const newPrice = data.brandPrice;

    const brandProduct = await this.repository.updateBrandProduct(brandId, productId, data);

    // Determine which fields were updated
    const updatedFields: string[] = [];
    if (data.brandPrice !== undefined) updatedFields.push('brandPrice');
    if (data.brandComparePrice !== undefined) updatedFields.push('brandComparePrice');
    if (data.discountPercent !== undefined) updatedFields.push('discountPercent');
    if (data.brandProductName !== undefined) updatedFields.push('brandProductName');
    if (data.brandDescription !== undefined) updatedFields.push('brandDescription');
    if (data.displayOrder !== undefined) updatedFields.push('displayOrder');
    if (data.isFeatured !== undefined) updatedFields.push('isFeatured');
    if (data.isBestseller !== undefined) updatedFields.push('isBestseller');
    if (data.isNewArrival !== undefined) updatedFields.push('isNewArrival');
    if (data.isActive !== undefined) updatedFields.push('isActive');

    // Publish outbox events
    await outboxService.brandProductUpdated(brandId, productId, updatedFields);

    // If price changed, also publish a price change event
    if (newPrice !== undefined && oldPrice !== newPrice) {
      await outboxService.brandProductPriceChanged(brandId, productId, oldPrice, newPrice);
    }

    return brandProduct;
  }

  async removeProductFromBrand(brandId: string, productId: string) {
    const existing = await this.repository.findBrandProduct(brandId, productId);
    if (!existing) {
      throw new NotFoundError('Brand product not found');
    }

    const result = await this.repository.removeBrandProduct(brandId, productId);

    // Publish outbox event
    await outboxService.brandProductRemoved(brandId, productId);

    return result;
  }

  async getFeaturedProducts(brandId: string, limit?: number) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new NotFoundError('Brand not found');
    }

    return this.repository.getFeaturedProducts(brandId, limit);
  }

  async getBestsellers(brandId: string, limit?: number) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new NotFoundError('Brand not found');
    }

    return this.repository.getBestsellers(brandId, limit);
  }

  async getNewArrivals(brandId: string, limit?: number) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new NotFoundError('Brand not found');
    }

    return this.repository.getNewArrivals(brandId, limit);
  }
}
