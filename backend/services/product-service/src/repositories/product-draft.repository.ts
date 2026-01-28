import { prisma } from '../lib/prisma';
import { DraftStatus, ProductDraft, Prisma } from '../generated/prisma';

export class ProductDraftRepository {
  /**
   * Create a new product draft
   */
  async create(data: Prisma.ProductDraftCreateInput): Promise<ProductDraft> {
    return await prisma.productDraft.create({
      data,
      include: {
        category: true,
        moderationQueues: true
      }
    });
  }

  /**
   * Find draft by ID
   */
  async findById(id: string): Promise<ProductDraft | null> {
    return await prisma.productDraft.findUnique({
      where: { id },
      include: {
        category: true,
        moderationQueues: true
      }
    });
  }

  /**
   * Find drafts by seller ID
   */
  async findBySellerId(
    sellerId: string,
    options?: {
      status?: DraftStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<ProductDraft[]> {
    const where: Prisma.ProductDraftWhereInput = {
      sellerId
    };

    if (options?.status) {
      where.status = options.status;
    }

    return await prisma.productDraft.findMany({
      where,
      include: {
        category: true,
        moderationQueues: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: options?.limit,
      skip: options?.offset
    });
  }

  /**
   * Find drafts pending moderation
   */
  async findPending(limit: number = 50, offset: number = 0): Promise<ProductDraft[]> {
    return await prisma.productDraft.findMany({
      where: {
        status: 'pending'
      },
      include: {
        category: true,
        moderationQueues: true
      },
      orderBy: {
        submittedAt: 'asc' // Oldest first
      },
      take: limit,
      skip: offset
    });
  }

  /**
   * Update draft
   */
  async update(id: string, data: Prisma.ProductDraftUpdateInput): Promise<ProductDraft> {
    return await prisma.productDraft.update({
      where: { id },
      data,
      include: {
        category: true,
        moderationQueues: true
      }
    });
  }

  /**
   * Update draft status
   */
  async updateStatus(id: string, status: DraftStatus): Promise<ProductDraft> {
    return await prisma.productDraft.update({
      where: { id },
      data: { status },
      include: {
        category: true,
        moderationQueues: true
      }
    });
  }

  /**
   * Submit draft for review
   */
  async submitForReview(id: string): Promise<ProductDraft> {
    return await prisma.productDraft.update({
      where: { id },
      data: {
        status: 'pending',
        submittedAt: new Date()
      },
      include: {
        category: true,
        moderationQueues: true
      }
    });
  }

  /**
   * Approve draft
   */
  async approve(
    id: string,
    productId: string,
    moderatorId: string
  ): Promise<ProductDraft> {
    return await prisma.productDraft.update({
      where: { id },
      data: {
        status: 'approved',
        productId,
        reviewedBy: moderatorId,
        reviewedAt: new Date()
      },
      include: {
        category: true,
        moderationQueues: true
      }
    });
  }

  /**
   * Reject draft
   */
  async reject(
    id: string,
    moderatorId: string,
    reason: string
  ): Promise<ProductDraft> {
    return await prisma.productDraft.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedBy: moderatorId,
        reviewedAt: new Date(),
        rejectionReason: reason
      },
      include: {
        category: true,
        moderationQueues: true
      }
    });
  }

  /**
   * Request changes
   */
  async requestChanges(
    id: string,
    moderatorId: string,
    feedback: string
  ): Promise<ProductDraft> {
    return await prisma.productDraft.update({
      where: { id },
      data: {
        status: 'changes_requested',
        reviewedBy: moderatorId,
        reviewedAt: new Date(),
        moderationNotes: feedback
      },
      include: {
        category: true,
        moderationQueues: true
      }
    });
  }

  /**
   * Delete draft
   */
  async delete(id: string): Promise<ProductDraft> {
    return await prisma.productDraft.delete({
      where: { id }
    });
  }

  /**
   * Count drafts by seller
   */
  async countBySeller(sellerId: string, status?: DraftStatus): Promise<number> {
    const where: Prisma.ProductDraftWhereInput = {
      sellerId
    };

    if (status) {
      where.status = status;
    }

    return await prisma.productDraft.count({ where });
  }

  /**
   * Count pending drafts
   */
  async countPending(): Promise<number> {
    return await prisma.productDraft.count({
      where: { status: 'pending' }
    });
  }
}

export const productDraftRepository = new ProductDraftRepository();
