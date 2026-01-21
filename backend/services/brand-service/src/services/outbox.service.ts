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

export type BrandEventType =
  | 'brand.created'
  | 'brand.updated'
  | 'brand.deleted'
  | 'brand.status_changed';

export type BrandProductEventType =
  | 'brand_product.added'
  | 'brand_product.updated'
  | 'brand_product.removed'
  | 'brand_product.featured_changed'
  | 'brand_product.price_changed';

export type EventType = BrandEventType | BrandProductEventType;

// =============================================================================
// Event Payloads
// =============================================================================

export interface BrandCreatedPayload {
  brandId: string;
  brandCode: string;
  brandName: string;
  slug: string;
  status: string;
  createdAt: string;
}

export interface BrandUpdatedPayload {
  brandId: string;
  brandCode: string;
  brandName: string;
  slug: string;
  updatedFields: string[];
  updatedAt: string;
}

export interface BrandDeletedPayload {
  brandId: string;
  brandCode: string;
  brandName: string;
  deletedAt: string;
}

export interface BrandStatusChangedPayload {
  brandId: string;
  brandCode: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
}

export interface BrandProductAddedPayload {
  brandId: string;
  productId: string;
  brandPrice: number;
  isFeatured: boolean;
  isBestseller: boolean;
  isNewArrival: boolean;
  addedAt: string;
}

export interface BrandProductUpdatedPayload {
  brandId: string;
  productId: string;
  updatedFields: string[];
  updatedAt: string;
}

export interface BrandProductRemovedPayload {
  brandId: string;
  productId: string;
  removedAt: string;
}

export interface BrandProductPriceChangedPayload {
  brandId: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  changedAt: string;
}

// =============================================================================
// Outbox Service
// =============================================================================

export class OutboxService {
  /**
   * Publish an event to the outbox
   */
  async publish(
    aggregateType: 'Brand' | 'BrandProduct',
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
  // Brand Events
  // =============================================================================

  async brandCreated(brand: {
    id: string;
    brand_code: string;
    brand_name: string;
    slug: string;
    status: string;
    created_at: Date;
  }): Promise<void> {
    const payload: BrandCreatedPayload = {
      brandId: brand.id,
      brandCode: brand.brand_code,
      brandName: brand.brand_name,
      slug: brand.slug,
      status: brand.status,
      createdAt: brand.created_at.toISOString()
    };

    await this.publish('Brand', brand.id, 'brand.created', payload);
  }

  async brandUpdated(brand: {
    id: string;
    brand_code: string;
    brand_name: string;
    slug: string;
  }, updatedFields: string[]): Promise<void> {
    const payload: BrandUpdatedPayload = {
      brandId: brand.id,
      brandCode: brand.brand_code,
      brandName: brand.brand_name,
      slug: brand.slug,
      updatedFields,
      updatedAt: new Date().toISOString()
    };

    await this.publish('Brand', brand.id, 'brand.updated', payload);
  }

  async brandDeleted(brand: {
    id: string;
    brand_code: string;
    brand_name: string;
  }): Promise<void> {
    const payload: BrandDeletedPayload = {
      brandId: brand.id,
      brandCode: brand.brand_code,
      brandName: brand.brand_name,
      deletedAt: new Date().toISOString()
    };

    await this.publish('Brand', brand.id, 'brand.deleted', payload);
  }

  async brandStatusChanged(brand: {
    id: string;
    brand_code: string;
  }, oldStatus: string, newStatus: string): Promise<void> {
    const payload: BrandStatusChangedPayload = {
      brandId: brand.id,
      brandCode: brand.brand_code,
      oldStatus,
      newStatus,
      changedAt: new Date().toISOString()
    };

    await this.publish('Brand', brand.id, 'brand.status_changed', payload);
  }

  // =============================================================================
  // Brand Product Events
  // =============================================================================

  async brandProductAdded(brandProduct: {
    brand_id: string;
    product_id: string;
    brand_price: any;
    is_featured: boolean;
    is_bestseller: boolean;
    is_new_arrival: boolean;
    created_at: Date;
  }): Promise<void> {
    const payload: BrandProductAddedPayload = {
      brandId: brandProduct.brand_id,
      productId: brandProduct.product_id,
      brandPrice: Number(brandProduct.brand_price),
      isFeatured: brandProduct.is_featured,
      isBestseller: brandProduct.is_bestseller,
      isNewArrival: brandProduct.is_new_arrival,
      addedAt: brandProduct.created_at.toISOString()
    };

    await this.publish('BrandProduct', `${brandProduct.brand_id}:${brandProduct.product_id}`, 'brand_product.added', payload);
  }

  async brandProductUpdated(
    brandId: string,
    productId: string,
    updatedFields: string[]
  ): Promise<void> {
    const payload: BrandProductUpdatedPayload = {
      brandId,
      productId,
      updatedFields,
      updatedAt: new Date().toISOString()
    };

    await this.publish('BrandProduct', `${brandId}:${productId}`, 'brand_product.updated', payload);
  }

  async brandProductRemoved(brandId: string, productId: string): Promise<void> {
    const payload: BrandProductRemovedPayload = {
      brandId,
      productId,
      removedAt: new Date().toISOString()
    };

    await this.publish('BrandProduct', `${brandId}:${productId}`, 'brand_product.removed', payload);
  }

  async brandProductPriceChanged(
    brandId: string,
    productId: string,
    oldPrice: number,
    newPrice: number
  ): Promise<void> {
    const payload: BrandProductPriceChangedPayload = {
      brandId,
      productId,
      oldPrice,
      newPrice,
      changedAt: new Date().toISOString()
    };

    await this.publish('BrandProduct', `${brandId}:${productId}`, 'brand_product.price_changed', payload);
  }
}

// Singleton instance
export const outboxService = new OutboxService();
