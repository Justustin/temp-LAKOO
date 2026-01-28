import { prisma } from '../lib/prisma';
import { ModerationQueue, ModerationPriority, Prisma } from '../generated/prisma';

export class ModerationQueueRepository {
  /**
   * Create moderation queue entry
   */
  async create(data: Prisma.ModerationQueueCreateInput): Promise<ModerationQueue> {
    return await prisma.moderationQueue.create({
      data,
      include: {
        draft: {
          include: {
            category: true
          }
        }
      }
    });
  }

  /**
   * Find queue entry by ID
   */
  async findById(id: string): Promise<ModerationQueue | null> {
    return await prisma.moderationQueue.findUnique({
      where: { id },
      include: {
        draft: {
          include: {
            category: true
          }
        }
      }
    });
  }

  /**
   * Find queue entry by draft ID
   */
  async findByDraftId(draftId: string): Promise<ModerationQueue | null> {
    return await prisma.moderationQueue.findFirst({
      where: { draftId },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        draft: {
          include: {
            category: true
          }
        }
      }
    });
  }

  /**
   * Get pending queue (unassigned and incomplete)
   */
  async getPending(
    limit: number = 50,
    offset: number = 0
  ): Promise<ModerationQueue[]> {
    return await prisma.moderationQueue.findMany({
      where: {
        completedAt: null
      },
      include: {
        draft: {
          include: {
            category: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' }, // Higher priority first
        { createdAt: 'asc' }  // Older first
      ],
      take: limit,
      skip: offset
    });
  }

  /**
   * Get queue assigned to moderator
   */
  async getAssignedTo(
    moderatorId: string,
    includeCompleted: boolean = false
  ): Promise<ModerationQueue[]> {
    const where: Prisma.ModerationQueueWhereInput = {
      assignedTo: moderatorId
    };

    if (!includeCompleted) {
      where.completedAt = null;
    }

    return await prisma.moderationQueue.findMany({
      where,
      include: {
        draft: {
          include: {
            category: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  /**
   * Assign to moderator
   */
  async assign(
    id: string,
    moderatorId: string
  ): Promise<ModerationQueue> {
    return await prisma.moderationQueue.update({
      where: { id },
      data: {
        assignedTo: moderatorId,
        assignedAt: new Date()
      },
      include: {
        draft: {
          include: {
            category: true
          }
        }
      }
    });
  }

  /**
   * Update priority
   */
  async updatePriority(
    id: string,
    priority: ModerationPriority
  ): Promise<ModerationQueue> {
    return await prisma.moderationQueue.update({
      where: { id },
      data: { priority },
      include: {
        draft: {
          include: {
            category: true
          }
        }
      }
    });
  }

  /**
   * Mark as completed
   */
  async markComplete(id: string): Promise<ModerationQueue> {
    return await prisma.moderationQueue.update({
      where: { id },
      data: {
        completedAt: new Date()
      },
      include: {
        draft: {
          include: {
            category: true
          }
        }
      }
    });
  }

  /**
   * Get moderation statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    assigned: number;
    completed: number;
    byPriority: Record<string, number>;
  }> {
    const [
      total,
      pending,
      assigned,
      completed,
      byPriorityRaw
    ] = await Promise.all([
      prisma.moderationQueue.count(),
      prisma.moderationQueue.count({
        where: {
          completedAt: null,
          assignedTo: null
        }
      }),
      prisma.moderationQueue.count({
        where: {
          completedAt: null,
          assignedTo: { not: null }
        }
      }),
      prisma.moderationQueue.count({
        where: {
          completedAt: { not: null }
        }
      }),
      prisma.moderationQueue.groupBy({
        by: ['priority'],
        _count: true,
        where: {
          completedAt: null
        }
      })
    ]);

    const byPriority: Record<string, number> = {};
    byPriorityRaw.forEach(item => {
      byPriority[item.priority] = item._count;
    });

    return {
      total,
      pending,
      assigned,
      completed,
      byPriority
    };
  }

  /**
   * Auto-escalate old pending drafts
   */
  async escalateOldPending(
    olderThanHours: number = 24,
    newPriority: ModerationPriority = 'high'
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const result = await prisma.moderationQueue.updateMany({
      where: {
        completedAt: null,
        createdAt: {
          lt: cutoffDate
        },
        priority: {
          in: ['low', 'normal']
        }
      },
      data: {
        priority: newPriority
      }
    });

    return result.count;
  }
}

export const moderationQueueRepository = new ModerationQueueRepository();
