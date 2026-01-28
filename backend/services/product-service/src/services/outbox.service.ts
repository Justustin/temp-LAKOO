import { prisma } from '../lib/prisma';

/**
 * Outbox Service
 *
 * Publishes domain events to the ServiceOutbox table for eventual delivery
 * to other services via Kafka/message broker.
 */

// =============================================================================
// Event Types
// =============================================================================

export type ProductEventType =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.draft_submitted'   // 🆕 Social Commerce
  | 'product.approved'           // 🆕 Social Commerce
  | 'product.rejected'           // 🆕 Social Commerce
  | 'product.changes_requested'; // 🆕 Social Commerce

export type EventType = ProductEventType;

// =============================================================================
// Event Payloads
// =============================================================================

export interface ProductCreatedPayload {
  productId: string;
  productCode: string;
  name: string;
  sellerId: string | null; // null for house brands
  categoryId: string;
  baseSellPrice: number;
  status: string;
  draftId: string | null;
  createdAt: string;
}

export interface ProductUpdatedPayload {
  productId: string;
  productCode: string;
  name: string;
  sellerId: string | null;
  categoryId: string;
  baseSellPrice: number;
  status: string;
  updatedAt: string;
}

export interface ProductDeletedPayload {
  productId: string;
  productCode: string;
  name: string;
  sellerId: string | null;
  deletedAt: string;
}

export interface DraftSubmittedPayload {
  draftId: string;
  sellerId: string;
  categoryId: string;
  name: string;
  baseSellPrice: number;
  submittedAt: string;
}

export interface ProductApprovedPayload {
  draftId: string;
  productId: string;
  sellerId: string;
  categoryId: string;
  name: string;
  baseSellPrice: number;
  reviewedBy: string;
  reviewedAt: string;
}

export interface ProductRejectedPayload {
  draftId: string;
  sellerId: string;
  categoryId: string;
  name: string;
  rejectionReason: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface ChangesRequestedPayload {
  draftId: string;
  sellerId: string;
  categoryId: string;
  name: string;
  feedback: string;
  reviewedBy: string;
  reviewedAt: string;
}

// =============================================================================
// Outbox Service
// =============================================================================

export class OutboxService {
  /**
   * Publish an event to the outbox
   */
  async publish(
    aggregateType: 'Product' | 'ProductDraft',
    aggregateId: string,
    eventType: EventType,
    payload: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const data: any = {
      aggregateType,
      aggregateId,
      eventType,
      payload
    };

    // Prisma JSON fields accept undefined (omit), but not raw null unless using Prisma.JsonNull/DbNull.
    if (metadata !== undefined) {
      data.metadata = metadata;
    }

    await prisma.serviceOutbox.create({
      data: {
        ...data
      }
    });
  }

  // =============================================================================
  // Product Events
  // =============================================================================

  async productCreated(product: {
    id: string;
    productCode: string;
    name: string;
    sellerId: string | null;
    categoryId: string;
    baseSellPrice: any;
    status: string;
    draftId: string | null;
    createdAt: Date;
  }): Promise<void> {
    const payload: ProductCreatedPayload = {
      productId: product.id,
      productCode: product.productCode,
      name: product.name,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      baseSellPrice: Number(product.baseSellPrice),
      status: product.status,
      draftId: product.draftId,
      createdAt: product.createdAt.toISOString()
    };

    await this.publish('Product', product.id, 'product.created', payload);
  }

  async productUpdated(product: {
    id: string;
    productCode: string;
    name: string;
    sellerId: string | null;
    categoryId: string;
    baseSellPrice: any;
    status: string;
    updatedAt: Date;
  }): Promise<void> {
    const payload: ProductUpdatedPayload = {
      productId: product.id,
      productCode: product.productCode,
      name: product.name,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      baseSellPrice: Number(product.baseSellPrice),
      status: product.status,
      updatedAt: product.updatedAt.toISOString()
    };

    await this.publish('Product', product.id, 'product.updated', payload);
  }

  async productDeleted(product: {
    id: string;
    productCode: string;
    name: string;
    sellerId: string | null;
  }): Promise<void> {
    const payload: ProductDeletedPayload = {
      productId: product.id,
      productCode: product.productCode,
      name: product.name,
      sellerId: product.sellerId,
      deletedAt: new Date().toISOString()
    };

    await this.publish('Product', product.id, 'product.deleted', payload);
  }

  // =============================================================================
  // Draft Approval Events 🆕 SOCIAL COMMERCE
  // =============================================================================

  async draftSubmitted(draft: {
    id: string;
    sellerId: string;
    categoryId: string;
    name: string;
    baseSellPrice: any;
    submittedAt: Date | null;
  }): Promise<void> {
    const payload: DraftSubmittedPayload = {
      draftId: draft.id,
      sellerId: draft.sellerId,
      categoryId: draft.categoryId,
      name: draft.name,
      baseSellPrice: Number(draft.baseSellPrice),
      submittedAt: draft.submittedAt?.toISOString() || new Date().toISOString()
    };

    await this.publish('ProductDraft', draft.id, 'product.draft_submitted', payload);
  }

  async productApproved(draft: {
    id: string;
    productId: string | null;
    sellerId: string;
    categoryId: string;
    name: string;
    baseSellPrice: any;
    reviewedBy: string | null;
    reviewedAt: Date | null;
  }): Promise<void> {
    const payload: ProductApprovedPayload = {
      draftId: draft.id,
      productId: draft.productId!,
      sellerId: draft.sellerId,
      categoryId: draft.categoryId,
      name: draft.name,
      baseSellPrice: Number(draft.baseSellPrice),
      reviewedBy: draft.reviewedBy!,
      reviewedAt: draft.reviewedAt?.toISOString() || new Date().toISOString()
    };

    await this.publish('ProductDraft', draft.id, 'product.approved', payload);
  }

  async productRejected(draft: {
    id: string;
    sellerId: string;
    categoryId: string;
    name: string;
    rejectionReason: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
  }): Promise<void> {
    const payload: ProductRejectedPayload = {
      draftId: draft.id,
      sellerId: draft.sellerId,
      categoryId: draft.categoryId,
      name: draft.name,
      rejectionReason: draft.rejectionReason || 'No reason provided',
      reviewedBy: draft.reviewedBy!,
      reviewedAt: draft.reviewedAt?.toISOString() || new Date().toISOString()
    };

    await this.publish('ProductDraft', draft.id, 'product.rejected', payload);
  }

  async changesRequested(draft: {
    id: string;
    sellerId: string;
    categoryId: string;
    name: string;
    moderationNotes: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
  }): Promise<void> {
    const payload: ChangesRequestedPayload = {
      draftId: draft.id,
      sellerId: draft.sellerId,
      categoryId: draft.categoryId,
      name: draft.name,
      feedback: draft.moderationNotes || 'Please make improvements',
      reviewedBy: draft.reviewedBy!,
      reviewedAt: draft.reviewedAt?.toISOString() || new Date().toISOString()
    };

    await this.publish('ProductDraft', draft.id, 'product.changes_requested', payload);
  }
}

// Singleton instance
export const outboxService = new OutboxService();
