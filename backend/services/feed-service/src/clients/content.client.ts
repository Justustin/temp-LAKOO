import axios, { AxiosInstance } from 'axios';
import { getServiceAuthHeaders } from '../utils/serviceAuth';

const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL || 'http://localhost:3017';

export interface Post {
  id: string;
  userId: string;
  caption: string | null;
  images: any[];
  productTags: ProductTag[];
  hashtags: string[];
  categoryId: string | null;
  sellerId: string | null;
  visibility: string;
  status: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  shareCount: number;
  viewCount: number;
  publishedAt: Date;
  createdAt: Date;
}

export interface ProductTag {
  productId: string;
  variantId?: string;
  sellerId?: string;
  imageIndex: number;
  x: number;
  y: number;
}

export interface EngagementData {
  postId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  publishedAt: string;
}

export interface HashtagStats {
  tag: string;
  postCount: number;
  recentPostCount: number;
}

export class ContentClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: CONTENT_SERVICE_URL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get a single post
   */
  async getPost(postId: string): Promise<Post | null> {
    try {
      const response = await this.client.get(`/api/posts/${postId}`, {
        headers: getServiceAuthHeaders()
      });
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching post from content-service:', error.message);
      throw error;
    }
  }

  /**
   * Get multiple posts by IDs
   */
  async getPosts(postIds: string[]): Promise<Post[]> {
    if (postIds.length === 0) return [];

    try {
      const response = await this.client.post(
        '/api/posts/batch',
        { postIds },
        { headers: getServiceAuthHeaders() }
      );
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching posts from content-service:', error.message);
      // Return empty array on error to prevent feed from breaking
      return [];
    }
  }

  /**
   * Search posts by criteria
   */
  async searchPosts(criteria: {
    categories?: string[];
    hashtags?: string[];
    sellerIds?: string[];
    limit?: number;
    excludeAuthorIds?: string[];
  }): Promise<Post[]> {
    try {
      const response = await this.client.post(
        '/api/posts/search',
        criteria,
        { headers: getServiceAuthHeaders() }
      );
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error searching posts from content-service:', error.message);
      return [];
    }
  }

  /**
   * Get engagement stats for trending calculation
   */
  async getEngagementStats(startDate: Date, endDate: Date): Promise<EngagementData[]> {
    try {
      const response = await this.client.get('/api/posts/engagement-stats', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        headers: getServiceAuthHeaders()
      });
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching engagement stats from content-service:', error.message);
      return [];
    }
  }

  /**
   * Get hashtag usage statistics
   */
  async getHashtagStats(): Promise<HashtagStats[]> {
    try {
      const response = await this.client.get('/api/posts/hashtag-stats', {
        headers: getServiceAuthHeaders()
      });
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching hashtag stats from content-service:', error.message);
      return [];
    }
  }

  /**
   * Check if posts are still available
   */
  async checkAvailability(postIds: string[]): Promise<{ postId: string; isAvailable: boolean }[]> {
    if (postIds.length === 0) return [];

    try {
      const response = await this.client.post(
        '/api/posts/check-availability',
        { postIds },
        { headers: getServiceAuthHeaders() }
      );
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error checking post availability from content-service:', error.message);
      // Assume all are available on error
      return postIds.map(postId => ({ postId, isAvailable: true }));
    }
  }
}

// Singleton instance
export const contentClient = new ContentClient();
