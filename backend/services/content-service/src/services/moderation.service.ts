import { prisma } from '../lib/prisma';
import { postRepository } from '../repositories/post.repository';
import { commentRepository } from '../repositories/comment.repository';
import { outboxService } from './outbox.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler';

/**
 * Report content input
 */
export interface ReportContentInput {
  contentType: 'post' | 'comment';
  contentId: string;
  reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'copyright' | 'counterfeit' | 'other';
  description?: string;
}

/**
 * Resolve report input
 */
export interface ResolveReportInput {
  action: 'none' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned';
  resolution: string;
}

/**
 * Moderation Service
 * 
 * Handles content reporting and moderation actions.
 */
export class ModerationService {
  /**
   * Report content (post or comment)
   */
  async reportContent(reporterId: string, data: ReportContentInput) {
    // 1. Verify content exists
    if (data.contentType === 'post') {
      const post = await postRepository.findById(data.contentId);
      if (!post) {
        throw new NotFoundError('Post not found');
      }
    } else {
      const comment = await commentRepository.findById(data.contentId);
      if (!comment) {
        throw new NotFoundError('Comment not found');
      }
    }

    // 2. Check if user has already reported this content
    const existingReport = await prisma.contentReport.findUnique({
      where: {
        reporterId_contentType_contentId: {
          reporterId,
          contentType: data.contentType,
          contentId: data.contentId
        }
      }
    });

    if (existingReport) {
      throw new BadRequestError('You have already reported this content');
    }

    // 3. Create report in transaction
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.contentReport.create({
        data: {
          reporterId,
          contentType: data.contentType,
          contentId: data.contentId,
          postId: data.contentType === 'post' ? data.contentId : null,
          commentId: data.contentType === 'comment' ? data.contentId : null,
          reason: data.reason,
          description: data.description,
          status: 'pending'
        }
      });

      // Update content flags
      if (data.contentType === 'post') {
        await tx.post.update({
          where: { id: data.contentId },
          data: {
            isReported: true,
            reportCount: { increment: 1 }
          }
        });
      } else {
        await tx.comment.update({
          where: { id: data.contentId },
          data: {
            isReported: true
          }
        });
      }

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'ContentReport',
          aggregateId: newReport.id,
          eventType: 'content.reported',
          payload: {
            reportId: newReport.id,
            contentType: data.contentType,
            contentId: data.contentId,
            reporterId,
            reason: data.reason,
            createdAt: newReport.createdAt.toISOString()
          }
        }
      });

      return newReport;
    });

    return report;
  }

  /**
   * Get pending reports (for moderators)
   */
  async getPendingReports(limit: number = 20, offset: number = 0) {
    return prisma.contentReport.findMany({
      where: {
        status: { in: ['pending', 'under_review'] }
      },
      include: {
        post: {
          select: {
            id: true,
            postCode: true,
            caption: true,
            userId: true,
            status: true
          }
        },
        comment: {
          select: {
            id: true,
            content: true,
            userId: true,
            postId: true
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
   * Get report by ID
   */
  async getReportById(reportId: string) {
    const report = await prisma.contentReport.findUnique({
      where: { id: reportId },
      include: {
        post: {
          select: {
            id: true,
            postCode: true,
            caption: true,
            userId: true,
            status: true,
            media: true
          }
        },
        comment: {
          select: {
            id: true,
            content: true,
            userId: true,
            postId: true
          }
        }
      }
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    return report;
  }

  /**
   * Update report status (for moderators)
   */
  async updateReportStatus(reportId: string, status: 'under_review' | 'resolved' | 'dismissed') {
    const report = await prisma.contentReport.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    return prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status,
        ...(status === 'resolved' ? { resolvedAt: new Date() } : {})
      }
    });
  }

  /**
   * Resolve report with action (for moderators)
   */
  async resolveReport(reportId: string, moderatorId: string, data: ResolveReportInput) {
    const report = await prisma.contentReport.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.status !== 'pending' && report.status !== 'under_review') {
      throw new BadRequestError('Report already resolved');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Take action on content
      if (data.action === 'content_removed') {
        if (report.contentType === 'post') {
          await tx.post.update({
            where: { id: report.contentId },
            data: {
              status: 'removed',
              moderationStatus: 'rejected',
              moderatedAt: new Date(),
              moderatedBy: moderatorId
            }
          });
        } else {
          await tx.comment.update({
            where: { id: report.contentId },
            data: {
              moderationStatus: 'rejected',
              deletedAt: new Date()
            }
          });
        }
      }

      // 2. Update report
      const updatedReport = await tx.contentReport.update({
        where: { id: reportId },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: moderatorId,
          resolution: data.resolution,
          actionTaken: data.action
        }
      });

      // 3. Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'ContentReport',
          aggregateId: reportId,
          eventType: 'content.moderated',
          payload: {
            reportId,
            contentType: report.contentType,
            contentId: report.contentId,
            actionTaken: data.action,
            moderatorId,
            moderatedAt: new Date().toISOString()
          }
        }
      });

      return updatedReport;
    });
  }

  /**
   * Dismiss report (for moderators)
   */
  async dismissReport(reportId: string, moderatorId: string, reason: string) {
    const report = await prisma.contentReport.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    return prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status: 'dismissed',
        resolvedAt: new Date(),
        resolvedBy: moderatorId,
        resolution: reason,
        actionTaken: 'none'
      }
    });
  }

  /**
   * Get reports by content
   */
  async getReportsByContent(contentType: 'post' | 'comment', contentId: string) {
    return prisma.contentReport.findMany({
      where: {
        contentType,
        contentId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get user's reports
   */
  async getUserReports(userId: string, limit: number = 20, offset: number = 0) {
    return prisma.contentReport.findMany({
      where: {
        reporterId: userId
      },
      include: {
        post: {
          select: {
            id: true,
            postCode: true,
            caption: true
          }
        },
        comment: {
          select: {
            id: true,
            content: true
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
}

// Export singleton instance
export const moderationService = new ModerationService();
