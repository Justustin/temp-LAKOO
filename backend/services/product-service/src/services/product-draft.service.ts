import { prisma } from '../lib/prisma';
import { productDraftRepository } from '../repositories/product-draft.repository';
import { moderationQueueRepository } from '../repositories/moderation-queue.repository';
import { outboxService } from './outbox.service';
import { DraftStatus, ProductDraft, Product, Prisma } from '../generated/prisma';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/error-handler';
import { sellerServiceClient } from '../clients/seller.client';
import { notificationServiceClient } from '../clients/notification.client';
import slugify from 'slugify';

/**
 * Product Draft Service
 *
 * Handles draft approval workflow for seller products
 */

export interface CreateDraftInput {
  sellerId: string;
  categoryId: string;
  name: string;
  description?: string;
  shortDescription?: string;
  baseSellPrice: number;
  images: string[];
  variants: Array<{
    color: string;
    colorHex?: string;
    colorName?: string;
    size: string;
    sizeName?: string;
    sellPrice: number;
    imageUrl?: string;
  }>;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  material?: string;
  careInstructions?: string;
  countryOfOrigin?: string;
  tags?: string[];
}

export interface UpdateDraftInput {
  categoryId?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  baseSellPrice?: number;
  images?: string[];
  variants?: Array<{
    color: string;
    colorHex?: string;
    colorName?: string;
    size: string;
    sizeName?: string;
    sellPrice: number;
    imageUrl?: string;
  }>;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  material?: string;
  careInstructions?: string;
  countryOfOrigin?: string;
  tags?: string[];
}

export class ProductDraftService {
  /**
   * Create a new draft
   */
  async createDraft(data: CreateDraftInput): Promise<ProductDraft> {
    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Validate images
    if (!data.images || data.images.length < 3) {
      throw new BadRequestError('At least 3 images are required');
    }

    // Validate variants
    if (!data.variants || data.variants.length < 1) {
      throw new BadRequestError('At least 1 variant is required');
    }

    // Create draft
    const draft = await prisma.productDraft.create({
      data: {
        sellerId: data.sellerId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        shortDescription: data.shortDescription,
        baseSellPrice: data.baseSellPrice,
        images: data.images,
        variants: data.variants as any,
        weightGrams: data.weightGrams,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        material: data.material,
        careInstructions: data.careInstructions,
        countryOfOrigin: data.countryOfOrigin,
        tags: data.tags || [],
        status: 'draft'
      },
      include: {
        category: true,
        moderationQueues: true
      }
    });

    return draft;
  }

  /**
   * Update draft (only if status is 'draft' or 'changes_requested')
   */
  async updateDraft(
    draftId: string,
    sellerId: string,
    data: UpdateDraftInput
  ): Promise<ProductDraft> {
    const draft = await productDraftRepository.findById(draftId);

    if (!draft) {
      throw new NotFoundError('Draft not found');
    }

    // Check ownership
    if (draft.sellerId !== sellerId) {
      throw new ForbiddenError('You can only edit your own drafts');
    }

    // Can only edit drafts that are in 'draft' or 'changes_requested' status
    if (!['draft', 'changes_requested'].includes(draft.status)) {
      throw new BadRequestError(
        `Cannot edit draft with status: ${draft.status}`
      );
    }

    // Validate images if provided
    if (data.images && data.images.length < 3) {
      throw new BadRequestError('At least 3 images are required');
    }

    // Validate variants if provided
    if (data.variants && data.variants.length < 1) {
      throw new BadRequestError('At least 1 variant is required');
    }

    // Update draft
    const updateData: any = {};

    if (data.categoryId) updateData.categoryId = data.categoryId;
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.baseSellPrice) updateData.baseSellPrice = data.baseSellPrice;
    if (data.images) updateData.images = data.images;
    if (data.variants) updateData.variants = data.variants as any;
    if (data.weightGrams !== undefined) updateData.weightGrams = data.weightGrams;
    if (data.lengthCm !== undefined) updateData.lengthCm = data.lengthCm;
    if (data.widthCm !== undefined) updateData.widthCm = data.widthCm;
    if (data.heightCm !== undefined) updateData.heightCm = data.heightCm;
    if (data.material !== undefined) updateData.material = data.material;
    if (data.careInstructions !== undefined) updateData.careInstructions = data.careInstructions;
    if (data.countryOfOrigin !== undefined) updateData.countryOfOrigin = data.countryOfOrigin;
    if (data.tags !== undefined) updateData.tags = data.tags;

    const updatedDraft = await prisma.productDraft.update({
      where: { id: draftId },
      data: updateData,
      include: {
        category: true,
        moderationQueues: true
      }
    });

    return updatedDraft;
  }

  /**
   * Submit draft for review
   */
  async submitForReview(draftId: string, sellerId: string): Promise<ProductDraft> {
    const draft = await productDraftRepository.findById(draftId);

    if (!draft) {
      throw new NotFoundError('Draft not found');
    }

    // Check ownership
    if (draft.sellerId !== sellerId) {
      throw new ForbiddenError('You can only submit your own drafts');
    }

    // Can only submit drafts that are in 'draft' or 'changes_requested' status
    if (!['draft', 'changes_requested'].includes(draft.status)) {
      throw new BadRequestError(
        `Cannot submit draft with status: ${draft.status}`
      );
    }

    // Submit draft using transaction
    const [submittedDraft, _queue] = await prisma.$transaction(async (tx) => {
      // Update draft status
      const updated = await tx.productDraft.update({
        where: { id: draftId },
        data: {
          status: 'pending',
          submittedAt: new Date()
        },
        include: {
          category: true
        }
      });

      // Create moderation queue entry
      const queue = await tx.moderationQueue.create({
        data: {
          draftId: updated.id,
          priority: 'normal'
        }
      });

      return [updated, queue];
    });

    // Publish event
    await outboxService.draftSubmitted(submittedDraft);

    return submittedDraft;
  }

  /**
   * Get drafts by seller
   */
  async getDraftsBySeller(
    sellerId: string,
    status?: DraftStatus
  ): Promise<ProductDraft[]> {
    return await productDraftRepository.findBySellerId(sellerId, { status });
  }

  /**
   * Get draft by ID (with ownership check)
   */
  async getDraftById(draftId: string, sellerId: string): Promise<ProductDraft> {
    const draft = await productDraftRepository.findById(draftId);

    if (!draft) {
      throw new NotFoundError('Draft not found');
    }

    // Check ownership
    if (draft.sellerId !== sellerId) {
      throw new ForbiddenError('You can only view your own drafts');
    }

    return draft;
  }

  /**
   * Delete draft (only if status is 'draft' or 'rejected' or 'changes_requested')
   */
  async deleteDraft(draftId: string, sellerId: string): Promise<void> {
    const draft = await productDraftRepository.findById(draftId);

    if (!draft) {
      throw new NotFoundError('Draft not found');
    }

    // Check ownership
    if (draft.sellerId !== sellerId) {
      throw new ForbiddenError('You can only delete your own drafts');
    }

    // Can only delete drafts that are not pending or approved
    if (['pending', 'approved'].includes(draft.status)) {
      throw new BadRequestError(
        `Cannot delete draft with status: ${draft.status}`
      );
    }

    await productDraftRepository.delete(draftId);
  }

  /**
   * Get pending drafts (for moderators)
   */
  async getPendingDrafts(limit: number = 50, offset: number = 0): Promise<ProductDraft[]> {
    return await productDraftRepository.findPending(limit, offset);
  }

  /**
   * Approve draft and create product
   */
  async approveDraft(
    draftId: string,
    moderatorId: string
  ): Promise<{ draft: ProductDraft; product: Product }> {
    const draft = await productDraftRepository.findById(draftId);

    if (!draft) {
      throw new NotFoundError('Draft not found');
    }

    if (draft.status !== 'pending') {
      throw new BadRequestError('Only pending drafts can be approved');
    }

    // Use transaction to create product and update draft
    const [product, approvedDraft] = await prisma.$transaction(async (tx) => {
      // Generate product code and slug
      const productCode = await this.generateProductCode(draft.name);
      const slug = slugify(draft.name, { lower: true, strict: true });

      // Create product
      const newProduct = await tx.product.create({
        data: {
          categoryId: draft.categoryId,
          sellerId: draft.sellerId,
          draftId: draft.id,
          productCode,
          name: draft.name,
          slug,
          description: draft.description,
          shortDescription: draft.shortDescription,
          baseCostPrice: Number(draft.baseSellPrice) * 0.7, // Assume 30% markup
          baseSellPrice: draft.baseSellPrice,
          weightGrams: draft.weightGrams,
          lengthCm: draft.lengthCm,
          widthCm: draft.widthCm,
          heightCm: draft.heightCm,
          primaryImageUrl: (draft.images as string[])[0],
          material: draft.material,
          careInstructions: draft.careInstructions,
          countryOfOrigin: draft.countryOfOrigin,
          status: 'approved',
          tags: draft.tags,
          publishedAt: new Date(),
          createdBy: moderatorId
        }
      });

      // Create product variants
      const variantsData = draft.variants as Array<any>;
      for (const variant of variantsData) {
        const sku = `${productCode}-${variant.color}-${variant.size}`;
        await tx.productVariant.create({
          data: {
            productId: newProduct.id,
            sku,
            color: variant.color,
            colorHex: variant.colorHex,
            colorName: variant.colorName,
            size: variant.size,
            sizeName: variant.sizeName,
            costPrice: Number(variant.sellPrice) * 0.7,
            sellPrice: variant.sellPrice,
            imageUrl: variant.imageUrl,
            isActive: true
          }
        });
      }

      // Create product images
      const imagesData = draft.images as string[];
      for (let i = 0; i < imagesData.length; i++) {
        await tx.productImage.create({
          data: {
            productId: newProduct.id,
            imageUrl: imagesData[i]!,
            displayOrder: i,
            isPrimary: i === 0
          }
        });
      }

      // Update draft status
      const updated = await tx.productDraft.update({
        where: { id: draftId },
        data: {
          status: 'approved',
          productId: newProduct.id,
          reviewedBy: moderatorId,
          reviewedAt: new Date()
        },
        include: {
          category: true
        }
      });

      // Mark moderation queue as complete
      const queue = await tx.moderationQueue.findFirst({
        where: { draftId }
      });
      if (queue) {
        await tx.moderationQueue.update({
          where: { id: queue.id },
          data: { completedAt: new Date() }
        });
      }

      return [newProduct, updated];
    });

    // Publish events
    await Promise.all([
      outboxService.productApproved(approvedDraft),
      outboxService.productCreated(product)
    ]);

    // Call seller-service to increment product count
    await sellerServiceClient.incrementProductCount(draft.sellerId);

    // Send notification to seller
    await notificationServiceClient.notifyDraftApproved(
      draft.sellerId,
      draft.id,
      draft.name
    );

    return { draft: approvedDraft, product };
  }

  /**
   * Reject draft
   */
  async rejectDraft(
    draftId: string,
    moderatorId: string,
    reason: string
  ): Promise<ProductDraft> {
    const draft = await productDraftRepository.findById(draftId);

    if (!draft) {
      throw new NotFoundError('Draft not found');
    }

    if (draft.status !== 'pending') {
      throw new BadRequestError('Only pending drafts can be rejected');
    }

    const [rejectedDraft, _] = await prisma.$transaction(async (tx) => {
      // Update draft status
      const updated = await tx.productDraft.update({
        where: { id: draftId },
        data: {
          status: 'rejected',
          reviewedBy: moderatorId,
          reviewedAt: new Date(),
          rejectionReason: reason
        },
        include: {
          category: true
        }
      });

      // Mark moderation queue as complete
      const queue = await tx.moderationQueue.findFirst({
        where: { draftId }
      });
      if (queue) {
        await tx.moderationQueue.update({
          where: { id: queue.id },
          data: { completedAt: new Date() }
        });
      }

      return [updated, null];
    });

    // Publish event
    await outboxService.productRejected(rejectedDraft);

    // Send notification to seller
    await notificationServiceClient.notifyDraftRejected(
      draft.sellerId,
      draft.id,
      draft.name,
      reason
    );

    return rejectedDraft;
  }

  /**
   * Request changes
   */
  async requestChanges(
    draftId: string,
    moderatorId: string,
    feedback: string
  ): Promise<ProductDraft> {
    const draft = await productDraftRepository.findById(draftId);

    if (!draft) {
      throw new NotFoundError('Draft not found');
    }

    if (draft.status !== 'pending') {
      throw new BadRequestError('Only pending drafts can have changes requested');
    }

    const [updatedDraft, _] = await prisma.$transaction(async (tx) => {
      // Update draft status
      const updated = await tx.productDraft.update({
        where: { id: draftId },
        data: {
          status: 'changes_requested',
          reviewedBy: moderatorId,
          reviewedAt: new Date(),
          moderationNotes: feedback
        },
        include: {
          category: true
        }
      });

      // Mark moderation queue as complete
      const queue = await tx.moderationQueue.findFirst({
        where: { draftId }
      });
      if (queue) {
        await tx.moderationQueue.update({
          where: { id: queue.id },
          data: { completedAt: new Date() }
        });
      }

      return [updated, null];
    });

    // Publish event
    await outboxService.changesRequested(updatedDraft);

    // Send notification to seller
    await notificationServiceClient.notifyChangesRequested(
      draft.sellerId,
      draft.id,
      draft.name,
      feedback
    );

    return updatedDraft;
  }

  /**
   * Generate unique product code
   */
  private async generateProductCode(productName: string): Promise<string> {
    // Take first 3 chars of product name (uppercase, alphanumeric only)
    const prefix = productName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, 'X');

    // Generate random 6-digit number
    let code: string;
    let exists = true;

    while (exists) {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      code = `${prefix}-${randomNum}`;

      // Check if code already exists
      const existingProduct = await prisma.product.findUnique({
        where: { productCode: code }
      });

      exists = !!existingProduct;
    }

    return code!;
  }
}

export const productDraftService = new ProductDraftService();
