import { prisma } from '../lib/prisma';
import { postRepository } from '../repositories/post.repository';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/error-handler';

/**
 * Create collection input
 */
export interface CreateCollectionInput {
  name: string;
  description?: string;
  isPrivate?: boolean;
  coverImageUrl?: string;
}

/**
 * Update collection input
 */
export interface UpdateCollectionInput {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  coverImageUrl?: string;
}

/**
 * Collection Service
 * 
 * Handles saved post collections (like Pinterest boards).
 */
export class CollectionService {
  /**
   * Get user's collections
   */
  async getUserCollections(userId: string) {
    return prisma.saveCollection.findMany({
      where: {
        userId
      },
      include: {
        _count: {
          select: {
            saves: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  /**
   * Get collection by ID
   */
  async getCollectionById(collectionId: string, viewerId?: string) {
    const collection = await prisma.saveCollection.findUnique({
      where: {
        id: collectionId
      },
      include: {
        _count: {
          select: {
            saves: true
          }
        }
      }
    });

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    // Check privacy
    if (collection.isPrivate && collection.userId !== viewerId) {
      throw new ForbiddenError('This collection is private');
    }

    return collection;
  }

  /**
   * Get posts in a collection
   */
  async getCollectionPosts(
    collectionId: string,
    viewerId: string | undefined,
    options: { limit?: number; offset?: number } = {}
  ) {
    // Verify collection exists and is accessible
    await this.getCollectionById(collectionId, viewerId);

    const { limit = 20, offset = 0 } = options;

    const saves = await prisma.postSave.findMany({
      where: {
        collectionId
      },
      include: {
        post: {
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
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    return saves.map(save => save.post);
  }

  /**
   * Create a new collection
   */
  async createCollection(userId: string, data: CreateCollectionInput) {
    // Check if user has a collection with this name
    const existing = await prisma.saveCollection.findFirst({
      where: {
        userId,
        name: data.name
      }
    });

    if (existing) {
      throw new BadRequestError('You already have a collection with this name');
    }

    return prisma.saveCollection.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate || false,
        coverImageUrl: data.coverImageUrl
      }
    });
  }

  /**
   * Update collection
   */
  async updateCollection(collectionId: string, userId: string, data: UpdateCollectionInput) {
    const collection = await prisma.saveCollection.findUnique({
      where: { id: collectionId }
    });

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    if (collection.userId !== userId) {
      throw new ForbiddenError('You can only edit your own collections');
    }

    // Check for name conflicts if name is being changed
    if (data.name && data.name !== collection.name) {
      const existing = await prisma.saveCollection.findFirst({
        where: {
          userId,
          name: data.name,
          id: {
            not: collectionId
          }
        }
      });

      if (existing) {
        throw new BadRequestError('You already have a collection with this name');
      }
    }

    return prisma.saveCollection.update({
      where: { id: collectionId },
      data: {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate,
        coverImageUrl: data.coverImageUrl
      }
    });
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionId: string, userId: string) {
    const collection = await prisma.saveCollection.findUnique({
      where: { id: collectionId }
    });

    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    if (collection.userId !== userId) {
      throw new ForbiddenError('You can only delete your own collections');
    }

    // Delete collection (saves will be set to null due to onDelete: SetNull)
    await prisma.saveCollection.delete({
      where: { id: collectionId }
    });
  }

  /**
   * Get user's saved posts (all collections)
   */
  async getUserSavedPosts(userId: string, options: { limit?: number; offset?: number } = {}) {
    const { limit = 20, offset = 0 } = options;

    const saves = await prisma.postSave.findMany({
      where: {
        userId
      },
      include: {
        post: {
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
          }
        },
        collection: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    return saves;
  }

  /**
   * Check if user has saved a post
   */
  async hasUserSavedPost(userId: string, postId: string): Promise<boolean> {
    const save = await prisma.postSave.findFirst({
      where: {
        userId,
        postId
      }
    });

    return !!save;
  }
}

// Export singleton instance
export const collectionService = new CollectionService();
