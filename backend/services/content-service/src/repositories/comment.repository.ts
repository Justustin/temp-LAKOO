import { prisma } from '../lib/prisma';
import { Comment } from '../generated/prisma';

export interface PaginationOptions {
  offset?: number;
  limit?: number;
}

/**
 * Comment Repository
 * 
 * Handles all database operations for comments.
 */
export class CommentRepository {
  /**
   * Create a new comment
   */
  async create(data: {
    postId: string;
    userId: string;
    parentId?: string;
    content: string;
  }): Promise<Comment> {
    return prisma.comment.create({
      data: {
        postId: data.postId,
        userId: data.userId,
        parentId: data.parentId,
        content: data.content,
        moderationStatus: 'approved' // Auto-approve comments
      }
    });
  }

  /**
   * Find comment by ID
   */
  async findById(id: string): Promise<Comment | null> {
    return prisma.comment.findFirst({
      where: {
        id,
        deletedAt: null
      },
      include: {
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });
  }

  /**
   * Find comments by post ID
   */
  async findByPostId(
    postId: string,
    parentId: string | null = null,
    options: PaginationOptions = {}
  ): Promise<Comment[]> {
    const { offset = 0, limit = 20 } = options;

    return prisma.comment.findMany({
      where: {
        postId,
        parentId: parentId || null,
        deletedAt: null
      },
      include: {
        replies: {
          where: {
            deletedAt: null
          },
          include: {
            _count: {
              select: {
                likes: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: 3 // Show first 3 replies
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });
  }

  /**
   * Find comments by user ID
   */
  async findByUserId(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<Comment[]> {
    const { offset = 0, limit = 20 } = options;

    return prisma.comment.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        post: {
          select: {
            id: true,
            postCode: true,
            caption: true,
            userId: true
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });
  }

  /**
   * Update comment
   */
  async update(id: string, content: string): Promise<Comment> {
    return prisma.comment.update({
      where: { id },
      data: { content }
    });
  }

  /**
   * Soft delete comment
   */
  async softDelete(id: string): Promise<void> {
    await prisma.comment.update({
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
    await prisma.comment.update({
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
    await prisma.comment.update({
      where: { id },
      data: {
        likeCount: { decrement: 1 }
      }
    });
  }

  /**
   * Increment reply count (atomic)
   */
  async incrementReplyCount(id: string): Promise<void> {
    await prisma.comment.update({
      where: { id },
      data: {
        replyCount: { increment: 1 }
      }
    });
  }

  /**
   * Decrement reply count (atomic)
   */
  async decrementReplyCount(id: string): Promise<void> {
    await prisma.comment.update({
      where: { id },
      data: {
        replyCount: { decrement: 1 }
      }
    });
  }

  /**
   * Check if user has liked comment
   */
  async hasUserLiked(commentId: string, userId: string): Promise<boolean> {
    const like = await prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId
        }
      }
    });
    return !!like;
  }
}

// Export singleton instance
export const commentRepository = new CommentRepository();
