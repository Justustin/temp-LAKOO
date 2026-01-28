# 🚨 Future Me Problems - Critical Reminders for Service Implementation

**Date Created:** 2026-01-27
**Purpose:** Document critical architectural decisions, gotchas, and must-remember items for implementing remaining services
**Status:** Living document - update as you discover new issues

---

## 🎯 Architecture Decisions Made

### Decision 1: Centralized Product Catalog (CRITICAL!)

**Decision:** Product-service owns ALL product listings (house brands AND seller products)

**Why:**
- House brands deprioritized (only 5% of products)
- Social commerce = sellers are primary
- Simpler for tagging in posts (one source of truth)
- Agent 2 already implemented this

**Implementation:**
```typescript
// In product-service Product table:
sellerId: null     → House brand (uses warehouse-service for inventory)
sellerId: UUID     → Seller product (uses seller-service for inventory)
```

**What This Means for You:**

#### When Building seller-service:
1. **DO NOT** use the `SellerProduct` table from `seller-service-schema.prisma`
2. **DO** use `SellerInventory` table to track stock for seller products
3. **DO** reference products via `productId` from product-service
4. **DO NOT** duplicate product data (name, images, description) in seller-service

#### Correct Data Flow:
```
Seller creates product:
1. POST /api/drafts (product-service) - Create draft with sellerId
2. Moderator approves draft → Product created in product-service
3. Seller manages inventory → SellerInventory in seller-service
4. Order placed → Query product-service for info, seller-service for stock

House brand created:
1. POST /api/admin/products (product-service) - Create with sellerId=null
2. Admin manages inventory → WarehouseInventory in warehouse-service
3. Order placed → Query product-service for info, warehouse-service for stock
```

#### Schema Changes Needed in seller-service:
```prisma
// In seller-service-schema.prisma
// REMOVE or IGNORE:
model SellerProduct { ... }  // ❌ Don't use this!

// KEEP and USE:
model SellerInventory {
  id                String    @id
  sellerId          String    @db.Uuid
  productId         String    @db.Uuid  // ← Reference to product-service
  variantId         String?   @db.Uuid  // ← Reference to product-service
  quantity          Int
  reservedQuantity  Int
  availableQuantity Int
  // ... rest of fields
}
```

---

## 📦 Service Implementation Checklist

Use this checklist when creating ANY new service:

### Phase 1: Setup & Boilerplate (DO FIRST!)

- [ ] **Copy standardization patterns from payment-service**
  - Reference: `backend/services/payment-service/`
  - This is the gold standard for ALL services

- [ ] **Local Prisma Setup** (CRITICAL!)
  ```bash
  # In prisma/schema.prisma:
  generator client {
    provider = "prisma-client-js"
    output   = "../src/generated/prisma"  # ← Local, not @repo/database
  }

  # Create src/lib/prisma.ts:
  # Copy from: backend/services/payment-service/src/lib/prisma.ts
  ```

- [ ] **Gateway Authentication** (SECURITY!)
  ```bash
  # Copy these files:
  src/middleware/auth.ts         # from payment-service
  src/utils/serviceAuth.ts       # from payment-service

  # Add to .env:
  GATEWAY_SECRET_KEY=<secret>
  SERVICE_SECRET=<secret>
  ```

- [ ] **Validation Middleware**
  ```bash
  # Copy: src/middleware/validation.ts from payment-service
  # Use express-validator on ALL input endpoints
  ```

- [ ] **Error Handling**
  ```bash
  # Copy: src/middleware/error-handler.ts from payment-service
  # Centralized error handling with AppError classes
  ```

- [ ] **Outbox Pattern** (EVENTS!)
  ```bash
  # Copy: src/services/outbox.service.ts from payment-service
  # Publish events for ALL state changes
  # Use transactions: domain update + outbox write together
  ```

### Phase 2: Business Logic

- [ ] **Repository Layer**
  - Data access only, no business logic
  - Use Prisma transactions for consistency
  - Optimistic locking for concurrency (version field)

- [ ] **Service Layer**
  - All business logic here
  - Publish events via outbox service
  - Call other services via HTTP clients

- [ ] **Controller Layer**
  - Thin controllers, delegate to services
  - Use asyncHandler wrapper
  - Return consistent response format

- [ ] **Route Layer**
  - Apply auth middleware to ALL routes
  - Apply validation before controller
  - Document endpoints

### Phase 3: Integration

- [ ] **Service Clients**
  ```typescript
  // Create clients for services you call:
  src/clients/product.client.ts
  src/clients/seller.client.ts
  src/clients/notification.client.ts

  // Use service auth headers:
  import { getServiceAuthHeaders } from '../utils/serviceAuth';
  ```

- [ ] **Event Publishing**
  ```typescript
  // Document what events you publish:
  // - When they're published
  // - What the payload looks like
  // - Who consumes them
  ```

- [ ] **Event Consumption** (TODO for Phase 2)
  ```typescript
  // Currently NOT implemented in any service
  // Need Kafka consumer setup
  // For now: only publish events
  ```

### Phase 4: Documentation

- [ ] **DOCUMENTATION.md**
  - Service purpose
  - API endpoints
  - Business rules
  - Integration points
  - Setup instructions

- [ ] **Environment Variables**
  - Create .env.example
  - Document all required vars
  - Include example values

---

## 🔗 Critical Integration Points

### Product-Service Integrations

**Who calls product-service:**
- content-service → Check if product can be tagged (approved status)
- cart-service → Get product details, pricing, variants
- order-service → Get product info for order items
- seller-service → Get product details for seller dashboard

**What product-service calls:**
- seller-service → Increment/decrement product count (when draft approved/deleted)
- notification-service → Notify seller of draft approval/rejection
- warehouse-service → Check inventory, create inventory (house brands only)

**Events product-service publishes:**
```typescript
'product.draft_submitted'   → seller-service (update seller stats)
'product.approved'          → seller-service (increment product count)
                            → notification-service (notify seller)
                            → content-service (enable tagging)
'product.rejected'          → notification-service (notify seller)
'product.changes_requested' → notification-service (notify seller)
'product.created'           → brand-service (for house brands)
'product.updated'           → content-service (update tagged products)
'product.deleted'           → seller-service (decrement count)
```

### Seller-Service Integrations (TO BE BUILT)

**Who calls seller-service:**
- product-service → Increment/decrement product count
- order-service → Get seller info, update order stats
- payout-service → Calculate payouts, get bank details
- content-service → Get seller profile for posts

**What seller-service calls:**
- product-service → Get product details
- notification-service → Notify seller of orders, messages
- auth-service → Verify user identity

**Events seller-service should publish:**
```typescript
'seller.created'           → notification-service (welcome email)
'seller.verified'          → notification-service (verification success)
'seller.suspended'         → product-service (hide seller products)
'seller.activated'         → product-service (show seller products)
'inventory.low_stock'      → notification-service (alert seller)
'inventory.out_of_stock'   → product-service (mark unavailable)
```

### Warehouse-Service Integrations

**Who calls warehouse-service:**
- product-service → Check inventory, create inventory (house brands only)
- order-service → Reserve, release, confirm inventory
- cart-service → Check availability, check grosir overflow

**What warehouse-service calls:**
- product-service → Get product info, grosir config
- notification-service → Low stock alerts

**Events warehouse-service publishes:**
```typescript
'inventory.reserved'       → order-service (confirm reservation)
'inventory.released'       → order-service (reservation cancelled)
'inventory.confirmed'      → order-service (shipment confirmed)
'inventory.low_stock'      → product-service (update display)
'variant.locked'           → cart-service (remove from carts)
                           → product-service (mark unavailable)
'variant.unlocked'         → product-service (mark available)
'purchase_order.created'   → notification-service (notify admin)
'purchase_order.received'  → product-service (update stock status)
```

**Events warehouse-service should consume:**
```typescript
'payment.paid'    → Confirm reservation (change from reserved to confirmed)
'order.cancelled' → Release reservation (return stock to available)
'order.shipped'   → Deduct from inventory (final stock reduction)
```

---

## ⚠️ Common Pitfalls & Gotchas

### 1. DO NOT Use @repo/database

**Problem:** Shared Prisma client causes version conflicts and deployment issues

**Solution:**
```typescript
// ❌ NEVER do this:
import { prisma } from '@repo/database';

// ✅ ALWAYS do this:
import { prisma } from '../lib/prisma';
```

### 2. DO NOT Skip Authentication

**Problem:** Anyone can call your endpoints and manipulate data

**Solution:**
```typescript
// Apply auth to ALL routes:
router.use(gatewayOrInternalAuth);

// Admin-only routes:
router.use('/admin', requireRole('admin'));
```

### 3. DO NOT Skip Validation

**Problem:** Bad data breaks business logic and causes hard-to-debug issues

**Solution:**
```typescript
// ALWAYS validate input:
router.post('/endpoint',
  [
    body('field').notEmpty().isUUID(),
    body('quantity').isInt({ min: 1 })
  ],
  validateRequest,  // ← This middleware stops bad requests
  controller
);
```

### 4. DO NOT Forget Transactions

**Problem:** Partial updates leave database in inconsistent state

**Solution:**
```typescript
// ALWAYS use transactions for related updates:
await prisma.$transaction(async (tx) => {
  // 1. Update domain entity
  await tx.product.update({...});

  // 2. Write to outbox
  await tx.serviceOutbox.create({...});

  // Both succeed or both fail
});
```

### 5. DO NOT Mix House Brands and Seller Products

**Problem:** Confusion about which service manages inventory

**Solution:**
```typescript
// ALWAYS check sellerId before inventory operations:
const product = await getProduct(productId);

if (product.sellerId === null) {
  // House brand → Use warehouse-service
  inventory = await warehouseService.getInventory(productId);
} else {
  // Seller product → Use seller-service
  inventory = await sellerService.getInventory(product.sellerId, productId);
}
```

### 6. DO NOT Create Circular Dependencies

**Problem:** Service A calls Service B which calls Service A = deadlock

**Solution:**
```
✅ GOOD:
content-service → product-service → seller-service
         ↓              ↓
   notification-service ← ← ←

❌ BAD:
product-service ↔ seller-service (circular!)
```

### 7. DO NOT Hardcode Service URLs

**Problem:** Can't change endpoints without code changes

**Solution:**
```typescript
// Use environment variables:
const SELLER_SERVICE_URL = process.env.SELLER_SERVICE_URL || 'http://localhost:3015';
```

### 8. DO NOT Skip Error Handling for External Calls

**Problem:** If external service is down, your service crashes

**Solution:**
```typescript
// ALWAYS wrap external calls:
try {
  const response = await axios.get(SELLER_SERVICE_URL + '/api/sellers/' + sellerId, {
    headers: getServiceAuthHeaders(),
    timeout: 5000  // ← Prevent hanging
  });
  return response.data;
} catch (error) {
  console.error('Seller service unavailable:', error.message);
  // Return safe default or throw domain error
  return null;
}
```

---

## 📋 Seller-Service Specific Reminders

### What Seller-Service SHOULD Do:

✅ **Seller Profile Management**
- Seller registration and verification
- Seller documents (KTP, NPWP, bank details)
- Seller status (pending, active, suspended)
- Store page builder (Taobao-style layout blocks)

✅ **Seller Inventory Management**
- Track inventory for seller products (SellerInventory table)
- Reserve stock for orders
- Low stock alerts
- Inventory adjustments

✅ **Seller Payouts**
- Calculate payouts based on completed orders
- Commission tracking (0.5% for social commerce)
- Payout schedules (weekly, monthly)
- Bank transfer management

✅ **Seller Analytics**
- Daily stats (views, orders, revenue)
- Performance metrics (response rate, rating)
- Dashboard data aggregation

### What Seller-Service SHOULD NOT Do:

❌ **Product Catalog Management**
- Product creation (that's product-service!)
- Product descriptions, images (that's product-service!)
- Draft approval (that's product-service!)

❌ **Order Management**
- Order creation (that's order-service!)
- Payment processing (that's payment-service!)
- Shipping calculation (that's logistic-service!)

❌ **Content Management**
- Posts, likes, follows (that's content-service!)
- Feed algorithm (that's feed-service!)

### Seller-Service API Endpoints:

```typescript
// Seller Profile
POST   /api/sellers                    - Register as seller
GET    /api/sellers/:id                - Get seller profile
PUT    /api/sellers/:id                - Update profile
POST   /api/sellers/:id/documents      - Upload verification docs
PUT    /api/sellers/:id/status         - Admin: Update status

// Store Page Builder
GET    /api/sellers/:id/store          - Get store page config
PUT    /api/sellers/:id/store          - Update store layout
POST   /api/sellers/:id/store/publish  - Publish draft changes

// Inventory (for seller products only)
GET    /api/sellers/:id/inventory                    - Get all inventory
GET    /api/sellers/:id/inventory/product/:productId - Get specific product inventory
POST   /api/sellers/:id/inventory/adjust             - Adjust stock
POST   /api/sellers/:id/inventory/reserve            - Reserve stock for order
POST   /api/sellers/:id/inventory/release            - Release reservation

// Payouts
GET    /api/sellers/:id/payouts        - Get payout history
POST   /api/sellers/:id/payouts/create - Create payout request
GET    /api/sellers/:id/payouts/pending - Get pending payouts

// Analytics
GET    /api/sellers/:id/stats          - Get seller statistics
GET    /api/sellers/:id/stats/daily    - Get daily breakdown
```

### Seller-Service Database Schema:

**Tables to KEEP and USE:**
- ✅ Seller (seller profiles)
- ✅ SellerDocument (verification docs)
- ✅ SellerStorePage (store builder)
- ✅ SellerInventory (inventory tracking)
- ✅ SellerPayout (payout management)
- ✅ SellerPayoutItem (payout line items)
- ✅ SellerPayoutSchedule (payout frequency)
- ✅ SellerDailyStat (analytics)
- ✅ ServiceOutbox (events)

**Tables to IGNORE:**
- ❌ SellerProduct (use product-service instead!)
- ❌ SellerProductVariant (use product-service instead!)

---

## 🔄 Event Consumer Implementation (Phase 2)

**Status:** NOT YET IMPLEMENTED in any service

**What's Missing:**
- Kafka consumer setup
- Event handler registration
- Consumer group management
- Dead letter queue handling

**When to Implement:**
1. Set up Kafka infrastructure
2. Create consumer service/daemon
3. Subscribe to relevant topics
4. Handle events asynchronously

**Example: Warehouse-Service Event Consumer**
```typescript
// TODO: Implement this in Phase 2
// src/consumers/payment.consumer.ts

import { KafkaConsumer } from '../lib/kafka';
import { warehouseService } from '../services/warehouse.service';

export class PaymentConsumer {
  async handlePaymentPaid(event: PaymentPaidEvent) {
    // Extract reservation ID from order metadata
    const reservationId = event.payload.metadata.reservationId;

    if (reservationId) {
      // Confirm the reservation (reserved → confirmed)
      await warehouseService.confirmReservation(reservationId);
    }
  }

  async start() {
    const consumer = new KafkaConsumer('warehouse-service', 'payment-group');
    await consumer.subscribe('payment.paid', this.handlePaymentPaid);
  }
}
```

---

## 🎯 Content-Service Specific Reminders (TO BE BUILT)

### Product Tagging Architecture

**Decision:** Content-service only tags products from product-service (centralized)

```typescript
// In content-service Post model:
model Post {
  id        String @id
  userId    String @db.Uuid
  caption   String?
  images    Json[]  // Array of image URLs
  // Tagged products (from product-service)
  taggedProducts Json[]  // [{productId, x, y, variantId}]
  // ...
}

// When creating post with tags:
POST /api/posts
{
  "caption": "Love this dress!",
  "images": ["url1", "url2"],
  "taggedProducts": [
    {
      "productId": "uuid",
      "variantId": "uuid",  // Optional: specific color/size
      "imageIndex": 0,      // Which image has the tag
      "x": 0.5,             // X position (0-1)
      "y": 0.3              // Y position (0-1)
    }
  ]
}

// Validation flow:
1. content-service receives tagged products
2. For each productId:
   - Call product-service: GET /api/products/:id/taggable
   - Check if product.status === 'approved'
   - Check if product is active
3. If all valid, create post
4. If any invalid, reject with error
```

### Content-Service Product Validation Endpoint (in product-service):

```typescript
// In product-service
// src/routes/product.routes.ts

router.get('/:id/taggable',
  gatewayOrInternalAuth,
  productController.checkTaggable
);

// src/controllers/product.controller.ts
async checkTaggable(req, res) {
  const product = await productService.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Only approved products can be tagged
  const isTaggable = product.status === 'approved' &&
                     product.deletedAt === null;

  res.json({
    success: true,
    data: {
      id: product.id,
      name: product.name,
      sellerId: product.sellerId,
      status: product.status,
      isTaggable,
      primaryImageUrl: product.primaryImageUrl
    }
  });
}
```

---

## 🏗️ Order-Service Specific Reminders (TO BE BUILT)

### Inventory Reservation Flow

**Critical:** Order-service must coordinate with TWO different inventory services based on product type

```typescript
// In order-service
// src/services/order.service.ts

async createOrder(items: OrderItem[]) {
  // 1. Get product details from product-service
  const products = await productService.getProducts(items.map(i => i.productId));

  // 2. Group items by inventory service
  const houseItems = [];
  const sellerItems = {};  // Group by sellerId

  for (const item of items) {
    const product = products.find(p => p.id === item.productId);

    if (product.sellerId === null) {
      // House brand → warehouse-service
      houseItems.push(item);
    } else {
      // Seller product → seller-service
      if (!sellerItems[product.sellerId]) {
        sellerItems[product.sellerId] = [];
      }
      sellerItems[product.sellerId].push(item);
    }
  }

  // 3. Reserve inventory from appropriate services
  const reservations = [];

  // House brands → warehouse-service
  if (houseItems.length > 0) {
    const warehouseReservation = await warehouseService.reserveInventory({
      orderId,
      items: houseItems
    });
    reservations.push(warehouseReservation);
  }

  // Seller products → seller-service (per seller)
  for (const [sellerId, sellerItems] of Object.entries(sellerItems)) {
    const sellerReservation = await sellerService.reserveInventory(sellerId, {
      orderId,
      items: sellerItems
    });
    reservations.push(sellerReservation);
  }

  // 4. Create order with reservation IDs
  const order = await prisma.order.create({
    data: {
      userId,
      items,
      reservations,
      status: 'pending_payment'
    }
  });

  return order;
}
```

### Order Cancellation Flow

```typescript
// When order is cancelled, release ALL reservations
async cancelOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });

  // Release reservations from all services
  for (const reservation of order.reservations) {
    if (reservation.service === 'warehouse') {
      await warehouseService.releaseReservation(reservation.id);
    } else if (reservation.service === 'seller') {
      await sellerService.releaseReservation(reservation.sellerId, reservation.id);
    }
  }

  // Update order status
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'cancelled' }
  });

  // Publish event
  await outboxService.orderCancelled(order);
}
```

---

## 🎨 Feed-Service Specific Reminders (TO BE BUILT)

### Feed Algorithm Considerations

**Challenge:** Mix house brand products and seller products in discovery feed

```typescript
// Discovery Feed Logic:
// 1. User follows → show posts from followed users/sellers
// 2. Trending → show popular posts (high engagement)
// 3. Personalized → show posts with tagged products matching user interests
// 4. Sponsored → show paid promotions from sellers

// Feed scoring factors:
// - Engagement (likes, comments, shares)
// - Recency (newer = higher score)
// - Relevance (user interests, past purchases)
// - Diversity (mix of sellers, not all from one seller)
// - Product availability (don't show out-of-stock)

// Query optimization:
// - Cache popular posts
// - Precompute feed for active users
// - Batch product availability checks
```

### Product Availability in Feed

```typescript
// Before showing post in feed:
// 1. Check if tagged products are still available
// 2. Don't show posts with all unavailable products
// 3. Mark unavailable products in post (gray out)

async filterAvailablePosts(posts: Post[]) {
  const postIds = [];

  for (const post of posts) {
    // Get all tagged products
    const productIds = post.taggedProducts.map(t => t.productId);

    // Batch check availability
    const products = await productService.checkAvailability(productIds);

    // Count available products
    const availableCount = products.filter(p => p.isAvailable).length;

    // Only show if at least one product is available
    if (availableCount > 0) {
      postIds.push(post.id);
    }
  }

  return postIds;
}
```

---

## 🔐 Auth-Service Specific Reminders (TO BE BUILT)

### User Roles & Permissions

```typescript
// User roles:
enum UserRole {
  customer   // Regular user (can buy, post, follow)
  seller     // Seller account (can sell, has store)
  moderator  // Can approve product drafts
  admin      // Full access
  support    // Customer support access
}

// One user can have multiple roles:
// Example: User is both customer AND seller
// - userId = uuid (in auth-service)
// - Can make purchases (as customer)
// - Can sell products (as seller, has sellerId in seller-service)

// JWT Token payload:
{
  "userId": "uuid",
  "roles": ["customer", "seller"],
  "sellerId": "uuid",  // If user is a seller
  "email": "user@example.com"
}
```

### Seller Account Creation Flow

```typescript
// 1. User registers → auth-service creates user account
// 2. User applies to be seller → seller-service creates seller profile
// 3. Seller verified → auth-service adds 'seller' role to user
// 4. Token refresh → include sellerId in JWT

// When user logs in:
// - If has 'seller' role → include sellerId
// - Gateway forwards sellerId in x-user-seller-id header
// - Services check sellerId for seller-specific operations
```

---

## 📊 Database Connection Strings

**Location:** `DB_Connection.txt` at project root

**Format:**
```
SERVICE-NAME PORT
psql 'postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/database_name?sslmode=require'
```

**Usage in .env:**
```env
# Extract connection string and set as DATABASE_URL
DATABASE_URL=postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/your_db?sslmode=require
```

---

## 🧪 Testing Strategy

### Integration Testing Priorities

**Critical Flows to Test:**

1. **Draft Approval Flow**
   ```
   Seller creates draft → Moderator approves → Product created → Seller notified
   ```

2. **Order with Mixed Products**
   ```
   Cart has house brand + seller product → Reserve from both services → Payment → Confirm → Ship
   ```

3. **Grosir Bundle Constraints**
   ```
   Add items to cart → Check overflow → Lock variant if would exceed → Prevent purchase
   ```

4. **Product Tagging**
   ```
   Create post → Tag approved product → Post visible → Product click → Navigate to product
   ```

5. **Seller Payout**
   ```
   Orders completed → Calculate payout → Approve → Transfer to bank → Mark paid
   ```

### Testing Tools

```bash
# API Testing
curl http://localhost:3002/api/drafts/...

# Database Inspection
psql 'postgresql://...'

# Service Health
curl http://localhost:3002/health
curl http://localhost:3012/health
curl http://localhost:3015/health
```

---

## 🚀 Deployment Sequence

**Recommended order when deploying new services:**

1. **Dependencies First:**
   - auth-service (everyone depends on this)
   - notification-service (everyone publishes events to this)

2. **Core Services:**
   - product-service (already done ✅)
   - seller-service (inventory management)
   - warehouse-service (already done ✅)

3. **Transaction Services:**
   - cart-service
   - order-service
   - payment-service (already done ✅)

4. **Social Services:**
   - content-service (posts)
   - feed-service (discovery)

5. **Supporting Services:**
   - advertisement-service
   - review-service (already done ✅)
   - support-service

---

## 🆘 Troubleshooting Guide

### Issue: "Cannot find module '../generated/prisma'"

**Solution:**
```bash
cd backend/services/your-service
npx prisma generate
# Make sure generator output is "../src/generated/prisma"
```

### Issue: "x-gateway-key is invalid"

**Solution:**
```env
# Set in .env:
GATEWAY_SECRET_KEY=your-secret-here

# Or in development, middleware allows bypass if not set
NODE_ENV=development
```

### Issue: "Service client timeout"

**Solution:**
```typescript
// Increase timeout or add retry logic:
const response = await axios.get(url, {
  timeout: 10000,  // 10 seconds
  retry: 3
});
```

### Issue: "Transaction deadlock"

**Solution:**
```typescript
// Use consistent ordering in transactions:
// ALWAYS lock tables in same order:
// 1. Product
// 2. Inventory
// 3. Outbox

await prisma.$transaction(async (tx) => {
  // Lock in this order
}, {
  timeout: 10000,
  maxWait: 5000
});
```

### Issue: "Outbox events not publishing"

**Solution:**
```typescript
// Check:
// 1. Is outbox write in same transaction?
// 2. Is ServiceOutbox table created?
// 3. Is Kafka consumer reading outbox?

// Debug:
SELECT * FROM service_outbox WHERE is_published = false;
```

---

## 📝 Update Log

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-27 | High-Level Orchestrator | Initial creation after product/warehouse migration |

---

## 🎯 Next Steps

**Immediate (This Week):**
- [ ] Implement seller-service using this guide
- [ ] Create seller inventory management endpoints
- [ ] Test draft approval → product creation → seller inventory

**Short Term (Next 2 Weeks):**
- [ ] Implement auth-service with role management
- [ ] Implement content-service with product tagging
- [ ] Test full flow: seller creates product → approved → user tags in post

**Medium Term (Month 1):**
- [ ] Implement event consumers (Kafka)
- [ ] Set up monitoring and alerts
- [ ] Load testing for critical flows
- [ ] Update this document with new learnings

---

**Remember:** Read `backend/services/claude.md` for standardization rules. Copy patterns from `payment-service`. When in doubt, ask!

---

**End of Future Me Problems**
