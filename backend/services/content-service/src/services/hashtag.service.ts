import { prisma } from '../lib/prisma';
import { postRepository } from '../repositories/post.repository';
import { NotFoundError } from '../middleware/error-handler';

/**
 * Hashtag Service
 * 
 * Handles hashtag operations including trending, search, and post retrieval.
 */
export class HashtagService {
  /**
   * Get trending hashtags
   */
  async getTrending(limit: number = 20) {
    return prisma.hashtag.findMany({
      where: {
        isActive: true,
        isBanned: false
      },
      orderBy: [
        { isTrending: 'desc' },
        { postCount: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        tag: true,
        postCount: true,
        isTrending: true,
        createdAt: true
      }
    });
  }

  /**
   * Search hashtags
   */
  async search(query: string, limit: number = 10) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();

    return prisma.hashtag.findMany({
      where: {
        tag: {
          startsWith: searchTerm
        },
        isActive: true,
        isBanned: false
      },
      orderBy: {
        postCount: 'desc'
      },
      take: limit,
      select: {
        id: true,
        tag: true,
        postCount: true,
        isTrending: true
      }
    });
  }

  /**
   * Get hashtag by tag name
   */
  async getByTag(tag: string) {
    const hashtag = await prisma.hashtag.findUnique({
      where: {
        tag: tag.toLowerCase()
      },
      select: {
        id: true,
        tag: true,
        postCount: true,
        isTrending: true,
        isActive: true,
        isBanned: true,
        createdAt: true
      }
    });

    if (!hashtag || hashtag.isBanned) {
      throw new NotFoundError('Hashtag not found');
    }

    return hashtag;
  }

  /**
   * Get posts by hashtag
   */
  async getPostsByHashtag(tag: string, options: { limit?: number; offset?: number } = {}) {
    const hashtag = await this.getByTag(tag);

    const { limit = 20, offset = 0 } = options;

    return postRepository.findByHashtag(tag, { limit, offset });
  }

  /**
   * Get popular hashtags (by post count)
   */
  async getPopular(limit: number = 50) {
    return prisma.hashtag.findMany({
      where: {
        isActive: true,
        isBanned: false,
        postCount: {
          gt: 0
        }
      },
      orderBy: {
        postCount: 'desc'
      },
      take: limit,
      select: {
        id: true,
        tag: true,
        postCount: true,
        isTrending: true
      }
    });
  }

  /**
   * Get related hashtags (hashtags that appear together in posts)
   */
  async getRelated(tag: string, limit: number = 10) {
    const hashtag = await this.getByTag(tag);

    // Find posts with this hashtag
    const posts = await prisma.postHashtag.findMany({
      where: {
        hashtag: {
          tag: tag.toLowerCase()
        }
      },
      select: {
        postId: true
      },
      take: 100 // Sample from recent posts
    });

    const postIds = posts.map(p => p.postId);

    // Find other hashtags in those posts
    const relatedHashtags = await prisma.hashtag.findMany({
      where: {
        isActive: true,
        isBanned: false,
        tag: {
          not: tag.toLowerCase()
        },
        posts: {
          some: {
            postId: {
              in: postIds
            }
          }
        }
      },
      orderBy: {
        postCount: 'desc'
      },
      take: limit,
      select: {
        id: true,
        tag: true,
        postCount: true,
        isTrending: true
      }
    });

    return relatedHashtags;
  }
}

// Export singleton instance
export const hashtagService = new HashtagService();
