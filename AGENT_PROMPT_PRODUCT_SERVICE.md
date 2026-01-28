# 🤖 AI Agent Prompt: Product-Service Migration

**Your Role:** Product Service Lead Developer  
**Service:** `product-service` (Port 3002)  
**Database:** `product_db` (Neon PostgreSQL)  
**Language:** TypeScript (Node.js)  
**Status:** Migrating from 1st gen to 3rd business model (Social Commerce)

---

## 🎯 Your Mission

You are responsible for migrating and enhancing the **product-service** to support LAKOO's 3rd business model: a **social commerce platform** (Xiaohongshu/Pinterest-style). The service already has a first-generation implementation that needs to be updated with new features for content moderation and draft approval workflows.

---

## 📚 Required Reading (IN ORDER)

Before you start, read these files to understand the context:

1. **`LAKOO_BUSINESS_MODEL.md`** - Understand the business model
   - Focus on "Draft Approval" section
   - Understand sellers vs house brands
   - Products can be tagged in posts by ANY user

2. **`MICROSERVICE_ARCHITECTURE_PLAN.md`** - Service architecture
   - Read section on product-service (Port 3002)
   - Understand inter-service communication patterns
   - Note the outbox event pattern

3. **`product-service-schema.prisma`** (root level) - Target schema
   - This is what the final schema should look like
   - Compare with current `backend/services/product-service/prisma/schema.prisma`

4. **`backend/services/claude.md`** - Standardization guide
   - ALL services must follow these patterns
   - Gateway auth, validation, outbox events

5. **`backend/services/payment-service/`** - Reference implementation
   - This is the gold standard for service structure
   - Copy patterns from here (auth, validation, outbox, error handling)

---

## 🔍 Current State Assessment

### Existing Implementation (1st Gen)
Location: `backend/services/product-service/`

**What exists:**
- ✅ Basic Product and ProductVariant models
- ✅ Category management
- ✅ Product CRUD operations
- ✅ Admin routes
- ✅ TypeScript implementation

**What's missing for 3rd model:**
- ❌ Draft approval workflow
- ❌ ProductDraft model
- ❌ ModerationQueue model
- ❌ Product status: `draft`, `pending_approval`, `approved`, `rejected`
- ❌ Moderation workflow endpoints
- ❌ Integration with seller-service
- ❌ Events for draft submission/approval/rejection

---

## 🎯 Your Tasks (Priority Order)

### Phase 1: Schema Updates (CRITICAL)

#### Task 1.1: Update Prisma Schema
**File:** `backend/services/product-service/prisma/schema.prisma`

**Add these models:**

```prisma
// PRODUCT DRAFT (for approval workflow)
model ProductDraft {
  id                String       @id @default(dbgenerated("gen_random_uuid()"))
  sellerId          String       @db.Uuid // Reference to Seller Service
  // Draft content (same fields as Product)
  categoryId        String       @db.Uuid
  name              String       @db.VarChar(255)
  description       String?
  baseSellPrice     Decimal      @db.Decimal(15, 2)
  images            Json[]       // Array of image URLs
  variants          Json[]       // Array of variant data
  // Submission
  status            DraftStatus  @default(pending)
  submittedAt       DateTime?    @db.Timestamptz(6)
  reviewedAt        DateTime?    @db.Timestamptz(6)
  reviewedBy        String?      @db.Uuid
  rejectionReason   String?      @db.VarChar(500)
  // If approved, this is the created product ID
  productId         String?      @unique @db.Uuid
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
}

enum DraftStatus {
  draft            // Seller is still editing
  pending          // Submitted for review
  approved         // Approved, product created
  rejected         // Rejected by moderator
  changes_requested // Moderator requested changes
}

// MODERATION QUEUE
model ModerationQueue {
  id              String           @id @default(dbgenerated("gen_random_uuid()"))
  draftId         String           @db.Uuid
  priority        ModerationPriority @default(normal)
  assignedTo      String?          @db.Uuid // Moderator ID
  assignedAt      DateTime?        @db.Timestamptz(6)
  completedAt     DateTime?        @db.Timestamptz(6)
  createdAt       DateTime         @default(now())
}

enum ModerationPriority {
  low
  normal
  high
  urgent
}
```

**Update Product model:**
```prisma
model Product {
  // Add these fields:
  sellerId        String?       @db.Uuid // Reference to Seller (null for house brands)
  draftId         String?       @db.Uuid // Link to original draft
  moderationNotes String?       // Internal notes from moderator
  
  // Update status enum to include:
  status          ProductStatus @default(draft)
}

enum ProductStatus {
  draft              // Not visible to anyone except creator
  pending_approval   // Submitted for moderation
  approved           // Live on platform
  rejected           // Rejected by moderator
  inactive           // Temporarily hidden
  out_of_stock       // No inventory available
}
```

#### Task 1.2: Run Migration
```bash
cd backend/services/product-service
npx prisma generate
npx prisma db push  # Or create migration
```

---

### Phase 2: Implement Draft Approval Workflow

#### Task 2.1: Create ProductDraft Repository
**File:** `src/repositories/product-draft.repository.ts`

Methods needed:
- `create()` - Create new draft
- `findById()` - Get draft by ID
- `findBySellerId()` - Get seller's drafts
- `findPending()` - Get drafts pending moderation
- `updateStatus()` - Update draft status
- `submitForReview()` - Submit draft for approval
- `approve()` - Approve draft and create product
- `reject()` - Reject draft with reason

**Pattern:** Copy from `payment-service/src/repositories/commission.repository.ts`

#### Task 2.2: Create ProductDraft Service
**File:** `src/services/product-draft.service.ts`

Key methods:
```typescript
class ProductDraftService {
  // Seller actions
  async createDraft(sellerId: string, data: CreateDraftDTO): Promise<ProductDraft>
  async updateDraft(draftId: string, data: UpdateDraftDTO): Promise<ProductDraft>
  async submitForReview(draftId: string, sellerId: string): Promise<ProductDraft>
  async getDraftsBySeller(sellerId: string): Promise<ProductDraft[]>
  
  // Moderator actions
  async getPendingDrafts(limit: number, offset: number): Promise<ProductDraft[]>
  async assignToModerator(draftId: string, moderatorId: string): Promise<ModerationQueue>
  async approveDraft(draftId: string, moderatorId: string): Promise<{ draft: ProductDraft, product: Product }>
  async rejectDraft(draftId: string, moderatorId: string, reason: string): Promise<ProductDraft>
  async requestChanges(draftId: string, moderatorId: string, feedback: string): Promise<ProductDraft>
}
```

**CRITICAL:** When draft is approved:
1. Create Product from draft data
2. Create ProductVariants from draft variants
3. Upload images to S3
4. Update draft status to `approved`
5. Link draft to created product
6. Publish `product.draft_submitted`, `product.approved` events

#### Task 2.3: Create Moderation Service
**File:** `src/services/moderation.service.ts`

Handle moderation queue:
- Add drafts to queue when submitted
- Assign to moderators
- Track moderation metrics
- Auto-escalate old pending drafts

#### Task 2.4: Add Outbox Events
**Update:** `src/services/outbox.service.ts`

Add events:
```typescript
export type ProductEventType =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.draft_submitted'   // 🆕
  | 'product.approved'           // 🆕
  | 'product.rejected'           // 🆕
  | 'product.changes_requested'; // 🆕
```

**Who listens:**
- `seller-service` - Update seller stats when product approved
- `notification-service` - Notify seller of approval/rejection
- `content-service` - Enable product tagging after approval

---

### Phase 3: Create API Endpoints

#### Task 3.1: Draft Routes (Seller)
**File:** `src/routes/draft.routes.ts`

```typescript
// Seller endpoints (require gateway auth)
POST   /api/drafts                    - Create draft
GET    /api/drafts/my-drafts          - Get my drafts
GET    /api/drafts/:id                - Get draft by ID
PUT    /api/drafts/:id                - Update draft
DELETE /api/drafts/:id                - Delete draft
POST   /api/drafts/:id/submit         - Submit for review
```

**Validation:**
- Name: required, 3-255 chars
- Description: required, 10-5000 chars
- Price: required, > 0
- Category: required, valid UUID
- Images: required, at least 3 images
- Variants: required, at least 1 variant

#### Task 3.2: Moderation Routes (Admin)
**File:** `src/routes/moderation.routes.ts`

```typescript
// Admin/moderator endpoints (require admin role)
GET    /api/moderation/pending         - Get pending drafts
GET    /api/moderation/queue            - Get moderation queue
POST   /api/moderation/:id/assign       - Assign to moderator
POST   /api/moderation/:id/approve      - Approve draft
POST   /api/moderation/:id/reject       - Reject draft
POST   /api/moderation/:id/request-changes - Request changes
GET    /api/moderation/stats            - Moderation statistics
```

#### Task 3.3: Update Product Routes
**Update:** `src/routes/product.routes.ts`

**Add:**
- Seller can only see their own products
- Filter by sellerId
- Filter by status (draft, approved, etc.)
- Prevent sellers from creating products directly (must go through draft)

---

### Phase 4: Integration Points

#### Task 4.1: Integration with Seller Service
When draft is approved:
```typescript
// Call seller-service to update seller stats
POST {SELLER_SERVICE_URL}/api/sellers/:sellerId/products/increment
```

#### Task 4.2: Integration with Content Service
Products must be `approved` before they can be tagged in posts:
```typescript
// content-service will call:
GET /api/products/:id/taggable  - Check if product can be tagged
// Returns: { id, name, sellerId, status: 'approved', imageUrl }
```

#### Task 4.3: Integration with Warehouse Service
Only LAKOO house brand products (sellerId = null) use warehouse:
```typescript
if (product.sellerId === null) {
  // This is house brand product
  // Call warehouse-service for inventory
} else {
  // Seller manages their own inventory
  // No warehouse integration needed
}
```

---

### Phase 5: Business Rules (CRITICAL)

#### Rule 1: House Brands vs Seller Products
```typescript
// HOUSE BRAND (sellerId = null)
- Created by admin directly (no draft approval)
- Managed in warehouse-service
- Can have grosir bundle constraints
- Example: LAKOO Basics, LAKOO Modest

// SELLER PRODUCT (sellerId = UUID)
- MUST go through draft approval
- Seller manages own inventory
- No warehouse integration
- Seller fulfills orders
```

#### Rule 2: Draft Approval Criteria
Reject if:
- Images appear stolen (reverse image search)
- Images are low quality (< 800x800px)
- Description is copied from elsewhere
- Price is suspiciously low (potential counterfeit)
- Prohibited items (weapons, adult content, etc.)
- Category mismatch

#### Rule 3: Who Can Tag Products
- ANY approved product can be tagged in posts
- User can tag products from ANY seller
- Product must be status = `approved`
- This is key for social commerce discovery

---

## 🔗 Service Communication

### You SEND events to:
- `seller-service` - Product approved (update seller product count)
- `notification-service` - Draft approved/rejected (notify seller)
- `content-service` - Product approved (enable tagging)

### You RECEIVE events from:
- `inventory.low_stock` - From warehouse-service (house brands only)
- `seller.suspended` - From seller-service (hide seller's products)

### You CALL (HTTP):
- `seller-service` - Get seller info, update stats
- `warehouse-service` - Check inventory (house brands only)
- `auth-service` - Get moderator info

---

## 📋 Checklist

Use this to track your progress:

### Schema
- [ ] Add ProductDraft model
- [ ] Add ModerationQueue model
- [ ] Add DraftStatus enum
- [ ] Update Product model with sellerId, draftId
- [ ] Update ProductStatus enum
- [ ] Run prisma generate
- [ ] Apply migration to Neon DB

### Repositories
- [ ] Create product-draft.repository.ts
- [ ] Create moderation-queue.repository.ts
- [ ] Update product.repository.ts (filter by sellerId, status)

### Services
- [ ] Create product-draft.service.ts
- [ ] Create moderation.service.ts
- [ ] Update product.service.ts (house brand vs seller logic)
- [ ] Update outbox.service.ts (add draft events)

### Controllers
- [ ] Create draft.controller.ts (seller endpoints)
- [ ] Create moderation.controller.ts (admin endpoints)
- [ ] Update product.controller.ts (add taggable endpoint)

### Routes
- [ ] Create draft.routes.ts with validation
- [ ] Create moderation.routes.ts with admin auth
- [ ] Update product.routes.ts (filter by seller, status)
- [ ] Update index.ts (register new routes)

### Middleware
- [ ] Verify gateway auth is configured
- [ ] Verify validation middleware is used
- [ ] Verify error handler is configured
- [ ] Add role checking for admin routes

### Integration
- [ ] Test calling seller-service
- [ ] Test publishing events to outbox
- [ ] Test image upload to S3
- [ ] Test draft approval creates product correctly

### Documentation
- [ ] Update DOCUMENTATION.md with draft workflow
- [ ] Document API endpoints in Swagger
- [ ] Add moderation guidelines document
- [ ] Document integration points

---

## 🚨 Common Pitfalls

1. **Don't allow sellers to create products directly**
   - All seller products MUST go through draft approval
   - Only admins can create house brand products directly

2. **Don't forget sellerId differentiation**
   - sellerId = null → House brand (warehouse inventory)
   - sellerId = UUID → Seller product (seller inventory)

3. **Don't skip validation**
   - All draft submissions must be validated
   - Images must be checked (quality, authenticity)
   - Prices must be reasonable

4. **Don't forget events**
   - Every status change should publish an event
   - Other services depend on these events

5. **Don't mix concerns**
   - Product service doesn't manage inventory (that's warehouse-service)
   - Product service doesn't manage seller data (that's seller-service)

---

## 🎯 Success Criteria

Your implementation is complete when:

1. ✅ Schema matches `product-service-schema.prisma`
2. ✅ Draft workflow works end-to-end (create → submit → approve → product created)
3. ✅ Moderators can approve/reject drafts
4. ✅ Seller receives notifications on approval/rejection
5. ✅ Approved products can be tagged in posts
6. ✅ House brands can be created directly by admin
7. ✅ All endpoints have proper auth and validation
8. ✅ Events are published for all status changes
9. ✅ No linter errors
10. ✅ Documentation is updated

---

## 🤝 Coordination

### With Payment-Service Agent (Me)
- I've completed commission tracking
- Products don't directly interact with payments
- Commission is calculated at order level, not product level

### With Warehouse-Service Agent
- They handle inventory for house brands (sellerId = null)
- You provide product info (dimensions, grosir bundle size)
- Coordinate on product availability checks

### With High-Level Agent
- Report when draft approval workflow is complete
- Ask for clarification on moderation criteria
- Escalate architectural decisions

---

## 📞 Need Help?

If you're stuck:
1. Check `payment-service` for reference patterns
2. Read `claude.md` for standardization rules
3. Review `MICROSERVICE_ARCHITECTURE_PLAN.md` for context
4. Ask the high-level agent for architectural decisions

---

**Remember:** You're building the foundation for sellers to list products on the platform. Quality control through draft approval is CRITICAL for platform trust!

Good luck! 🚀
