import axios from 'axios';
import { getServiceAuthHeaders } from '../utils/serviceAuth';

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

/**
 * Product info returned by product-service for tagging
 */
export interface TaggableProduct {
  id: string;
  name: string;
  sellerId: string | null;
  status: string;
  isTaggable: boolean;
  price: number;
  primaryImageUrl: string | null;
  productSource: 'seller_product' | 'warehouse_product';
}

/**
 * Product Service Client
 * 
 * Handles communication with product-service for validating products
 * that users want to tag in their posts.
 */
export class ProductServiceClient {
  /**
   * Check if a product can be tagged in posts
   * Only approved products can be tagged
   */
  async checkTaggable(productId: string): Promise<TaggableProduct | null> {
    try {
      const response = await axios.get(
        `${PRODUCT_SERVICE_URL}/api/products/${productId}/taggable`,
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error checking product taggable:', error.message);
      throw new Error('Product service unavailable');
    }
  }

  /**
   * Get multiple products for batch validation
   * This is more efficient than calling checkTaggable multiple times
   */
  async getProductsForTagging(productIds: string[]): Promise<TaggableProduct[]> {
    try {
      const response = await axios.post(
        `${PRODUCT_SERVICE_URL}/api/products/batch-taggable`,
        { productIds },
        {
          headers: getServiceAuthHeaders(),
          timeout: 10000
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Error batch checking products:', error.message);
      
      // If batch endpoint not available, fall back to individual checks
      if (error.response?.status === 404) {
        console.warn('Batch taggable endpoint not found, falling back to individual checks');
        const products: TaggableProduct[] = [];
        for (const productId of productIds) {
          const product = await this.checkTaggable(productId);
          if (product) {
            products.push(product);
          }
        }
        return products;
      }
      
      throw new Error('Product service unavailable');
    }
  }
}

// Export singleton instance
export const productClient = new ProductServiceClient();
