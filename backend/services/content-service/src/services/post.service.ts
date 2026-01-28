import { prisma } from '../lib/prisma';
import { postRepository, PaginationOptions } from '../repositories/post.repository';
import { productClient, TaggableProduct } from '../clients/product.client';
import { outboxService } from './outbox.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler';
import { v4 as uuidv4 } from 'uuid';

/**
 * Product tag input from client
 */
export interface ProductTagInput {
  productId: string;
  mediaIndex: number;
  positionX?: number;
  positionY?: number;
}

/**
 * Validated product tag (after checking with product-service)
 */
export interface ValidatedProductTag extends ProductTagInput {
  sellerId: string | null;
  productName: string;
  productPrice: number;
  productImageUrl: string | null;
  productSource: 'seller_product' | 'warehouse_product';
}

/**
 * Media input from client
 */
export interface PostMediaInput {
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  fileSizeBytes?: number;
  sortOrder: number;
  altText?: string;
}

/**
 * Create post input
 */
export interface CreatePostInput {
  title?: string;
  caption: string;
  postType?: 'standard' | 'review' | 'lookbook' | 'tutorial' | 'unboxing';
  visibility?: 'public' | 'followers_only' | 'private';
  media: PostMediaInput[];
  productTags?: ProductTagInput[];
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
}

/**
 * Update post input
 */
export interface UpdatePostInput {
  title?: string;
  caption?: string;
  visibility?: 'public' | 'followers_only' | 'private';
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
}

/**
 * Post Service
 * 
 * Handles all business logic for posts including:
 * - Product tag validation via product-service
 * - Hashtag extraction
 * - Post creation/updates
 * - Engagement (likes, saves, views)
 */
export class PostService {
  /**
   * Generate unique post code (PST-XXXXX)
   */
  private generatePostCode(): string {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `PST-${randomPart}`;
  }

  /**
   * Extract hashtags from caption
   * Returns array of hashtag strings (without #, lowercase)
   */
  private extractHashtags(caption: string): string[] {
    const regex = /#(\w+)/g;
    const matches = caption.match(regex) || [];
    // Remove duplicates and convert to lowercase
    return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
  }

  /**
   * Validate product tags by calling product-service
   * Throws error if any product is invalid or not approved
   */
  async validateProductTags(tags: ProductTagInput[]): Promise<ValidatedProductTag[]> {
    if (!tags || tags.length === 0) {
      return [];
    }

    const validated: ValidatedProductTag[] = [];
    const productIds = tags.map(t => t.productId);

    // Try batch validation first, fall back to individual if needed
    let products: TaggableProduct[];
    try {
      products = await productClient.getProductsForTagging(productIds);
    } catch (error) {
      // If batch fails, try individual checks
      products = [];
      for (const productId of productIds) {
        const product = await productClient.checkTaggable(productId);
        if (product) {
          products.push(product);
        }
      }
    }

    // Build a map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate each tag
    for (const tag of tags) {
      const product = productMap.get(tag.productId);

      if (!product) {
        throw new BadRequestError(`Product ${tag.productId} not found`);
      }

      if (!product.isTaggable) {
        throw new BadRequestError(`Product "${product.name}" is not approved for tagging`);
      }

      validated.push({
        ...tag,
        sellerId: product.sellerId,
        productName: product.name,
        productPrice: product.price,
        productImageUrl: product.primaryImageUrl,
        productSource: product.sellerId ? 'seller_product' : 'warehouse_product'
      });
    }

    return validated;
  }

  /**
   * Create a new post
   */
  async createPost(userId: string, data: CreatePostInput) {
    // 1. Validate product tags (calls product-service)
    const validatedTags = await this.validateProductTags(data.productTags || []);

    // 2. Extract hashtags from caption
    const hashtags = this.extractHashtags(data.caption);

    // 3. Generate unique post code
    let postCode = this.generatePostCode();
    // Ensure uniqueness (very rare collision)
    while (await postRepository.findByPostCode(postCode)) {
      postCode = this.generatePostCode();
    }

    // 4. Create post with all related data in transaction
    const post = await prisma.$transaction(async (tx) => {
      // Create post
      const newPost = await tx.post.create({
        data: {
          userId,
          postCode,
          title: data.title,
          caption: data.caption,
          postType: data.postType || 'standard',
          visibility: data.visibility || 'public',
          status: 'published',
          publishedAt: new Date(),
          locationName: data.locationName,
          locationLat: data.locationLat ? String(data.locationLat) : undefined,
          locationLng: data.locationLng ? String(data.locationLng) : undefined,
          moderationStatus: 'approved' // Auto-approve posts
        }
      });

      // Create media
      for (const media of data.media) {
        await tx.postMedia.create({
          data: {
            postId: newPost.id,
            mediaType: media.mediaType,
            mediaUrl: media.mediaUrl,
            thumbnailUrl: media.thumbnailUrl,
            width: media.width,
            height: media.height,
            durationSec: media.durationSec,
            fileSizeBytes: media.fileSizeBytes,
            sortOrder: media.sortOrder,
            altText: media.altText
          }
        });
      }

      // Create product tags (with snapshots)
      for (const tag of validatedTags) {
        await tx.postProductTag.create({
          data: {
            postId: newPost.id,
            productId: tag.productId,
            sellerId: tag.sellerId,
            productSource: tag.productSource,
            mediaIndex: tag.mediaIndex,
            positionX: tag.positionX ? String(tag.positionX) : undefined,
            positionY: tag.positionY ? String(tag.positionY) : undefined,
            // Snapshot from product-service
            productName: tag.productName,
            productPrice: String(tag.productPrice),
            productImageUrl: tag.productImageUrl
          }
        });
      }

      // Create/link hashtags
      for (const tagName of hashtags) {
        const hashtag = await tx.hashtag.upsert({
          where: { tag: tagName.toLowerCase() },
          create: { 
            tag: tagName.toLowerCase(),
            postCount: 1,
            isActive: true
          },
          update: { 
            postCount: { increment: 1 } 
          }
        });

        await tx.postHashtag.create({
          data: {
            postId: newPost.id,
            hashtagId: hashtag.id
          }
        });
      }

      // Publish event to outbox
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Post',
          aggregateId: newPost.id,
          eventType: 'post.created',
          payload: {
            postId: newPost.id,
            postCode: newPost.postCode,
            userId,
            postType: newPost.postType,
            visibility: newPost.visibility,
            productIds: validatedTags.map(t => t.productId),
            hashtags,
            createdAt: newPost.createdAt.toISOString()
          }
        }
      });

      return newPost;
    });

    // 5. Return complete post with relations
    return postRepository.findById(post.id);
  }

  /**
   * Get post by ID
   */
  async getPostById(postId: string, viewerId?: string) {
    const post = await postRepository.findById(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check visibility permissions
    if (post.visibility === 'private' && post.userId !== viewerId) {
      throw new ForbiddenError('This post is private');
    }

    if (post.visibility === 'followers_only' && post.userId !== viewerId) {
      // TODO: Check if viewer follows post author
      // For now, we'll allow it in development
      if (process.env.NODE_ENV !== 'development') {
        throw new ForbiddenError('This post is only visible to followers');
      }
    }

    return post;
  }

  /**
   * Get posts by user
   */
  async getPostsByUser(userId: string, options: PaginationOptions, viewerId?: string) {
    const posts = await postRepository.findByUserId(userId, options);

    // Filter by visibility based on viewer
    return posts.filter(post => {
      if (post.visibility === 'public') return true;
      if (post.userId === viewerId) return true;
      if (post.visibility === 'private') return false;
      // TODO: Check follower relationship for followers_only
      return process.env.NODE_ENV === 'development';
    });
  }

  /**
   * Get public posts (feed)
   */
  async getPublicPosts(options: PaginationOptions) {
    return postRepository.findPublished(options);
  }

  /**
   * Get posts by hashtag
   */
  async getPostsByHashtag(hashtag: string, options: PaginationOptions) {
    return postRepository.findByHashtag(hashtag, options);
  }

  /**
   * Get posts with product tag
   */
  async getPostsByProduct(productId: string, options: PaginationOptions) {
    return postRepository.findWithProductTag(productId, options);
  }

  /**
   * Update post
   */
  async updatePost(postId: string, userId: string, data: UpdatePostInput) {
    const post = await postRepository.findById(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenError('You can only edit your own posts');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          title: data.title,
          caption: data.caption,
          visibility: data.visibility,
          locationName: data.locationName !== undefined ? data.locationName : undefined,
          locationLat: data.locationLat !== undefined 
            ? (data.locationLat !== null ? String(data.locationLat) : null)
            : undefined,
          locationLng: data.locationLng !== undefined
            ? (data.locationLng !== null ? String(data.locationLng) : null)
            : undefined,
        }
      });

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Post',
          aggregateId: postId,
          eventType: 'post.updated',
          payload: {
            postId,
            postCode: post.postCode,
            userId,
            changes: Object.keys(data),
            updatedAt: new Date().toISOString()
          }
        }
      });

      return updatedPost;
    });

    return postRepository.findById(updated.id);
  }

  /**
   * Delete post (soft delete)
   */
  async deletePost(postId: string, userId: string) {
    const post = await postRepository.findById(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: { deletedAt: new Date() }
      });

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Post',
          aggregateId: postId,
          eventType: 'post.deleted',
          payload: {
            postId,
            postCode: post.postCode,
            userId,
            deletedAt: new Date().toISOString()
          }
        }
      });
    });
  }

  /**
   * Like a post
   */
  async likePost(postId: string, userId: string) {
    const post = await postRepository.findById(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check if already liked
    const alreadyLiked = await postRepository.hasUserLiked(postId, userId);
    if (alreadyLiked) {
      throw new BadRequestError('You have already liked this post');
    }

    await prisma.$transaction(async (tx) => {
      // Create like
      await tx.postLike.create({
        data: {
          postId,
          userId
        }
      });

      // Increment count
      await tx.post.update({
        where: { id: postId },
        data: {
          likeCount: { increment: 1 }
        }
      });

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Post',
          aggregateId: postId,
          eventType: 'post.liked',
          payload: {
            postId,
            userId,
            postAuthorId: post.userId,
            createdAt: new Date().toISOString()
          }
        }
      });
    });
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId: string, userId: string) {
    const post = await postRepository.findById(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    await prisma.$transaction(async (tx) => {
      // Delete like
      await tx.postLike.delete({
        where: {
          postId_userId: {
            postId,
            userId
          }
        }
      });

      // Decrement count
      await tx.post.update({
        where: { id: postId },
        data: {
          likeCount: { decrement: 1 }
        }
      });

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Post',
          aggregateId: postId,
          eventType: 'post.unliked',
          payload: {
            postId,
            userId,
            unlikedAt: new Date().toISOString()
          }
        }
      });
    });
  }

  /**
   * Save a post
   */
  async savePost(postId: string, userId: string, collectionId?: string) {
    const post = await postRepository.findById(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check if collection exists (if provided)
    if (collectionId) {
      const collection = await prisma.saveCollection.findFirst({
        where: {
          id: collectionId,
          userId
        }
      });

      if (!collection) {
        throw new NotFoundError('Collection not found');
      }
    }

    await prisma.$transaction(async (tx) => {
      // Create save
      await tx.postSave.create({
        data: {
          postId,
          userId,
          collectionId
        }
      });

      // Increment post save count
      await tx.post.update({
        where: { id: postId },
        data: {
          saveCount: { increment: 1 }
        }
      });

      // Increment collection post count
      if (collectionId) {
        await tx.saveCollection.update({
          where: { id: collectionId },
          data: {
            postCount: { increment: 1 }
          }
        });
      }

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Post',
          aggregateId: postId,
          eventType: 'post.saved',
          payload: {
            postId,
            userId,
            collectionId,
            createdAt: new Date().toISOString()
          }
        }
      });
    });
  }

  /**
   * Unsave a post
   */
  async unsavePost(postId: string, userId: string, collectionId?: string) {
    await prisma.$transaction(async (tx) => {
      // Find and delete save
      const save = await tx.postSave.findFirst({
        where: {
          postId,
          userId,
          collectionId: collectionId || null
        }
      });

      if (!save) {
        throw new NotFoundError('Save not found');
      }

      await tx.postSave.delete({
        where: { id: save.id }
      });

      // Decrement post save count
      await tx.post.update({
        where: { id: postId },
        data: {
          saveCount: { decrement: 1 }
        }
      });

      // Decrement collection post count
      if (collectionId) {
        await tx.saveCollection.update({
          where: { id: collectionId },
          data: {
            postCount: { decrement: 1 }
          }
        });
      }

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Post',
          aggregateId: postId,
          eventType: 'post.unsaved',
          payload: {
            postId,
            userId,
            unsavedAt: new Date().toISOString()
          }
        }
      });
    });
  }

  /**
   * Record post view
   */
  async recordView(postId: string, userId?: string, durationSec?: number) {
    const post = await postRepository.findById(postId);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    await prisma.$transaction(async (tx) => {
      // Increment view count
      await tx.post.update({
        where: { id: postId },
        data: {
          viewCount: { increment: 1 }
        }
      });

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Post',
          aggregateId: postId,
          eventType: 'post.viewed',
          payload: {
            postId,
            userId: userId || null,
            durationSec: durationSec || null,
            createdAt: new Date().toISOString()
          }
        }
      });
    });
  }

  /**
   * Track product tag click
   */
  async trackTagClick(postId: string, tagId: string, userId?: string) {
    const tag = await prisma.postProductTag.findUnique({
      where: { id: tagId }
    });

    if (!tag || tag.postId !== postId) {
      throw new NotFoundError('Product tag not found');
    }

    await prisma.$transaction(async (tx) => {
      // Increment click count
      await tx.postProductTag.update({
        where: { id: tagId },
        data: {
          clickCount: { increment: 1 }
        }
      });

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'ProductTag',
          aggregateId: tagId,
          eventType: 'product_tag.clicked',
          payload: {
            postId,
            tagId,
            productId: tag.productId,
            userId: userId || null,
            clickedAt: new Date().toISOString()
          }
        }
      });
    });
  }
}

// Export singleton instance
export const postService = new PostService();
