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

LAKOO is migrating from a partial microservices setup to a fully distributed architecture with **18 services**. The platform is a **social commerce platform** (Xiaohongshu/Pinterest-style) that supports:
- **Social Discovery Feed** - Pinterest-style visual content discovery with shoppable posts
- **Seller Ecosystem** - All sellers can create content, build followers, and sell products (0.5% commission)
- **Sponsored Posts** - Instagram-style ad boosting as primary revenue model
- **LAKOO House Brands** - Internal gap-filler brands (LAKOO Basics, LAKOO Modest) with centralized warehouse
- **Bazaar Acquisition** - Onboard local brands via Rp 1M sponsorship program
- **Event-Driven Architecture** - Kafka for async communication

### Platform Model: Social Commerce
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAKOO SOCIAL COMMERCE                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Discovery: Pinterest-style feed (not search-first)                     │
│  Content: Seller posts, user reviews, shoppable images                  │
│  Social: Likes, saves, comments, follows                                │
│  Revenue: 0.5% commission + Sponsored Posts                             │
│  Acquisition: Bazaar sponsorship (Rp 1M per brand)                      │
│  North Star: Traffic (MAU) first, then GMV                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript (Node.js) + Go | TS for rapid development, Go for performance-critical |
| API Style | REST + Events | REST for sync, Kafka for async |
| Database | PostgreSQL per service | Data isolation, independent scaling |
| Auth Model | Gateway Trust | API Gateway validates JWT, services trust headers |
| Event Pattern | Outbox → Kafka | Reliable event delivery with transactional outbox |
| Feed Algorithm | content-service + feed-service | Separate content storage from personalization |

---

## Current State Analysis

### Implemented Services (4/18)

| Service | Port | Language | Status | Compliance |
|---------|------|----------|--------|------------|
| payment-service | 3007 | TypeScript | ✅ Complete | ✅ Reference implementation |
| warehouse-service | 3012 | TypeScript | ⚠️ Partial | ❌ Uses @repo/database, no auth/outbox |
| order-service | 3006 | Go | 🔧 Structured | ⚠️ Needs auth, events |
| notification-service | 3008 | Go | 🔧 Early stage | ⚠️ Kafka consumer only |

### Not Yet Implemented (14/18)

| Service | Port | Database | Priority | Social Commerce Notes |
|---------|------|----------|----------|----------------------|
| auth-service | 3001 | auth_db | Critical | Add user profile fields |
| product-service | 3002 | product_db | Critical | Add draft approval workflow |
| cart-service | 3003 | cart_db | High | No change |
| supplier-service | 3004 | supplier_db | Medium | No change (house brands) |
| brand-service | 3005 | brand_db | Medium | House brands only (reduced scope) |
| logistic-service | 3009 | logistics_db | High | No change |
| address-service | 3010 | address_db | Medium | No change |
| wallet-service | 3011 | wallet_db | Medium | No change |
| advertisement-service | 3013 | advert_db | **Critical** | **Sponsored Posts (primary revenue)** |
| support-service | 3014 | support_db | Low | Add content moderation |
| seller-service | 3015 | seller_db | **Critical** | **All sellers get feed/content** |
| review-service | 3016 | review_db | Medium | Already fits social model |
| **content-service** | **3017** | **content_db** | **Critical** | **🆕 Posts, likes, saves, follows** |
| **feed-service** | **3018** | **feed_db** | **Critical** | **🆕 Discovery algorithm** |

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
         ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
         │                                               │                                               │
         ▼                                               ▼                                               ▼
┌─────────────────────────────┐  ┌─────────────────────────────────────────┐  ┌─────────────────────────────┐
│     CORE SERVICES           │  │    🆕 SOCIAL COMMERCE SERVICES          │  │    COMMERCE SERVICES        │
│                             │  │    (Pinterest/Xiaohongshu-style)        │  │                             │
│ • auth-service (3001)       │  │                                         │  │ • product-service (3002)    │
│ • brand-service (3005)      │  │ • content-service (3017) 🆕             │  │ • cart-service (3003)       │
│ • address-service (3010)    │  │   Posts, likes, saves, comments         │  │ • order-service (3006)      │
│                             │  │                                         │  │ • payment-service (3007)    │
│ (House brands only)         │  │ • feed-service (3018) 🆕                │  │ • wallet-service (3011)     │
│                             │  │   Discovery algorithm, personalization  │  │                             │
└─────────────────────────────┘  │                                         │  └─────────────────────────────┘
                                 │ • seller-service (3015)                 │
                                 │   All sellers can create content        │
                                 │                                         │
                                 │ • advertisement-service (3013)          │
                                 │   Sponsored Posts (primary revenue)     │
                                 │                                         │
                                 │ • review-service (3016)                 │
                                 │   Photo reviews = social content        │
                                 └─────────────────────────────────────────┘
         ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
         │                                               │                                               │
         ▼                                               ▼                                               ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐  ┌─────────────────────────────┐
│    SUPPLY CHAIN SERVICES    │  │    SUPPORT SERVICES         │  │    NOTIFICATION             │
│    (House brands only)      │  │                             │  │                             │
│                             │  │ • support-service (3014)    │  │ • notification-svc (3008)   │
│ • warehouse-service (3012)  │  │   + Content moderation      │  │   + Social notifications    │
│ • supplier-service (3004)   │  │                             │  │   (likes, follows, etc.)    │
│ • logistic-service (3009)   │  │                             │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘  └─────────────────────────────┘
                                                         │
                                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                     KAFKA                                               │
│                                                                                         │
│  Topics: payment.events, order.events, inventory.events, content.events,              │
│          social.events, notification.events, etc.                                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PostgreSQL Databases                                       │
│                                                                                         │
│  Each service owns its database: auth_db, product_db, content_db, feed_db, etc.       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Inventory

### Service Details

#### 1. auth-service (Port 3001)
**Owner:** User authentication and authorization
**Database:** auth_db
**Key Entities:** User, Session, Role, Permission, VerificationToken
**Social Commerce Status:** ⚠️ Minor changes needed

**Events Published:**
- `user.registered` - New user signup
- `user.verified` - Email/phone verified
- `user.login` - User logged in
- `user.password_reset` - Password changed

**Consumes Events:** None (origin service)

**External Dependencies:**
- SendGrid (email)
- Twilio (SMS OTP)

**Social Commerce Changes:**
- Add user profile fields: `bio`, `avatar_url`, `is_public_profile`
- Or keep auth minimal and delegate profile to content-service

---

#### 2. product-service (Port 3002)
**Owner:** Product catalog management
**Database:** product_db
**Key Entities:** Product, ProductVariant, Category, ProductImage, **ProductDraft**, **ModerationQueue**
**Social Commerce Status:** ⚠️ Changes needed

**Events Published:**
- `product.created`
- `product.updated`
- `product.deleted`
- `product.variant_added`
- `product.draft_submitted` 🆕
- `product.approved` 🆕
- `product.rejected` 🆕

**Consumes Events:**
- `inventory.low_stock` - Update product availability display

**External Dependencies:**
- AWS S3 (images)
- Elasticsearch (search)

**Social Commerce Changes:**
- **Draft approval workflow** - All products require approval before going live
- New entities: `ProductDraft`, `ModerationQueue`, `ModerationDecision`
- Products can be tagged in posts (referenced by content-service via product_id)

---

#### 3. cart-service (Port 3003)
**Owner:** Shopping cart management
**Database:** cart_db
**Key Entities:** Cart, CartItem, SavedForLater
**Social Commerce Status:** ✅ No change

**Events Published:**
- `cart.item_added`
- `cart.item_removed`
- `cart.cleared`

**Consumes Events:**
- `inventory.variant_locked` - Remove locked variants from cart
- `product.deleted` - Remove product from carts

**Inter-Service Calls:**
- GET `product-service/products/:id` - Validate product exists
- GET `warehouse-service/check-bundle-overflow` - Check variant availability (house brands only)

---

#### 4. supplier-service (Port 3004)
**Owner:** Factory/supplier management (for LAKOO house brands only)
**Database:** supplier_db
**Key Entities:** Supplier, SupplierContact, SupplierProduct, SupplierPerformance
**Social Commerce Status:** ✅ No change (house brands only)

**Events Published:**
- `supplier.created`
- `supplier.updated`
- `supplier.performance_updated`

**Consumes Events:**
- `purchase_order.received` - Update supplier metrics

**External Dependencies:**
- WhatsApp (Baileys) - Factory communication

**Notes:** This service only applies to LAKOO house brand supply chain. External sellers manage their own suppliers.

---

#### 5. brand-service (Port 3005)
**Owner:** LAKOO house brand management (gap-fillers only)
**Database:** brand_db
**Key Entities:** Brand, BrandProduct, BrandCollection, BrandPricing
**Social Commerce Status:** ✅ No change (reduced scope)

**Events Published:**
- `brand.product_assigned`
- `brand.price_updated`
- `brand.collection_created`

**Consumes Events:**
- `product.created` - Notify brand managers of new products

**Business Logic:**
- Same product can belong to multiple house brands with different prices
- Brand managers curate products from central warehouse catalog

**Social Commerce Notes:**
- Scope reduced from "15 Official Brands" to gap-filler house brands only
- Examples: LAKOO Basics, LAKOO Modest
- External sellers/community brands are managed in seller-service, not here

---

#### 6. order-service (Port 3006)
**Owner:** Order lifecycle management
**Database:** order_db
**Language:** Go
**Key Entities:** Order, OrderItem, OrderStatusHistory
**Social Commerce Status:** ✅ No change

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
- `inventory.reserved` - Update order with reservation (house brands)
- `logistics.shipped` - Update tracking info

**Inter-Service Calls:**
- POST `warehouse-service/reserve-inventory` - Reserve stock (house brands only)
- POST `payment-service/create` - Create payment
- POST `logistic-service/create-shipment` - Create shipment

---

#### 7. payment-service (Port 3007) ✅ REFERENCE IMPLEMENTATION
**Owner:** Payment processing and refunds
**Database:** payment_db
**Key Entities:** Payment, Refund, TransactionLedger, PaymentMethod, **CommissionLedger** 🆕, **SponsoredPostPayment** 🆕
**Social Commerce Status:** ⚠️ Changes needed

**Events Published:**
- `payment.created`
- `payment.paid`
- `payment.expired`
- `payment.failed`
- `refund.requested`
- `refund.completed`
- `settlement.completed`
- `sponsored_post.paid` 🆕

**Consumes Events:**
- `order.created` - Create payment record
- `order.cancelled` - Cancel pending payment
- `sponsored_post.created` 🆕 - Create payment for post boost

**External Dependencies:**
- Xendit (payment gateway)

**Jobs:**
- `expire-payments` - Expire unpaid invoices
- `weekly-settlement` - Process seller payouts (with 0.5% commission deduction)
- `reconciliation` - Verify transactions with Xendit

**Social Commerce Changes:**
- **0.5% Commission** - Deduct from seller payouts during settlement
- **Sponsored Post Payments** - Handle payments for boosted posts
- **Bazaar Sponsorship Payments** - One-time Rp 1M onboarding fee
- New entity: `CommissionLedger` to track commission deductions

---

#### 8. notification-service (Port 3008)
**Owner:** Multi-channel notifications
**Database:** notification_db
**Language:** Go (Kafka consumer)
**Key Entities:** Notification, NotificationTemplate, NotificationPreference
**Social Commerce Status:** ⚠️ Changes needed

**Events Published:**
- `notification.sent`
- `notification.failed`

**Consumes Events:**
- `payment.paid` - Send payment confirmation
- `order.shipped` - Send shipping notification
- `order.delivered` - Send delivery confirmation
- `user.registered` - Send welcome email
- `post.liked` 🆕 - "X liked your post"
- `post.commented` 🆕 - "X commented on your post"
- `post.saved` 🆕 - "X saved your post"
- `user.followed` 🆕 - "X started following you"

**Channels:**
- WhatsApp (Baileys)
- Email (SendGrid)
- Push (Firebase)
- SMS (Twilio)

**Social Commerce Changes:**
- New notification types for social interactions (likes, comments, follows, saves)
- Notification batching for high-volume social events (e.g., "15 people liked your post")
- In-app notification feed integration

---

#### 9. logistic-service (Port 3009)
**Owner:** Shipping and tracking
**Database:** logistics_db
**Key Entities:** Shipment, ShipmentTracking, CourierRate
**Social Commerce Status:** ✅ No change

**Events Published:**
- `shipment.created`
- `shipment.picked_up`
- `shipment.in_transit`
- `shipment.delivered`
- `shipment.failed`

**Consumes Events:**
- `order.confirmed` - Create shipment
- `inventory.picked` - Mark ready for pickup (house brands)

**External Dependencies:**
- Biteship (courier aggregator)

---

#### 10. address-service (Port 3010)
**Owner:** Address management and validation
**Database:** address_db
**Key Entities:** Address, Province, City, District, PostalCode
**Social Commerce Status:** ✅ No change

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
**Social Commerce Status:** ✅ No change

**Events Published:**
- `wallet.credited`
- `wallet.debited`
- `withdrawal.requested`
- `withdrawal.completed`

**Consumes Events:**
- `refund.completed` - Credit user wallet
- `settlement.completed` - Credit seller wallet (after 0.5% commission)

**Business Logic:**
- Buyer wallet: refunds, promotional credits
- Seller wallet: sales proceeds (minus commission), payouts

---

#### 12. warehouse-service (Port 3012) ⚠️ NEEDS MIGRATION
**Owner:** Inventory and grosir bundle management (for LAKOO house brands only)
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

**Social Commerce Status:** ✅ No change (house brands only)

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

**Notes:** This service only manages inventory for LAKOO house brands (LAKOO Basics, LAKOO Modest, etc.). External sellers manage their own inventory and fulfillment.

---

#### 13. advertisement-service (Port 3013)
**Owner:** Ad campaigns, sponsored posts, and billing
**Database:** advert_db
**Key Entities:** Campaign, AdPlacement, AdImpression, AdClick, AdBilling, **SponsoredPost** 🆕, **PostBoost** 🆕, **BoostMetrics** 🆕
**Social Commerce Status:** ⚠️ Major changes needed (Primary Revenue Source)

**Events Published:**
- `campaign.created`
- `campaign.activated`
- `campaign.paused`
- `ad.clicked`
- `sponsored_post.created` 🆕
- `sponsored_post.activated` 🆕
- `sponsored_post.completed` 🆕
- `sponsored_post.impression` 🆕

**Consumes Events:**
- `wallet.debited` - Confirm ad spend
- `sponsored_post.paid` 🆕 - Activate post boost

**Ad Types (Updated for Social Commerce):**
- **Sponsored Posts** 🆕 (PRIMARY) - Instagram-style boosted posts in feed
- **Sponsored Search** - CPC/CPM for search results
- ~~Homepage Banner~~ → Less relevant in feed-first model
- ~~Category Featured~~ → Less relevant in feed-first model
- ~~Email Newsletter~~ → Deprioritized

**Social Commerce Changes:**
- **Sponsored Posts is the primary ad format** - Sellers boost their posts to appear in more users' feeds
- Targeting options: demographics, location, interests, follower count
- Budget management: daily/lifetime budget, bid strategies
- Performance metrics: impressions, reach, engagement, clicks, conversions
- Integration with feed-service for ad injection into personalized feeds

**New Entities:**
```
SponsoredPost {
  id, postId, sellerId
  budget, spent, dailyBudget
  targetAudience (JSON)
  startDate, endDate
  status: draft/pending_payment/active/paused/completed
}

PostBoost {
  id, sponsoredPostId
  impressions, clicks, saves, follows
  costPerImpression, costPerClick
}
```

---

#### 14. support-service (Port 3014)
**Owner:** Customer support tickets and content moderation
**Database:** support_db
**Key Entities:** Ticket, TicketMessage, FAQ, AutoResponse, **ContentReport** 🆕, **ModerationCase** 🆕
**Social Commerce Status:** ⚠️ Minor changes needed

**Events Published:**
- `ticket.created`
- `ticket.assigned`
- `ticket.resolved`
- `content.reported` 🆕
- `content.moderation_decision` 🆕

**Consumes Events:**
- `order.return_requested` - Auto-create ticket
- `post.flagged` 🆕 - Create moderation case
- `review.flagged` 🆕 - Create moderation case

**Features:**
- AI-powered auto-responses
- Escalation rules
- SLA tracking

**Social Commerce Changes:**
- **Content moderation** - Handle flagged posts, reviews, and seller content
- Report queue for inappropriate content
- Moderation workflow: review → approve/reject/warn
- Seller account actions (warnings, suspensions)

---

#### 15. seller-service (Port 3015)
**Owner:** Seller management (all sellers can create content and build followers)
**Database:** seller_db
**Key Entities:** Seller, SellerProduct, SellerOrder, SellerPayout, **SellerProfile** 🆕, **AcquisitionSource** 🆕
**Social Commerce Status:** ⚠️ Changes needed (Critical for Social Commerce)

**Events Published:**
- `seller.registered`
- `seller.verified`
- `seller.product_listed`
- `seller.payout_scheduled`
- `seller.profile_updated` 🆕

**Consumes Events:**
- `order.created` - Notify seller of new order
- `payment.paid` - Track seller earnings (minus 0.5% commission)
- `settlement.completed` - Record payout
- `user.followed` 🆕 - Update follower count cache

**Features:**
- Seller dashboard data
- Product moderation queue
- Performance metrics

**Social Commerce Changes:**
- **All sellers can create content** - Every seller has a public storefront/feed
- **Seller profile** - Brand name, bio, avatar, Instagram handle (optional)
- **Follower tracking** - Cache follower count from content-service
- **Acquisition tracking** - Track how seller was acquired:
  - `organic` - Self-registered
  - `bazaar` - Acquired via bazaar sponsorship program (Rp 1M)
  - `referral` - Referred by another seller
- **Bazaar campaigns** - Track which bazaar event they came from

**New Fields:**
```
Seller {
  ...existing fields
  brandName: String?          // Display brand name
  bio: String?                // Seller description
  avatarUrl: String?
  instagramHandle: String?    // Optional, for branding
  followerCount: Int          // Cached from content-service
  acquisitionSource: enum     // organic, bazaar, referral
  bazaarCampaignId: String?   // If acquired via bazaar
}

// 🆕 Store Page Builder (Taobao-style customization)
SellerStorePage {
  id: UUID
  sellerId: UUID @unique
  layout: JSON                // Block-based layout configuration
  isPublished: Boolean
  publishedAt: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
}

// Layout JSON structure example:
{
  "blocks": [
    { "type": "hero_banner", "imageUrl": "...", "text": "..." },
    { "type": "carousel", "images": [...] },
    { "type": "product_grid", "productIds": [...], "columns": 3 },
    { "type": "text", "content": "..." }
  ]
}
```

**Store Page Builder API:**
```
GET    /sellers/:id/store-page     - Get store page layout
PUT    /sellers/:id/store-page     - Update store page layout
POST   /sellers/:id/store-page/publish - Publish store page
```

---

#### 16. review-service (Port 3016)
**Owner:** Product reviews and ratings
**Database:** review_db
**Key Entities:** Review, ReviewImage, ReviewVote, ReviewResponse
**Social Commerce Status:** ✅ Already fits social model

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

**Social Commerce Notes:**
- **Reviews are SEPARATE from Posts** (following Xiaohongshu model)
  - Posts = general content, anyone can create anytime
  - Reviews = tied to orders, only after purchase, verified badge
- Photo reviews CAN appear in feed but are distinct from regular posts
- Verified purchase badge builds trust in social discovery
- Review moderation integrates with support-service

---

#### 17. content-service (Port 3017) 🆕 NEW SERVICE
**Owner:** Social content, posts, and interactions
**Database:** content_db
**Social Commerce Status:** 🆕 Critical new service for social commerce

**Key Entities:**
```
Post {
  id, sellerId, userId (author)
  content: String              // Caption/description
  mediaUrls: String[]          // Images/videos
  productTags: ProductTag[]    // Tagged products
  status: draft/published/archived
  likeCount, saveCount, commentCount  // Cached counts
  createdAt, updatedAt
}

ProductTag {
  id, postId, productId
  positionX, positionY         // Tag position on image
}

Like {
  id, postId, userId
  createdAt
}

Save {
  id, postId, userId
  collectionId?                // Optional: save to collection
  createdAt
}

Collection {
  id, userId
  name: String                 // "Wishlist", "Summer Outfits"
  isPublic: Boolean
  savedPosts: Save[]
}

Comment {
  id, postId, userId
  parentId?                    // For replies
  content: String
  createdAt
}

Follow {
  id, followerId, followingId  // User follows seller/user
  createdAt
}
```

**Events Published:**
- `post.created`
- `post.published`
- `post.deleted`
- `post.liked`
- `post.unliked`
- `post.saved`
- `post.unsaved`
- `post.commented`
- `user.followed`
- `user.unfollowed`
- `post.flagged`

**Consumes Events:**
- `seller.registered` - Create default seller profile/feed
- `product.deleted` - Remove product tags from posts
- `content.moderation_decision` - Hide/show flagged content

**Inter-Service Calls:**
- GET `product-service/products/:id` - Validate product for tagging
- GET `seller-service/sellers/:id` - Get seller info for display

**Features:**
- Shoppable posts with product tags
- **Users can tag ANY product** (not just their own - key social commerce feature)
- Like, save, comment functionality
- Follow/unfollow users and sellers
- Collections (Pinterest boards)
- Content flagging for moderation
- Media upload to S3

**Note on Fitting Room (Mix & Match):**
- For MVP, Fitting Room is frontend-only (no backend storage)
- Future phase: Add `Look` and `LookItem` models for saving outfit combinations
- Future phase: Users can share looks as posts

**API Endpoints:**
```
POST   /posts                  - Create post
GET    /posts/:id              - Get post with engagement
DELETE /posts/:id              - Delete post
POST   /posts/:id/like         - Like post
DELETE /posts/:id/like         - Unlike post
POST   /posts/:id/save         - Save post
DELETE /posts/:id/save         - Unsave post
POST   /posts/:id/comments     - Add comment
GET    /posts/:id/comments     - Get comments
POST   /users/:id/follow       - Follow user/seller
DELETE /users/:id/follow       - Unfollow
GET    /users/:id/followers    - Get followers
GET    /users/:id/following    - Get following
GET    /users/:id/collections  - Get user's collections
```

---

#### 18. feed-service (Port 3018) 🆕 NEW SERVICE
**Owner:** Discovery algorithm and personalized feeds
**Database:** feed_db (primarily cache/materialized views)
**Social Commerce Status:** 🆕 Critical new service for social commerce

**Key Entities:**
```
FeedItem {
  id, userId
  postId, score
  reason: String               // "following", "recommended", "sponsored"
  createdAt, expiresAt
}

UserInterest {
  id, userId
  categoryId, score            // Interest in category
  sellerId, score              // Interest in seller
  updatedAt
}

TrendingPost {
  id, postId
  score, timeWindow
  calculatedAt
}
```

**Events Published:**
- `feed.generated`
- `feed.item_clicked`
- `feed.item_skipped`

**Consumes Events:**
- `post.created` - Add to relevant feeds
- `post.liked` - Boost post score
- `post.saved` - Boost post score
- `post.commented` - Boost post score
- `user.followed` - Update feed sources
- `sponsored_post.activated` - Inject into feeds
- `order.created` - Update user interests

**Inter-Service Calls:**
- GET `content-service/posts` - Fetch post data
- GET `advertisement-service/sponsored-posts` - Get sponsored posts for injection

**Features:**
- **Personalized feed algorithm** - Based on:
  - Following (posts from followed sellers/users)
  - Interests (categories, products viewed/purchased)
  - Engagement signals (likes, saves, time spent)
  - Recency and freshness
  - Social proof (trending, high engagement)
- **Sponsored post injection** - Insert boosted posts at intervals
- **Explore/Discover page** - Trending and recommended content
- **Search with social signals** - Boost results by engagement

**Algorithm Components:**
```
Feed Score =
  (recency_score * 0.3) +
  (engagement_score * 0.25) +
  (relevance_score * 0.25) +
  (following_boost * 0.2)

Sponsored posts injected at positions: 3, 8, 15, 25, ...
```

**API Endpoints:**
```
GET    /feed                   - Get personalized feed (paginated)
GET    /feed/explore           - Get explore/discover feed
GET    /feed/following         - Get following-only feed
GET    /trending               - Get trending posts
GET    /search?q=              - Search with social ranking
POST   /feed/refresh           - Force feed refresh
```

**Caching Strategy:**
- Pre-compute feeds for active users
- Cache trending posts (refresh every 15 min)
- Cache user interests (update on engagement)
- Redis for real-time feed assembly

---

## Implementation Phases

> **Note:** Phases restructured for social commerce pivot. Social features are now critical path.

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

### Phase 2: Core Services + Social Foundation 🆕
**Goal:** Implement essential services AND social commerce foundation

| Service | Priority | Dependencies |
|---------|----------|--------------|
| auth-service | Critical | None |
| product-service (with draft approval) | Critical | auth-service |
| **seller-service** | **Critical** | auth-service |
| **content-service** 🆕 | **Critical** | auth-service, seller-service |
| cart-service | High | product-service |

**Deliverables:**
- Users can register, login
- Sellers can register and create profiles
- **Sellers can create posts with product tags** 🆕
- **Users can like, save, comment, follow** 🆕
- Products require draft approval before listing
- Shopping cart functionality

### Phase 3: Discovery + Transaction Flow 🆕
**Goal:** Personalized feed and complete checkout

| Service | Priority | Dependencies |
|---------|----------|--------------|
| **feed-service** 🆕 | **Critical** | content-service |
| order-service (enhance) | Critical | cart, payment |
| logistic-service | High | order-service |
| address-service | Medium | None |
| wallet-service | Medium | payment-service |

**Deliverables:**
- **Personalized discovery feed (Pinterest-style)** 🆕
- **Explore/trending page** 🆕
- Complete checkout flow
- Order tracking
- Shipping integration
- Wallet for refunds/credits

### Phase 4: Monetization 🆕
**Goal:** Enable revenue through sponsored posts and commissions

| Service | Priority | Dependencies |
|---------|----------|--------------|
| **advertisement-service (Sponsored Posts)** | **Critical** | content-service, feed-service |
| payment-service (commission logic) | High | Already exists |
| review-service | Medium | order-service |

**Deliverables:**
- **Sellers can boost posts (Sponsored Posts)** 🆕
- **Feed injects sponsored content** 🆕
- **0.5% commission on settlements** 🆕
- Photo reviews (social content)

### Phase 5: Support + House Brands
**Goal:** Content moderation and LAKOO house brand operations

| Service | Priority | Dependencies |
|---------|----------|--------------|
| support-service (+ content moderation) | High | content-service |
| brand-service | Medium | product-service |
| supplier-service | Low | warehouse-service |

**Deliverables:**
- Support tickets
- **Content moderation workflow** 🆕
- House brand management (LAKOO Basics, LAKOO Modest)
- Supplier management for house brands

### Phase 6: Growth Features
**Goal:** Acquisition and retention

| Feature | Priority | Dependencies |
|---------|----------|--------------|
| Bazaar sponsorship tracking | Medium | seller-service |
| Collections (Pinterest boards) | Medium | content-service |
| Notification batching for social | Low | notification-service |
| Search with social ranking | Low | feed-service |

**Deliverables:**
- Track sellers acquired via bazaar program
- Users can organize saves into collections
- Smart notification grouping ("15 people liked your post")
- Search results boosted by engagement

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

#### Commerce Events (Existing)

| Event | Producer | Consumers |
|-------|----------|-----------|
| `user.registered` | auth-service | notification-service, content-service |
| `product.created` | product-service | brand-service, content-service |
| `product.approved` | product-service | seller-service, notification-service |
| `product.deleted` | product-service | content-service, cart-service |
| `order.created` | order-service | payment-service, warehouse-service, seller-service, feed-service |
| `payment.paid` | payment-service | order-service, warehouse-service, notification-service, seller-service |
| `payment.expired` | payment-service | order-service, warehouse-service |
| `inventory.reserved` | warehouse-service | order-service |
| `inventory.variant_locked` | warehouse-service | cart-service, product-service |
| `order.shipped` | order-service | notification-service, warehouse-service |
| `order.delivered` | order-service | notification-service, review-service |
| `refund.completed` | payment-service | wallet-service, notification-service |
| `settlement.completed` | payment-service | seller-service, wallet-service |

#### Social Events (New) 🆕

| Event | Producer | Consumers |
|-------|----------|-----------|
| `post.created` | content-service | feed-service |
| `post.published` | content-service | feed-service, notification-service |
| `post.deleted` | content-service | feed-service |
| `post.liked` | content-service | feed-service, notification-service |
| `post.saved` | content-service | feed-service, notification-service |
| `post.commented` | content-service | feed-service, notification-service |
| `post.flagged` | content-service | support-service |
| `user.followed` | content-service | notification-service, seller-service, feed-service |
| `user.unfollowed` | content-service | feed-service |
| `review.created` | review-service | feed-service (reviews as content) |
| `review.flagged` | review-service | support-service |

#### Advertising Events (New) 🆕

| Event | Producer | Consumers |
|-------|----------|-----------|
| `sponsored_post.created` | advertisement-service | payment-service |
| `sponsored_post.paid` | payment-service | advertisement-service |
| `sponsored_post.activated` | advertisement-service | feed-service |
| `sponsored_post.completed` | advertisement-service | seller-service, notification-service |

#### Moderation Events (New) 🆕

| Event | Producer | Consumers |
|-------|----------|-----------|
| `content.reported` | support-service | content-service |
| `content.moderation_decision` | support-service | content-service, notification-service |

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
