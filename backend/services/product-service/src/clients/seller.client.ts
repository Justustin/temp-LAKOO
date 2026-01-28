import axios from 'axios';
import { getServiceAuthHeaders } from '../utils/serviceAuth';

const SELLER_SERVICE_URL = process.env.SELLER_SERVICE_URL || 'http://localhost:3015';

/**
 * Seller Service Client
 *
 * Handles communication with seller-service
 */

export class SellerServiceClient {
  /**
   * Get seller information
   */
  async getSeller(sellerId: string): Promise<{
    id: string;
    userId: string;
    brandName: string | null;
    status: string;
  } | null> {
    try {
      const response = await axios.get(
        `${SELLER_SERVICE_URL}/api/sellers/${sellerId}`,
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching seller:', error.message);
      return null;
    }
  }

  /**
   * Increment seller's product count when product is approved
   */
  async incrementProductCount(sellerId: string): Promise<boolean> {
    try {
      await axios.post(
        `${SELLER_SERVICE_URL}/api/sellers/${sellerId}/products/increment`,
        {},
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return true;
    } catch (error: any) {
      console.error('Error incrementing product count:', error.message);
      return false;
    }
  }

  /**
   * Decrement seller's product count when product is deleted
   */
  async decrementProductCount(sellerId: string): Promise<boolean> {
    try {
      await axios.post(
        `${SELLER_SERVICE_URL}/api/sellers/${sellerId}/products/decrement`,
        {},
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return true;
    } catch (error: any) {
      console.error('Error decrementing product count:', error.message);
      return false;
    }
  }

  /**
   * Notify seller about draft approval/rejection
   */
  async notifyDraftDecision(
    sellerId: string,
    draftId: string,
    decision: 'approved' | 'rejected' | 'changes_requested',
    message: string
  ): Promise<boolean> {
    try {
      await axios.post(
        `${SELLER_SERVICE_URL}/api/sellers/${sellerId}/notifications`,
        {
          type: `draft_${decision}`,
          draftId,
          message
        },
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return true;
    } catch (error: any) {
      console.error('Error notifying seller:', error.message);
      return false;
    }
  }
}

export const sellerServiceClient = new SellerServiceClient();
