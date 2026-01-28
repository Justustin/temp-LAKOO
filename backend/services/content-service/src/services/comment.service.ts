import { prisma } from '../lib/prisma';
import { commentRepository, PaginationOptions } from '../repositories/comment.repository';
import { postRepository } from '../repositories/post.repository';
import { outboxService } from './outbox.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler';

/**
 * Create comment input
 */
export interface CreateCommentInput {
  postId: string;
  content: string;
  parentId?: string;
}

/**
 * Comment Service
 * 
 * Handles all business logic for comments including:
 * - Comment creation with mention extraction
 * - Nested replies
 * - Comment likes
 */
export class CommentService {
  /**
   * Extract user mentions from comment content
   * Format: @userId (assuming UUID format)
   * In production, you'd want to resolve usernames to IDs
   */
  private extractMentions(content: string): string[] {
    // Extract UUID patterns after @
    const regex = /@([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
    const matches = content.match(regex) || [];
    return [...new Set(matches.map(m => m.slice(1)))];
  }

  /**
   * Create a new comment
   */
  async createComment(userId: string, data: CreateCommentInput) {
    // 1. Verify post exists and is published
    const post = await postRepository.findById(data.postId);
    if (!post || post.status !== 'published') {
      throw new NotFoundError('Post not found');
    }

    // 2. If reply, verify parent comment exists
    if (data.parentId) {
      const parent = await commentRepository.findById(data.parentId);
      if (!parent || parent.postId !== data.postId) {
        throw new BadRequestError('Invalid parent comment');
      }
    }

    // 3. Extract mentions from content
    const mentions = this.extractMentions(data.content);

    // 4. Create comment in transaction
    const comment = await prisma.$transaction(async (tx) => {
      // Create comment
      const newComment = await tx.comment.create({
        data: {
          postId: data.postId,
          userId,
          parentId: data.parentId,
          content: data.content,
          moderationStatus: 'approved'
        }
      });

      // Create mentions
      for (const mentionedUserId of mentions) {
        await tx.commentMention.create({
          data: {
            commentId: newComment.id,
            mentionedUserId
          }
        });
      }

      // Update post comment count
      await tx.post.update({
        where: { id: data.postId },
        data: {
          commentCount: { increment: 1 }
        }
      });

      // Update parent reply count if this is a reply
      if (data.parentId) {
        await tx.comment.update({
          where: { id: data.parentId },
          data: {
            replyCount: { increment: 1 }
          }
        });
      }

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Comment',
          aggregateId: newComment.id,
          eventType: 'comment.created',
          payload: {
            commentId: newComment.id,
            postId: data.postId,
            userId,
            postAuthorId: post.userId,
            parentId: data.parentId || null,
            isReply: !!data.parentId,
            mentions,
            createdAt: newComment.createdAt.toISOString()
          }
        }
      });

      return newComment;
    });

    // 5. Return comment with relations
    return commentRepository.findById(comment.id);
  }

  /**
   * Get comments for a post
   */
  async getCommentsByPost(
    postId: string,
    parentId: string | null = null,
    options: PaginationOptions = {}
  ) {
    // Verify post exists
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return commentRepository.findByPostId(postId, parentId, options);
  }

  /**
   * Get comment by ID
   */
  async getCommentById(commentId: string) {
    const comment = await commentRepository.findById(commentId);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    return comment;
  }

  /**
   * Get comments by user
   */
  async getCommentsByUser(userId: string, options: PaginationOptions = {}) {
    return commentRepository.findByUserId(userId, options);
  }

  /**
   * Update comment
   */
  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await commentRepository.findById(commentId);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    return commentRepository.update(commentId, content);
  }

  /**
   * Delete comment (soft delete)
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await commentRepository.findById(commentId);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    await prisma.$transaction(async (tx) => {
      // Soft delete comment
      await tx.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() }
      });

      // Decrement post comment count
      await tx.post.update({
        where: { id: comment.postId },
        data: {
          commentCount: { decrement: 1 }
        }
      });

      // Decrement parent reply count if this is a reply
      if (comment.parentId) {
        await tx.comment.update({
          where: { id: comment.parentId },
          data: {
            replyCount: { decrement: 1 }
          }
        });
      }

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Comment',
          aggregateId: commentId,
          eventType: 'comment.deleted',
          payload: {
            commentId,
            postId: comment.postId,
            userId,
            deletedAt: new Date().toISOString()
          }
        }
      });
    });
  }

  /**
   * Like a comment
   */
  async likeComment(commentId: string, userId: string) {
    const comment = await commentRepository.findById(commentId);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Check if already liked
    const alreadyLiked = await commentRepository.hasUserLiked(commentId, userId);
    if (alreadyLiked) {
      throw new BadRequestError('You have already liked this comment');
    }

    await prisma.$transaction(async (tx) => {
      // Create like
      await tx.commentLike.create({
        data: {
          commentId,
          userId
        }
      });

      // Increment count
      await tx.comment.update({
        where: { id: commentId },
        data: {
          likeCount: { increment: 1 }
        }
      });

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Comment',
          aggregateId: commentId,
          eventType: 'comment.liked',
          payload: {
            commentId,
            postId: comment.postId,
            userId,
            commentAuthorId: comment.userId,
            createdAt: new Date().toISOString()
          }
        }
      });
    });
  }

  /**
   * Unlike a comment
   */
  async unlikeComment(commentId: string, userId: string) {
    const comment = await commentRepository.findById(commentId);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    await prisma.$transaction(async (tx) => {
      // Delete like
      await tx.commentLike.delete({
        where: {
          commentId_userId: {
            commentId,
            userId
          }
        }
      });

      // Decrement count
      await tx.comment.update({
        where: { id: commentId },
        data: {
          likeCount: { decrement: 1 }
        }
      });
    });
  }
}

// Export singleton instance
export const commentService = new CommentService();
