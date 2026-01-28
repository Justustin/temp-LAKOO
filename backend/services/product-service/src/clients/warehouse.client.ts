import axios from 'axios';
import { getServiceAuthHeaders } from '../utils/serviceAuth';

const WAREHOUSE_SERVICE_URL = process.env.WAREHOUSE_SERVICE_URL || 'http://localhost:3012';

/**
 * Warehouse Service Client
 *
 * Handles communication with warehouse-service
 * NOTE: Only used for LAKOO house brand products (sellerId = null)
 */

export interface WarehouseInventory {
  productId: string;
  variantId: string;
  sku: string;
  availableQuantity: number;
  reservedQuantity: number;
  inTransitQuantity: number;
}

export class WarehouseServiceClient {
  /**
   * Check if a product/variant is available in warehouse
   * Only for house brand products (sellerId = null)
   */
  async checkAvailability(
    productId: string,
    variantId?: string
  ): Promise<WarehouseInventory | null> {
    try {
      const url = variantId
        ? `${WAREHOUSE_SERVICE_URL}/api/inventory/product/${productId}/variant/${variantId}`
        : `${WAREHOUSE_SERVICE_URL}/api/inventory/product/${productId}`;

      const response = await axios.get(url, {
        headers: getServiceAuthHeaders(),
        timeout: 5000
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Error checking warehouse availability:', error.message);
      return null;
    }
  }

  /**
   * Check if adding a variant would violate grosir bundle constraints
   * Only for house brand products with grosir restrictions
   */
  async checkBundleOverflow(
    productId: string,
    variantId: string,
    quantity: number = 1
  ): Promise<{
    wouldOverflow: boolean;
    currentTotal: number;
    bundleSize: number;
    remainingSpace: number;
  }> {
    try {
      const response = await axios.post(
        `${WAREHOUSE_SERVICE_URL}/api/inventory/check-bundle-overflow`,
        {
          productId,
          variantId,
          quantity
        },
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Error checking bundle overflow:', error.message);
      // Return safe default
      return {
        wouldOverflow: false,
        currentTotal: 0,
        bundleSize: 12,
        remainingSpace: 12
      };
    }
  }

  /**
   * Create initial warehouse inventory for a new house brand product
   */
  async createInventoryForProduct(
    productId: string,
    variants: Array<{
      variantId: string;
      sku: string;
      initialQuantity?: number;
    }>
  ): Promise<boolean> {
    try {
      await axios.post(
        `${WAREHOUSE_SERVICE_URL}/api/inventory/products`,
        {
          productId,
          variants
        },
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return true;
    } catch (error: any) {
      console.error('Error creating warehouse inventory:', error.message);
      return false;
    }
  }

  /**
   * Get grosir bundle configuration for a product
   */
  async getGrosirConfig(productId: string): Promise<{
    grosirUnitSize: number;
    tolerance: number;
    requiresExactBundle: boolean;
  } | null> {
    try {
      const response = await axios.get(
        `${WAREHOUSE_SERVICE_URL}/api/inventory/grosir-config/${productId}`,
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching grosir config:', error.message);
      return null;
    }
  }
}

export const warehouseServiceClient = new WarehouseServiceClient();
