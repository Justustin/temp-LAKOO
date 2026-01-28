import { ProductRepository  } from "../repositories/product.repository"; 
import { CreateProductDTO, UpdateProductDTO, ProductQuery, CreateVariantDTO } from "../types"; 

export class ProductService {
    private repository : ProductRepository;

    constructor() { 
        this.repository  = new ProductRepository();
    }

    async createProduct(data: CreateProductDTO) { 
        return this.repository.create(data);
    }
    async getProducts(query: ProductQuery) { 
        return this.repository.findAll(query);
    }
    async getProductById(id: string) { 
        const product = await this.repository.findById(id);
        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    }
    async updateProduct(id: string, data: UpdateProductDTO) { 

        const product = await this.repository.update(id, data);
        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    }
    async getVariantById(variantId: string) {
        const variant = await this.repository.findVariantById(variantId);
        if (!variant) {
            throw new Error('Variant not found');
        }
        return variant;
    }
    async createVariant(data: CreateVariantDTO) { 
        const product = await this.repository.createVariant(data);
        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    }
    async getProductBySlug(slug: string) { 
        const product = await this.repository.findBySlug(slug);
        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    }
    async deleteProduct(id: string) {
        return this.repository.delete(id);
    }
    async addProductImages(productId: string, images: { imageUrl: string; sortOrder: number }[]) {
        const product = await this.repository.findById(productId);
        if (!product) {
        throw new Error('Product not found');
        }
        return this.repository.addImages(productId, images);
    }
    async publishProduct(id: string) {
        const product = await this.repository.findById(id);
        if (!product) {
        throw new Error('Product not found');
        }
        return this.repository.publish(id);
    }

    // ============= Grosir Config Management (Simplified) =============

    /**
     * Set bundle composition for grosir - defines units per bundle for each variant
     */
    async setBundleComposition(productId: string, compositions: { variantId: string | null; unitsInBundle: number }[]) {
        const product = await this.repository.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Validate units in bundle
        for (const comp of compositions) {
            if (comp.unitsInBundle < 1) {
                throw new Error('Units in bundle must be at least 1');
            }
        }

        return this.repository.setBundleComposition(productId, compositions);
    }

    /**
     * Set warehouse inventory configuration - max stock and reorder thresholds
     */
    async setWarehouseInventoryConfig(productId: string, configs: { variantId: string | null; maxStockLevel: number; reorderThreshold: number }[]) {
        const product = await this.repository.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Validate config values
        for (const config of configs) {
            if (config.maxStockLevel < 0) {
                throw new Error('Max stock level cannot be negative');
            }
            if (config.reorderThreshold < 0) {
                throw new Error('Reorder threshold cannot be negative');
            }
            if (config.reorderThreshold > config.maxStockLevel) {
                throw new Error('Reorder threshold cannot exceed max stock level');
            }
        }

        return this.repository.setWarehouseInventoryConfig(productId, configs);
    }

    /**
     * Get grosir configuration - bundle composition and warehouse inventory settings
     */
    async getGrosirConfig(productId: string) {
        const product = await this.repository.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        return this.repository.getGrosirConfig(productId);
    }
}