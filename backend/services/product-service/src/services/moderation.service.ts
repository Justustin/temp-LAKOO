import { moderationQueueRepository } from '../repositories/moderation-queue.repository';
import { ModerationQueue, ModerationPriority } from '../generated/prisma';
import { NotFoundError, BadRequestError } from '../middleware/error-handler';

/**
 * Moderation Service
 *
 * Handles moderation queue management
 */

export class ModerationService {
  /**
   * Get pending moderation queue
   */
  async getPendingQueue(limit: number = 50, offset: number = 0): Promise<ModerationQueue[]> {
    return await moderationQueueRepository.getPending(limit, offset);
  }

  /**
   * Get queue assigned to a moderator
   */
  async getAssignedQueue(
    moderatorId: string,
    includeCompleted: boolean = false
  ): Promise<ModerationQueue[]> {
    return await moderationQueueRepository.getAssignedTo(moderatorId, includeCompleted);
  }

  /**
   * Assign draft to moderator
   */
  async assignToModerator(
    draftId: string,
    moderatorId: string
  ): Promise<ModerationQueue> {
    const queue = await moderationQueueRepository.findByDraftId(draftId);

    if (!queue) {
      throw new NotFoundError('Moderation queue entry not found');
    }

    if (queue.completedAt) {
      throw new BadRequestError('This draft has already been reviewed');
    }

    if (queue.assignedTo && queue.assignedTo !== moderatorId) {
      throw new BadRequestError('This draft is already assigned to another moderator');
    }

    return await moderationQueueRepository.assign(queue.id, moderatorId);
  }

  /**
   * Update priority of a moderation item
   */
  async updatePriority(
    draftId: string,
    priority: ModerationPriority
  ): Promise<ModerationQueue> {
    const queue = await moderationQueueRepository.findByDraftId(draftId);

    if (!queue) {
      throw new NotFoundError('Moderation queue entry not found');
    }

    if (queue.completedAt) {
      throw new BadRequestError('Cannot update priority of completed review');
    }

    return await moderationQueueRepository.updatePriority(queue.id, priority);
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
    return await moderationQueueRepository.getStats();
  }

  /**
   * Auto-escalate old pending drafts
   * Should be run as a cron job
   */
  async escalateOldPending(olderThanHours: number = 24): Promise<{
    escalatedCount: number;
  }> {
    const count = await moderationQueueRepository.escalateOldPending(
      olderThanHours,
      'high'
    );

    return { escalatedCount: count };
  }

  /**
   * Get queue item by draft ID
   */
  async getQueueByDraftId(draftId: string): Promise<ModerationQueue | null> {
    return await moderationQueueRepository.findByDraftId(draftId);
  }
}

export const moderationService = new ModerationService();
