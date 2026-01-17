# LAKOO Microservice Architecture Migration Plan

**Created:** January 2026
**Status:** In Progress
**Related Documents:**
- `LAKOO_BUSINESS_MODEL.md` - Business model and requirements
- `backend/services/claude.md` - Service standardization guide
- `*-service-schema.prisma` - Database schemas for each service

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Target Architecture](#target-architecture)
4. [Service Inventory](#service-inventory)
5. [Implementation Phases](#implementation-phases)
6. [Service Implementation Details](#service-implementation-details)
7. [Inter-Service Communication](#inter-service-communication)
8. [Data Management Strategy](#data-management-strategy)
9. [Security Architecture](#security-architecture)
10. [Deployment Strategy](#deployment-strategy)

---

## Executive Summary

LAKOO is migrating from a partial microservices setup to a fully distributed architecture with 16 services. The platform supports:
- **15 Official LAKOO Brands** - Shein-style multi-brand e-commerce
- **Third-Party Marketplace** - 0% commission, ad-based revenue
- **Centralized Warehouse** - Grosir bundle constraint management
- **Event-Driven Architecture** - Kafka for async communication

### Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript (Node.js) + Go | TS for rapid development, Go for performance-critical |
| API Style | REST + Events | REST for sync, Kafka for async |
| Database | PostgreSQL per service | Data isolation, independent scaling |
| Auth Model | Gateway Trust | API Gateway validates JWT, services trust headers |
| Event Pattern | Outbox → Kafka | Reliable event delivery with transactional outbox |

---

## Current State Analysis

### Implemented Services (4/16)

| Service | Port | Language | Status | Compliance |
|---------|------|----------|--------|------------|
| payment-service | 3007 | TypeScript | ✅ Complete | ✅ Reference implementation |
| warehouse-service | 3012 | TypeScript | ⚠️ Partial | ❌ Uses @repo/database, no auth/outbox |
| order-service | 3006 | Go | 🔧 Structured | ⚠️ Needs auth, events |
| notification-service | 3008 | Go | 🔧 Early stage | ⚠️ Kafka consumer only |

### Not Yet Implemented (12/16)

| Service | Port | Database | Priority |
|---------|------|----------|----------|
| auth-service | 3001 | auth_db | Critical |
| product-service | 3002 | product_db | Critical |
| cart-service | 3003 | cart_db | High |
| supplier-service | 3004 | supplier_db | Medium |
| brand-service | 3005 | brand_db | High |
| logistic-service | 3009 | logistics_db | High |
| address-service | 3010 | address_db | Medium |
| wallet-service | 3011 | wallet_db | Medium |
| advertisement-service | 3013 | advert_db | Low |
| support-service | 3014 | support_db | Low |
| seller-service | 3015 | seller_db | Medium |
| review-service | 3016 | review_db | Low |

### Critical Issues to Address

1. **warehouse-service** uses `@repo/database` instead of local Prisma
2. **warehouse-service** missing gateway auth, validation middleware, outbox events
3. **warehouse-service** schema differs from `warehouse-service-schema.prisma`
4. No shared Node.js packages for common utilities
5. Go services need equivalent standardization patterns

---

## Target Architecture

```
                                    ┌─────────────────────────────────────────────┐
                                    │              CLIENTS                         │
                                    │   (Web App, Mobile App, Admin Dashboard)    │
                                    └────────────────────┬────────────────────────┘
                                                         │
                                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    API GATEWAY                                          │
│                                                                                         │
│  • JWT Validation (auth at edge)                                                       │
│  • Rate Limiting                                                                        │
│  • Request Routing                                                                      │
│  • Adds headers: x-user-id, x-user-role, x-gateway-key                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                                         │
                    ┌────────────────────────────────────┼────────────────────────────────┐
                    │                                    │                                │
                    ▼                                    ▼                                ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│     CORE SERVICES           │  │    COMMERCE SERVICES        │  │    SUPPORT SERVICES         │
│                             │  │                             │  │                             │
│ • auth-service (3001)       │  │ • product-service (3002)    │  │ • notification-svc (3008)   │
│ • brand-service (3005)      │  │ • cart-service (3003)       │  │ • support-service (3014)    │
│ • address-service (3010)    │  │ • order-service (3006)      │  │ • review-service (3016)     │
│                             │  │ • payment-service (3007)    │  │                             │
└─────────────────────────────┘  │ • wallet-service (3011)     │  └─────────────────────────────┘
                                 └─────────────────────────────┘
                    ┌────────────────────────────────────┼────────────────────────────────┐
                    │                                    │                                │
                    ▼                                    ▼                                ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│    SUPPLY CHAIN SERVICES    │  │    MARKETPLACE SERVICES     │  │    ANALYTICS SERVICES       │
│                             │  │                             │  │                             │
│ • warehouse-service (3012)  │  │ • seller-service (3015)     │  │ • advertisement-svc (3013)  │
│ • supplier-service (3004)   │  │                             │  │                             │
│ • logistic-service (3009)   │  │                             │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
                                                         │
                                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                     KAFKA                                               │
│                                                                                         │
│  Topics: payment.events, order.events, inventory.events, notification.events, etc.    │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PostgreSQL Databases                                       │
│                                                                                         │
│  Each service owns its database: auth_db, product_db, order_db, payment_db, etc.      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Inventory

### Service Details

#### 1. auth-service (Port 3001)
**Owner:** User authentication and authorization
**Database:** auth_db
**Key Entities:** User, Session, Role, Permission, VerificationToken
**Events Published:**
- `user.registered` - New user signup
- `user.verified` - Email/phone verified
- `user.login` - User logged in
- `user.password_reset` - Password changed

**Consumes Events:** None (origin service)

**External Dependencies:**
- SendGrid (email)
- Twilio (SMS OTP)

---

#### 2. product-service (Port 3002)
**Owner:** Product catalog management
**Database:** product_db
**Key Entities:** Product, ProductVariant, Category, ProductImage
**Events Published:**
- `product.created`
- `product.updated`
- `product.deleted`
- `product.variant_added`

**Consumes Events:**
- `inventory.low_stock` - Update product availability display

**External Dependencies:**
- AWS S3 (images)
- Elasticsearch (search)

---

#### 3. cart-service (Port 3003)
**Owner:** Shopping cart management
**Database:** cart_db
**Key Entities:** Cart, CartItem, SavedForLater
**Events Published:**
- `cart.item_added`
- `cart.item_removed`
- `cart.cleared`

**Consumes Events:**
- `inventory.variant_locked` - Remove locked variants from cart
- `product.deleted` - Remove product from carts

**Inter-Service Calls:**
- GET `product-service/products/:id` - Validate product exists
- GET `warehouse-service/check-bundle-overflow` - Check variant availability

---

#### 4. supplier-service (Port 3004)
**Owner:** Factory/supplier management
**Database:** supplier_db
**Key Entities:** Supplier, SupplierContact, SupplierProduct, SupplierPerformance
**Events Published:**
- `supplier.created`
- `supplier.updated`
- `supplier.performance_updated`

**Consumes Events:**
- `purchase_order.received` - Update supplier metrics

**External Dependencies:**
- WhatsApp (Baileys) - Factory communication

---

#### 5. brand-service (Port 3005)
**Owner:** 15 LAKOO brand management
**Database:** brand_db
**Key Entities:** Brand, BrandProduct, BrandCollection, BrandPricing
**Events Published:**
- `brand.product_assigned`
- `brand.price_updated`
- `brand.collection_created`

**Consumes Events:**
- `product.created` - Notify brand managers of new products

**Business Logic:**
- Same product can belong to multiple brands with different prices
- Brand managers curate products from central catalog

---

#### 6. order-service (Port 3006)
**Owner:** Order lifecycle management
**Database:** order_db
**Language:** Go
**Key Entities:** Order, OrderItem, OrderStatusHistory
**Events Published:**
- `order.created`
- `order.confirmed`
- `order.shipped`
- `order.delivered`
- `order.cancelled`
- `order.return_requested`

**Consumes Events:**
- `payment.paid` - Confirm order
- `payment.expired` - Cancel order
- `inventory.reserved` - Update order with reservation
- `logistics.shipped` - Update tracking info

**Inter-Service Calls:**
- POST `warehouse-service/reserve-inventory` - Reserve stock
- POST `payment-service/create` - Create payment
- POST `logistic-service/create-shipment` - Create shipment

---

#### 7. payment-service (Port 3007) ✅ REFERENCE IMPLEMENTATION
**Owner:** Payment processing and refunds
**Database:** payment_db
**Key Entities:** Payment, Refund, TransactionLedger, PaymentMethod
**Events Published:**
- `payment.created`
- `payment.paid`
- `payment.expired`
- `payment.failed`
- `refund.requested`
- `refund.completed`
- `settlement.completed`

**Consumes Events:**
- `order.created` - Create payment record
- `order.cancelled` - Cancel pending payment

**External Dependencies:**
- Xendit (payment gateway)

**Jobs:**
- `expire-payments` - Expire unpaid invoices
- `weekly-settlement` - Process seller payouts
- `reconciliation` - Verify transactions with Xendit

---

#### 8. notification-service (Port 3008)
**Owner:** Multi-channel notifications
**Database:** notification_db
**Language:** Go (Kafka consumer)
**Key Entities:** Notification, NotificationTemplate, NotificationPreference
**Events Published:**
- `notification.sent`
- `notification.failed`

**Consumes Events:**
- `payment.paid` - Send payment confirmation
- `order.shipped` - Send shipping notification
- `order.delivered` - Send delivery confirmation
- `user.registered` - Send welcome email

**Channels:**
- WhatsApp (Baileys)
- Email (SendGrid)
- Push (Firebase)
- SMS (Twilio)

---

#### 9. logistic-service (Port 3009)
**Owner:** Shipping and tracking
**Database:** logistics_db
**Key Entities:** Shipment, ShipmentTracking, CourierRate
**Events Published:**
- `shipment.created`
- `shipment.picked_up`
- `shipment.in_transit`
- `shipment.delivered`
- `shipment.failed`

**Consumes Events:**
- `order.confirmed` - Create shipment
- `inventory.picked` - Mark ready for pickup

**External Dependencies:**
- Biteship (courier aggregator)

---

#### 10. address-service (Port 3010)
**Owner:** Address management and validation
**Database:** address_db
**Key Entities:** Address, Province, City, District, PostalCode
**Events Published:**
- `address.created`
- `address.updated`

**Consumes Events:** None (reference data service)

**Features:**
- Indonesian address validation
- Postal code lookup
- Shipping zone calculation

---

#### 11. wallet-service (Port 3011)
**Owner:** User wallets and balance management
**Database:** wallet_db
**Key Entities:** Wallet, WalletTransaction, WithdrawalRequest
**Events Published:**
- `wallet.credited`
- `wallet.debited`
- `withdrawal.requested`
- `withdrawal.completed`

**Consumes Events:**
- `refund.completed` - Credit user wallet
- `settlement.completed` - Credit seller wallet

**Business Logic:**
- Buyer wallet: refunds, promotional credits
- Seller wallet: sales proceeds, payouts

---

#### 12. warehouse-service (Port 3012) ⚠️ NEEDS MIGRATION
**Owner:** Inventory and grosir bundle management
**Database:** warehouse_db
**Key Entities:**
- WarehouseInventory
- InventoryMovement
- StockReservation
- GrosirBundleConfig
- GrosirWarehouseTolerance
- WarehousePurchaseOrder
- PurchaseOrderItem
- StockAlert

**Events Published:**
- `inventory.reserved`
- `inventory.released`
- `inventory.low_stock`
- `inventory.variant_locked`
- `inventory.variant_unlocked`
- `purchase_order.created`
- `purchase_order.received`

**Consumes Events:**
- `order.cancelled` - Release reservations
- `payment.paid` - Confirm reservation
- `order.shipped` - Deduct from inventory

**Core Business Logic:**
- Grosir bundle constraint checking
- Variant locking when bundle would overflow
- Purchase order generation
- Stock reservation management

---

#### 13. advertisement-service (Port 3013)
**Owner:** Ad campaigns and billing
**Database:** advert_db
**Key Entities:** Campaign, AdPlacement, AdImpression, AdClick, AdBilling
**Events Published:**
- `campaign.created`
- `campaign.activated`
- `campaign.paused`
- `ad.clicked`

**Consumes Events:**
- `wallet.debited` - Confirm ad spend

**Ad Types:**
- Sponsored Search (CPC/CPM)
- Homepage Banner
- Category Featured
- Email Newsletter

---

#### 14. support-service (Port 3014)
**Owner:** Customer support tickets
**Database:** support_db
**Key Entities:** Ticket, TicketMessage, FAQ, AutoResponse
**Events Published:**
- `ticket.created`
- `ticket.assigned`
- `ticket.resolved`

**Consumes Events:**
- `order.return_requested` - Auto-create ticket

**Features:**
- AI-powered auto-responses
- Escalation rules
- SLA tracking

---

#### 15. seller-service (Port 3015)
**Owner:** Third-party seller management
**Database:** seller_db
**Key Entities:** Seller, SellerProduct, SellerOrder, SellerPayout
**Events Published:**
- `seller.registered`
- `seller.verified`
- `seller.product_listed`
- `seller.payout_scheduled`

**Consumes Events:**
- `order.created` - Notify seller of new order
- `payment.paid` - Track seller earnings
- `settlement.completed` - Record payout

**Features:**
- Seller dashboard data
- Product moderation queue
- Performance metrics

---

#### 16. review-service (Port 3016)
**Owner:** Product reviews and ratings
**Database:** review_db
**Key Entities:** Review, ReviewImage, ReviewVote, ReviewResponse
**Events Published:**
- `review.created`
- `review.approved`
- `review.flagged`

**Consumes Events:**
- `order.delivered` - Enable review submission

**Features:**
- Photo/video reviews
- Verified purchase badge
- Seller responses
- Review moderation

---

## Implementation Phases

### Phase 1: Foundation (Current)
**Goal:** Establish core patterns and fix existing services

| Task | Status | Priority |
|------|--------|----------|
| Migrate warehouse-service to standardization | 🔄 In Progress | Critical |
| Create shared TypeScript packages | ⏳ Pending | High |
| Document Go service standards | ⏳ Pending | Medium |

**Deliverables:**
- warehouse-service with local Prisma, auth, validation, outbox
- Shared packages: `@lakoo/shared-types`, `@lakoo/shared-utils`

### Phase 2: Core Services
**Goal:** Implement essential services for MVP

| Service | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| auth-service | Critical | 2 weeks | None |
| product-service | Critical | 2 weeks | auth-service |
| brand-service | High | 1 week | product-service |
| cart-service | High | 1 week | product-service, warehouse-service |

**Deliverables:**
- Users can register, login
- Products can be created, browsed
- Brands can curate products
- Shopping cart functionality

### Phase 3: Transaction Flow
**Goal:** Complete order-to-delivery flow

| Service | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| order-service (enhance) | Critical | 1 week | cart, payment, warehouse |
| logistic-service | High | 2 weeks | order-service |
| address-service | Medium | 1 week | None |
| wallet-service | Medium | 1 week | payment-service |

**Deliverables:**
- Complete checkout flow
- Order tracking
- Shipping integration
- Wallet for refunds/credits

### Phase 4: Marketplace
**Goal:** Enable third-party sellers

| Service | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| seller-service | High | 2 weeks | auth, product, order |
| advertisement-service | Medium | 2 weeks | seller-service |
| review-service | Low | 1 week | order-service |
| support-service | Low | 1 week | order-service |

**Deliverables:**
- Seller registration and dashboard
- Ad campaign management
- Product reviews
- Support tickets

### Phase 5: Supply Chain
**Goal:** Complete warehouse operations

| Service | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| supplier-service | Medium | 1 week | warehouse-service |
| Warehouse admin features | High | 1 week | warehouse-service |

**Deliverables:**
- Supplier management
- Purchase order workflow
- Receiving and QC
- Inventory adjustments

---

## Inter-Service Communication

### Synchronous (REST)

**When to Use:**
- User-facing requests requiring immediate response
- Data validation before proceeding
- Read operations for display

**Patterns:**
```typescript
// Internal API client
const response = await axios.get(
  `${PRODUCT_SERVICE_URL}/products/${productId}`,
  {
    headers: {
      'x-internal-api-key': process.env.INTERNAL_API_KEY,
      'x-user-id': userId
    }
  }
);
```

### Asynchronous (Kafka via Outbox)

**When to Use:**
- Cross-service state changes
- Notifications
- Analytics/reporting
- Eventual consistency is acceptable

**Pattern:**
```typescript
// Outbox pattern - write event with transaction
await prisma.$transaction([
  prisma.payment.update({ where: { id }, data: { status: 'paid' } }),
  prisma.serviceOutbox.create({
    data: {
      aggregateType: 'Payment',
      aggregateId: id,
      eventType: 'payment.paid',
      payload: { paymentId, orderId, amount }
    }
  })
]);

// Separate process polls outbox and publishes to Kafka
```

### Event Catalog

| Event | Producer | Consumers |
|-------|----------|-----------|
| `user.registered` | auth-service | notification-service |
| `product.created` | product-service | brand-service |
| `order.created` | order-service | payment-service, warehouse-service |
| `payment.paid` | payment-service | order-service, warehouse-service, notification-service |
| `payment.expired` | payment-service | order-service, warehouse-service |
| `inventory.reserved` | warehouse-service | order-service |
| `inventory.variant_locked` | warehouse-service | cart-service, product-service |
| `order.shipped` | order-service | notification-service, warehouse-service |
| `order.delivered` | order-service | notification-service, review-service |
| `refund.completed` | payment-service | wallet-service, notification-service |
| `settlement.completed` | payment-service | seller-service, wallet-service |

---

## Data Management Strategy

### Database per Service

Each service owns its database schema:
```
auth_db        → auth-service
product_db     → product-service
cart_db        → cart-service
order_db       → order-service
payment_db     → payment-service
warehouse_db   → warehouse-service
... etc
```

### Data Duplication

Services store snapshots of data they need:
```typescript
// order_items stores product snapshot at time of order
{
  productId: "uuid",          // Reference
  productName: "T-Shirt",     // Snapshot
  variantName: "Medium",      // Snapshot
  sku: "TSH-001-M",          // Snapshot
  unitPrice: 150000           // Snapshot (price at order time)
}
```

### Cross-Service Queries

**Pattern 1: API Composition (BFF)**
```
Frontend → API Gateway → order-service → [payment-service, warehouse-service]
```

**Pattern 2: Read Replicas (Materialized Views)**
For reporting/analytics, consider read-only replicas.

---

## Security Architecture

### Authentication Flow

```
1. User logs in via auth-service
2. auth-service validates credentials
3. auth-service issues JWT (stored in cookie/header)
4. Subsequent requests go to API Gateway
5. API Gateway validates JWT signature
6. API Gateway adds headers: x-user-id, x-user-role, x-gateway-key
7. Backend services trust these headers
```

### Service Authentication

```typescript
// Gateway Auth - for user requests
app.use('/api/inventory', gatewayAuth, inventoryRoutes);

// Internal Auth - for service-to-service
app.use('/internal', internalAuth, internalRoutes);

// Public - for webhooks (use signature verification)
app.use('/webhooks', webhookRoutes);
```

### Secrets Management

| Secret | Where Used | Storage |
|--------|------------|---------|
| JWT_SECRET | auth-service | Environment variable |
| GATEWAY_SECRET_KEY | All services | Environment variable |
| INTERNAL_API_KEY | All services | Environment variable |
| DATABASE_URL | Per service | Environment variable |
| XENDIT_SECRET | payment-service | Environment variable |
| BITESHIP_API_KEY | logistic-service | Environment variable |

---

## Deployment Strategy

### Container Structure

Each service has:
```
service-name/
├── Dockerfile
├── docker-compose.yml    # For local development
├── package.json
├── prisma/
│   └── schema.prisma
└── src/
```

### Database Migrations

```bash
# Per service migration
cd backend/services/warehouse-service
npx prisma migrate deploy
```

### Environment Configuration

```env
# warehouse-service/.env.example
PORT=3012
NODE_ENV=development

# Database
WAREHOUSE_DATABASE_URL="postgresql://..."

# Authentication
GATEWAY_SECRET_KEY=your-gateway-secret
INTERNAL_API_KEY=your-internal-api-key

# Inter-service URLs
ORDER_SERVICE_URL=http://order-service:3006
PAYMENT_SERVICE_URL=http://payment-service:3007
NOTIFICATION_SERVICE_URL=http://notification-service:3008

# External
LOGISTICS_SERVICE_URL=http://logistics-service:3009
WHATSAPP_SERVICE_URL=http://whatsapp-service:3012
```

### Health Checks

Every service exposes:
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'warehouse-service',
    version: process.env.npm_package_version,
    uptime: process.uptime()
  });
});
```

---

## Next Steps

### Immediate Actions

1. **Migrate warehouse-service** to follow standardization:
   - [x] Read current implementation
   - [ ] Create local Prisma client
   - [ ] Apply new schema from `warehouse-service-schema.prisma`
   - [ ] Add auth middleware
   - [ ] Add validation middleware
   - [ ] Add outbox service with warehouse events
   - [ ] Update routes with proper auth/validation

2. **Create shared packages** (optional, can be done later):
   - `@lakoo/shared-types` - Common TypeScript types
   - `@lakoo/shared-utils` - Common utilities

3. **Document Go standards** for order-service and notification-service

### Success Criteria

- [ ] warehouse-service runs without `@repo/database` dependency
- [ ] warehouse-service has gateway auth on all routes
- [ ] warehouse-service publishes events to outbox
- [ ] warehouse-service uses new schema with grosir models
- [ ] All tests pass
- [ ] Service starts successfully with `pnpm run dev`

---

## Appendix: Service Standardization Checklist

For each TypeScript service:

- [ ] `src/lib/prisma.ts` - Local Prisma client
- [ ] `src/middleware/auth.ts` - Gateway trust authentication
- [ ] `src/middleware/validation.ts` - express-validator + validateRequest
- [ ] `src/middleware/error-handler.ts` - Centralized error handling
- [ ] `src/services/outbox.service.ts` - Event publishing
- [ ] `src/utils/asyncHandler.ts` - Async error wrapper
- [ ] Routes use `gatewayOrInternalAuth` middleware
- [ ] Routes use `validateRequest` after validators
- [ ] Controllers use `asyncHandler` wrapper
- [ ] `.env.example` with all required variables
- [ ] `prisma/schema.prisma` with service-specific schema

---

*This document is a living guide. Update as architecture evolves.*
