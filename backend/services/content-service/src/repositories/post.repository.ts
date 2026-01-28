import { prisma } from '../lib/prisma';
import { Post, PostStatus, PostVisibility, Prisma } from '../generated/prisma';

export interface PaginationOptions {
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface CreatePostData {
  userId: string;
  postCode: string;
  title?: string;
  caption: string;
  postType?: string;
  status?: PostStatus;
  visibility?: PostVisibility;
  publishedAt?: Date;
  locationName?: string;
  locationLat?: string | number;
  locationLng?: string | number;
}

export interface UpdatePostData {
  title?: string;
  caption?: string;
  visibility?: PostVisibility;
  status?: PostStatus;
  locationName?: string | null;
  locationLat?: string | number | null;
  locationLng?: string | number | null;
}

/**
 * Post Repository
 * 
 * Handles all database operations for posts.
 * No business logic here - just data access.
 */
export class PostRepository {
  /**
   * Create a new post
   */
  async create(data: CreatePostData): Promise<Post> {
    return prisma.post.create({
      data: {
        userId: data.userId,
        postCode: data.postCode,
        title: data.title,
        caption: data.caption,
        postType: (data.postType as any) || 'standard',
        status: data.status || 'draft',
        visibility: data.visibility || 'public',
        publishedAt: data.publishedAt,
        locationName: data.locationName,
        locationLat: data.locationLat ? String(data.locationLat) : undefined,
        locationLng: data.locationLng ? String(data.locationLng) : undefined,
      }
    });
  }

  /**
   * Find post by ID (including soft-deleted)
   */
  async findById(id: string, includeSoftDeleted: boolean = false): Promise<Post | null> {
    return prisma.post.findFirst({
      where: {
        id,
        ...(includeSoftDeleted ? {} : { deletedAt: null })
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' }
        },
        productTags: true,
        hashtags: {
          include: {
            hashtag: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true
          }
        }
      }
    });
  }

  /**
   * Find post by postCode
   */
  async findByPostCode(postCode: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: {
        postCode,
        deletedAt: null
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' }
        },
        productTags: true,
        hashtags: {
          include: {
            hashtag: true
          }
        }
      }
    });
  }

  /**
   * Find posts by user ID
   */
  async findByUserId(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<Post[]> {
    const { offset = 0, limit = 20 } = options;

    return prisma.post.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' }
        },
        productTags: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });
  }

  /**
   * Find published posts (for public feed)
   */
  async findPublished(options: PaginationOptions = {}): Promise<Post[]> {
    const { offset = 0, limit = 20 } = options;

    return prisma.post.findMany({
      where: {
        status: 'published',
        visibility: 'public',
        deletedAt: null
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' }
        },
        productTags: true,
        hashtags: {
          include: {
            hashtag: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            saves: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      skip: offset,
      take: limit
    });
  }

  /**
   * Find posts by hashtag
   */
  async findByHashtag(
    hashtag: string,
    options: PaginationOptions = {}
  ): Promise<Post[]> {
    const { offset = 0, limit = 20 } = options;

    return prisma.post.findMany({
      where: {
        status: 'published',
        visibility: 'public',
        deletedAt: null,
        hashtags: {
          some: {
            hashtag: {
              tag: hashtag.toLowerCase()
            }
          }
        }
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' }
        },
        productTags: true,
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      skip: offset,
      take: limit
    });
  }

  /**
   * Find posts with a specific product tagged
   */
  async findWithProductTag(productId: string, options: PaginationOptions = {}): Promise<Post[]> {
    const { offset = 0, limit = 20 } = options;

    return prisma.post.findMany({
      where: {
        status: 'published',
        visibility: 'public',
        deletedAt: null,
        productTags: {
          some: {
            productId
          }
        }
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' }
        },
        productTags: {
          where: {
            productId
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      skip: offset,
      take: limit
    });
  }

  /**
   * Update post
   */
  async update(id: string, data: UpdatePostData): Promise<Post> {
    return prisma.post.update({
      where: { id },
      data: {
        ...data,
        locationLat: data.locationLat !== undefined 
          ? (data.locationLat !== null ? String(data.locationLat) : null)
          : undefined,
        locationLng: data.locationLng !== undefined
          ? (data.locationLng !== null ? String(data.locationLng) : null)
          : undefined,
      }
    });
  }

  /**
   * Soft delete post
   */
  async softDelete(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
  }

  /**
   * Increment like count (atomic)
   */
  async incrementLikeCount(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: {
        likeCount: { increment: 1 }
      }
    });
  }

  /**
   * Decrement like count (atomic)
   */
  async decrementLikeCount(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: {
        likeCount: { decrement: 1 }
      }
    });
  }

  /**
   * Increment comment count (atomic)
   */
  async incrementCommentCount(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: {
        commentCount: { increment: 1 }
      }
    });
  }

  /**
   * Decrement comment count (atomic)
   */
  async decrementCommentCount(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: {
        commentCount: { decrement: 1 }
      }
    });
  }

  /**
   * Increment save count (atomic)
   */
  async incrementSaveCount(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: {
        saveCount: { increment: 1 }
      }
    });
  }

  /**
   * Decrement save count (atomic)
   */
  async decrementSaveCount(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: {
        saveCount: { decrement: 1 }
      }
    });
  }

  /**
   * Increment view count (atomic)
   */
  async incrementViewCount(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: {
        viewCount: { increment: 1 }
      }
    });
  }

  /**
   * Check if user has liked post
   */
  async hasUserLiked(postId: string, userId: string): Promise<boolean> {
    const like = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });
    return !!like;
  }

  /**
   * Check if user has saved post
   */
  async hasUserSaved(postId: string, userId: string): Promise<boolean> {
    const save = await prisma.postSave.findFirst({
      where: {
        postId,
        userId
      }
    });
    return !!save;
  }
}

// Export singleton instance
export const postRepository = new PostRepository();
