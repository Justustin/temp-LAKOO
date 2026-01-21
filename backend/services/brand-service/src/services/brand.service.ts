import { BrandRepository } from '../repositories/brand.repository';
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
      throw new Error('Brand code already exists');
    }

    return this.repository.create(data);
  }

  async getBrands(query: BrandQuery) {
    return this.repository.findAll(query);
  }

  async getBrandById(id: string) {
    const brand = await this.repository.findById(id);
    if (!brand) {
      throw new Error('Brand not found');
    }
    return brand;
  }

  async getBrandBySlug(slug: string) {
    const brand = await this.repository.findBySlug(slug);
    if (!brand) {
      throw new Error('Brand not found');
    }
    return brand;
  }

  async updateBrand(id: string, data: UpdateBrandDTO) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Brand not found');
    }

    return this.repository.update(id, data);
  }

  async deleteBrand(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Brand not found');
    }

    return this.repository.delete(id);
  }

  // ==================== Brand Product Operations ====================

  async addProductToBrand(brandId: string, data: AddBrandProductDTO) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }

    // Check if product is already in this brand
    const existing = await this.repository.findBrandProduct(brandId, data.productId);
    if (existing) {
      throw new Error('Product already exists in this brand');
    }

    return this.repository.addProduct(brandId, data);
  }

  async getBrandProducts(brandId: string, query: BrandProductQuery) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }

    return this.repository.findBrandProducts(brandId, query);
  }

  async getBrandProduct(brandId: string, productId: string) {
    const brandProduct = await this.repository.findBrandProduct(brandId, productId);
    if (!brandProduct) {
      throw new Error('Brand product not found');
    }
    return brandProduct;
  }

  async updateBrandProduct(brandId: string, productId: string, data: UpdateBrandProductDTO) {
    const existing = await this.repository.findBrandProduct(brandId, productId);
    if (!existing) {
      throw new Error('Brand product not found');
    }

    return this.repository.updateBrandProduct(brandId, productId, data);
  }

  async removeProductFromBrand(brandId: string, productId: string) {
    const existing = await this.repository.findBrandProduct(brandId, productId);
    if (!existing) {
      throw new Error('Brand product not found');
    }

    return this.repository.removeBrandProduct(brandId, productId);
  }

  async getFeaturedProducts(brandId: string, limit?: number) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }

    return this.repository.getFeaturedProducts(brandId, limit);
  }

  async getBestsellers(brandId: string, limit?: number) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }

    return this.repository.getBestsellers(brandId, limit);
  }

  async getNewArrivals(brandId: string, limit?: number) {
    // Verify brand exists
    const brand = await this.repository.findById(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }

    return this.repository.getNewArrivals(brandId, limit);
  }
}