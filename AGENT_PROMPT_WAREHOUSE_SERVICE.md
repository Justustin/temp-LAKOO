# 🤖 AI Agent Prompt: Warehouse-Service Migration & Standardization

**Your Role:** Warehouse Service Lead Developer  
**Service:** `warehouse-service` (Port 3012)  
**Database:** `warehouse_db` (Neon PostgreSQL)  
**Language:** TypeScript (Node.js)  
**Status:** Partial implementation - needs migration and standardization

---

## 🎯 Your Mission

You are responsible for **migrating and standardizing** the `warehouse-service` to align with LAKOO's standardization patterns. The service currently uses outdated patterns (`@repo/database`) and is missing critical features (auth, validation, outbox events). Your job is to bring it up to the same quality as `payment-service`.

**IMPORTANT:** This service ONLY manages inventory for **LAKOO House Brands** (gap-filler products). Seller products are managed by sellers themselves - warehouse doesn't touch them.

---

## 📚 Required Reading (IN ORDER)

Before you start, read these files to understand the context:

1. **`LAKOO_BUSINESS_MODEL.md`** - Business model
   - Focus on "LAKOO House Brands (Filler)" section
   - Understand house brands only fill gaps in catalog
   - Warehouse ONLY serves house brands, NOT seller products

2. **`MICROSERVICE_ARCHITECTURE_PLAN.md`** - Service architecture
   - Read warehouse-service section (Port 3012)
   - Critical Issues to Address (section 93-99)
   - Understand grosir bundle constraint system

3. **`warehouse-service-schema.prisma`** (root level) - Target schema
   - This is what the final schema should look like
   - Note the grosir bundle models

4. **`backend/services/claude.md`** - Standardization guide (CRITICAL)
   - ALL services must follow these patterns
   - Gateway auth, validation, outbox events, local Prisma

5. **`backend/services/payment-service/`** - Reference implementation
   - This is the gold standard you must match
   - Copy all patterns from here

6. **`backend/services/warehouse-service/DOCUMENTATION.md`** - Current docs
   - Understand what exists
   - Note what's missing

---

## 🔍 Current State Assessment

### Existing Implementation
Location: `backend/services/warehouse-service/`

**What works:**
- ✅ Grosir bundle constraint logic (core business logic)
- ✅ Inventory reservation system
- ✅ Purchase order management
- ✅ Basic CRUD operations
- ✅ TypeScript implementation

**What's broken/missing:**
- ❌ **Uses `@repo/database`** instead of local Prisma
- ❌ **No gateway auth middleware** (anyone can call endpoints!)
- ❌ **No validation middleware** (bad data can break things)
- ❌ **No outbox events** (other services don't know about inventory changes)
- ❌ **Schema differs from target** (missing fields, wrong types)
- ❌ **No service-to-service auth** (internal calls not secured)

**Critical Risk:** This service controls inventory and money (purchase orders). It MUST be secured before production!

---

## 🎯 Your Tasks (Priority Order)

### ⚠️ PHASE 1: CRITICAL FIXES (DO THIS FIRST!)

#### Task 1.1: Migrate from @repo/database to Local Prisma

**The Problem:**
```typescript
// CURRENT (BROKEN):
import { prisma } from '@repo/database';  // ❌ This causes errors

// SHOULD BE:
import { prisma } from '../lib/prisma';   // ✅ Local Prisma client
```

**Steps:**
1. **Create local Prisma client**
   ```bash
   # File: src/lib/prisma.ts
   # Copy from: backend/services/payment-service/src/lib/prisma.ts
   ```

2. **Find all @repo/database imports**
   ```bash
   grep -r "@repo/database" src/
   ```

3. **Replace every import**
   ```typescript
   // Find ALL files with:
   import { prisma } from '@repo/database';
   
   // Replace with:
   import { prisma } from '../lib/prisma';  // Adjust path as needed
   
   // Also check for:
   import type { SomeType } from '@repo/database';
   
   // Replace with:
   import type { SomeType } from '../generated/prisma';
   ```

4. **Update schema**
   ```bash
   # File: prisma/schema.prisma
   # Update generator output:
   generator client {
     provider = "prisma-client-js"
     output   = "../src/generated/prisma"  # ✅ Local output
   }
   ```

5. **Regenerate Prisma client**
   ```bash
   cd backend/services/warehouse-service
   npx prisma generate
   ```

6. **Test everything still works**
   ```bash
   npm run dev
   # Hit some endpoints, make sure no errors
   ```

#### Task 1.2: Add Gateway Authentication

**The Problem:** Anyone can call your endpoints and manipulate inventory!

**Steps:**
1. **Copy auth middleware**
   ```bash
   # Copy from: backend/services/payment-service/src/middleware/auth.ts
   # To: backend/services/warehouse-service/src/middleware/auth.ts
   ```

2. **Copy serviceAuth utility**
   ```bash
   # Copy from: backend/services/payment-service/src/utils/serviceAuth.ts
   # To: backend/services/warehouse-service/src/utils/serviceAuth.ts
   ```

3. **Update all routes to use auth**
   ```typescript
   // File: src/routes/inventory.routes.ts (example)
   
   import { gatewayOrInternalAuth, requireRole } from '../middleware/auth';
   
   const router = Router();
   
   // Apply auth to ALL routes
   router.use(gatewayOrInternalAuth);
   
   // Admin-only routes
   router.use('/admin', requireRole('admin'));
   
   // Continue with route definitions...
   ```

4. **Add environment variables**
   ```env
   # File: .env
   GATEWAY_SECRET_KEY=your-gateway-secret
   SERVICE_SECRET=your-service-secret
   ```

#### Task 1.3: Add Validation Middleware

**The Problem:** No validation means bad data can break inventory!

**Steps:**
1. **Copy validation middleware**
   ```bash
   # Copy from: backend/services/payment-service/src/middleware/validation.ts
   # To: backend/services/warehouse-service/src/middleware/validation.ts
   ```

2. **Add validation to all routes**
   ```typescript
   // Example: src/routes/inventory.routes.ts
   
   import { body, param } from 'express-validator';
   import { validateRequest } from '../middleware/validation';
   
   // POST /api/inventory/reserve
   router.post(
     '/reserve',
     [
       body('orderId').isUUID().withMessage('orderId must be UUID'),
       body('items').isArray().notEmpty(),
       body('items.*.variantId').isUUID(),
       body('items.*.quantity').isInt({ min: 1 }),
     ],
     validateRequest,  // ✅ This stops bad data!
     inventoryController.reserve
   );
   ```

3. **Add validation to EVERY endpoint** that accepts input

#### Task 1.4: Add Outbox Events

**The Problem:** Other services don't know when inventory changes!

**Steps:**
1. **Copy outbox service**
   ```bash
   # Copy from: backend/services/payment-service/src/services/outbox.service.ts
   # To: backend/services/warehouse-service/src/services/outbox.service.ts
   ```

2. **Update outbox for warehouse events**
   ```typescript
   // File: src/services/outbox.service.ts
   
   export type InventoryEventType =
     | 'inventory.reserved'
     | 'inventory.released'
     | 'inventory.low_stock'
     | 'inventory.variant_locked'
     | 'inventory.variant_unlocked'
     | 'purchase_order.created'
     | 'purchase_order.received';
   
   // Add methods for each event type
   async inventoryReserved(reservation: {...}): Promise<void> {
     await this.publish('Inventory', reservation.id, 'inventory.reserved', {
       reservationId: reservation.id,
       orderId: reservation.orderId,
       items: reservation.items,
       expiresAt: reservation.expiresAt
     });
   }
   ```

3. **Publish events in service methods**
   ```typescript
   // File: src/services/inventory.service.ts
   
   import { outboxService } from './outbox.service';
   
   async reserveInventory(data: ReserveDTO) {
     const reservation = await this.repository.createReservation(data);
     
     // ✅ Publish event
     await outboxService.inventoryReserved(reservation);
     
     return reservation;
   }
   ```

4. **Use transactions for consistency**
   ```typescript
   // When updating inventory + outbox, use transaction
   await prisma.$transaction(async (tx) => {
     const reservation = await tx.stockReservation.create({...});
     await tx.serviceOutbox.create({
       aggregateType: 'Inventory',
       aggregateId: reservation.id,
       eventType: 'inventory.reserved',
       payload: {...}
     });
   });
   ```

---

### PHASE 2: Schema Updates

#### Task 2.1: Compare Schemas

**Compare:**
- Current: `backend/services/warehouse-service/prisma/schema.prisma`
- Target: `warehouse-service-schema.prisma` (root)

**Look for:**
- Missing fields
- Wrong field types
- Missing indexes
- Missing relations

#### Task 2.2: Update Schema to Match Target

Key models needed:
```prisma
// Core models
- WarehouseInventory (variant stock levels)
- StockReservation (for pending orders)
- InventoryMovement (audit trail)

// Grosir bundle system
- GrosirBundleConfig (factory bundle definitions)
- GrosirWarehouseTolerance (max excess per variant)

// Purchase orders
- WarehousePurchaseOrder
- PurchaseOrderItem

// Monitoring
- StockAlert (low stock warnings)
```

#### Task 2.3: Apply Migration
```bash
cd backend/services/warehouse-service
npx prisma generate
# Set DATABASE_URL env var to Neon connection
$env:DATABASE_URL='postgresql://...'
npx prisma db push  # Or create migration
```

---

### PHASE 3: Business Logic Implementation

#### Task 3.1: Grosir Bundle Constraint System

**This is your CORE value proposition!**

The system prevents ordering variants that would cause excess inventory beyond tolerance.

**Key logic:**
1. Factory ships fixed bundles (e.g., 12 units: 2S + 5M + 4L + 1XL)
2. Calculate total demand across ALL orders + carts
3. Determine minimum bundles needed to fulfill demand
4. Check if any variant would exceed tolerance
5. If yes, LOCK those variants from purchase

**Files to implement:**
- `src/services/grosir.service.ts` - Bundle constraint checking
- `src/services/tolerance.service.ts` - Tolerance management
- `src/services/variant-lock.service.ts` - Variant locking logic

**Reference:** See LAKOO_BUSINESS_MODEL.md "Grosir Bundle System" section

#### Task 3.2: Inventory Reservation

**Flow:**
1. Order service calls `/api/inventory/reserve`
2. Check stock available
3. Check grosir constraints (would this order lock variants?)
4. If OK: Create reservation (expires in 15 minutes)
5. Publish `inventory.reserved` event
6. Order service confirms payment
7. Payment service publishes `payment.paid` event
8. You consume event and confirm reservation

**Key insight:** Reservations expire! Clean up expired reservations with cron job.

#### Task 3.3: Purchase Order Management

**Flow:**
1. Low stock alert triggers
2. Create purchase order for supplier
3. Send WhatsApp message to factory
4. Track PO status
5. When received, update inventory
6. Publish `purchase_order.received` event

---

### PHASE 4: API Endpoints

#### Update these endpoints with auth + validation:

**Inventory Management:**
```typescript
POST   /api/inventory/reserve           - Reserve stock for order
POST   /api/inventory/release           - Release reservation
POST   /api/inventory/confirm           - Confirm reservation (after payment)
GET    /api/inventory/check/:variantId  - Check stock available
POST   /api/inventory/movement          - Record stock movement
```

**Grosir Constraints:**
```typescript
GET    /api/grosir/check-overflow       - Check if order would cause overflow
POST   /api/grosir/configure            - Configure bundle for product
GET    /api/grosir/locked-variants      - Get currently locked variants
```

**Purchase Orders:**
```typescript
POST   /api/purchase-orders              - Create PO
GET    /api/purchase-orders/:id          - Get PO
PUT    /api/purchase-orders/:id/receive  - Mark PO as received
GET    /api/purchase-orders/pending      - Get pending POs
```

**Admin:**
```typescript
GET    /api/admin/inventory/all          - Get all inventory
POST   /api/admin/inventory/adjust       - Manual stock adjustment
GET    /api/admin/alerts                 - Get low stock alerts
PUT    /api/admin/tolerance/:variantId   - Update tolerance
```

---

### PHASE 5: Integration Points

#### You SEND events to:
```typescript
'inventory.reserved'       → order-service (confirm reservation)
'inventory.released'       → order-service (reservation cancelled)
'inventory.low_stock'      → product-service (update display)
'inventory.variant_locked' → cart-service (remove from carts)
'inventory.variant_locked' → product-service (mark unavailable)
```

#### You RECEIVE events from:
```typescript
'order.cancelled'   → Release reservation
'payment.paid'      → Confirm reservation
'order.shipped'     → Deduct from inventory
```

#### You CALL (HTTP):
```typescript
product-service    → Get product info (dimensions, grosir config)
notification-service → Send low stock alerts
supplier-service   → Get supplier info for POs
```

---

## 📋 Detailed Checklist

### Critical Fixes (DO FIRST!)
- [ ] Create `src/lib/prisma.ts` (local Prisma client)
- [ ] Find and replace ALL `@repo/database` imports
- [ ] Run `npx prisma generate` successfully
- [ ] Add `src/middleware/auth.ts`
- [ ] Add `src/utils/serviceAuth.ts`
- [ ] Apply auth to ALL routes
- [ ] Add `src/middleware/validation.ts`
- [ ] Add validation to ALL input endpoints
- [ ] Add `src/services/outbox.service.ts`
- [ ] Publish events in ALL service methods

### Schema Migration
- [ ] Compare current schema with target
- [ ] Update schema to match `warehouse-service-schema.prisma`
- [ ] Add missing models (GrosirWarehouseTolerance, etc.)
- [ ] Add missing fields to existing models
- [ ] Add proper indexes
- [ ] Run migration on Neon DB
- [ ] Verify no data loss

### Error Handling
- [ ] Add `src/middleware/error-handler.ts`
- [ ] Add `src/utils/asyncHandler.ts`
- [ ] Wrap all controllers with `asyncHandler`
- [ ] Use centralized error handler
- [ ] Add proper error logging

### Environment Variables
- [ ] Add `GATEWAY_SECRET_KEY`
- [ ] Add `SERVICE_SECRET`
- [ ] Add `DATABASE_URL` (Neon connection)
- [ ] Add service URLs (PRODUCT_SERVICE_URL, etc.)
- [ ] Update `.env.example`

### Testing
- [ ] Test auth works (reject without valid headers)
- [ ] Test validation works (reject bad input)
- [ ] Test grosir constraints work correctly
- [ ] Test reservation flow end-to-end
- [ ] Test variant locking/unlocking
- [ ] Test purchase order creation

### Documentation
- [ ] Update DOCUMENTATION.md with new patterns
- [ ] Document all environment variables
- [ ] Document grosir constraint algorithm
- [ ] Add sequence diagrams for reservation flow
- [ ] Update API documentation

---

## 🚨 Critical Business Rules

### Rule 1: House Brands Only
```typescript
// This service ONLY manages LAKOO house brand products
// Seller products are managed by sellers themselves!

// Check before processing:
const product = await getProduct(productId);
if (product.sellerId !== null) {
  throw new Error('Warehouse only manages house brand inventory');
}
```

### Rule 2: Grosir Bundle Constraints
```typescript
// NEVER allow orders that would exceed tolerance
// This is the CORE value of warehouse-service

// Example:
// Bundle: 12 units (2S + 5M + 4L + 1XL)
// Tolerance: S=20, M=50, L=40, XL=30
// Current demand: M=48 (needs 10 bundles)
// Result: S=20 (2*10), M=50 (5*10), L=40 (4*10), XL=10 (1*10)
// All within tolerance ✅

// If demand M=51 (needs 11 bundles):
// Result: S=22 EXCEEDS tolerance (max 20) ❌
// Action: LOCK Medium size until Small catches up
```

### Rule 3: Reservation Expiry
```typescript
// Reservations expire after 15 minutes
// Clean up with cron job every 5 minutes

// When payment is confirmed, reservation becomes permanent
// When order is cancelled, release reservation immediately
```

### Rule 4: Low Stock Alerts
```typescript
// Alert when stock < reorder point
// Auto-create purchase order if enabled
// Notify via WhatsApp + email

// Don't spam! Only alert once until stock is replenished
```

---

## 🔍 Files to Review/Update

### Must Create (copy from payment-service):
- `src/lib/prisma.ts`
- `src/middleware/auth.ts`
- `src/middleware/validation.ts`
- `src/middleware/error-handler.ts`
- `src/utils/asyncHandler.ts`
- `src/utils/serviceAuth.ts`
- `src/services/outbox.service.ts`

### Must Update:
- `src/routes/*.routes.ts` - Add auth + validation
- `src/services/*.service.ts` - Add outbox events
- `src/repositories/*.repository.ts` - Use local prisma
- `src/index.ts` - Add error handler, health check
- `prisma/schema.prisma` - Match target schema

### Can Leave (already good):
- Grosir business logic (if it works, don't touch)
- Repository patterns (if using Prisma correctly)
- Database design (if schema matches)

---

## 🎯 Success Criteria

Your migration is complete when:

1. ✅ No `@repo/database` imports anywhere
2. ✅ All routes have gateway auth OR internal auth
3. ✅ All input endpoints have validation
4. ✅ All state changes publish outbox events
5. ✅ Schema matches `warehouse-service-schema.prisma`
6. ✅ Service starts without errors
7. ✅ All tests pass (create if missing)
8. ✅ No linter errors
9. ✅ DOCUMENTATION.md is updated
10. ✅ Can reserve inventory → confirm → deduct successfully

---

## 🤝 Coordination

### With Payment-Service Agent (Me)
- I've completed payment-service with commission tracking
- You need to consume `payment.paid` events to confirm reservations
- Coordinate on event payload format

### With Product-Service Agent
- They manage product catalog
- You manage inventory for house brands only
- Coordinate on grosir bundle configuration
- You provide stock availability for product display

### With High-Level Agent
- Report when migration is complete
- Ask for architectural decisions
- Escalate if grosir business logic is unclear

---

## 🆘 Common Issues & Solutions

### Issue 1: "Cannot find module '../generated/prisma'"
**Solution:**
```bash
cd backend/services/warehouse-service
npx prisma generate
# Make sure output path in schema.prisma is correct
```

### Issue 2: "x-gateway-key is invalid"
**Solution:**
```env
# Make sure GATEWAY_SECRET_KEY is set in .env
# Make sure middleware is checking the correct header
# In dev, middleware allows bypass if GATEWAY_SECRET_KEY is not set
```

### Issue 3: "Validation errors not showing"
**Solution:**
```typescript
// Make sure validateRequest is AFTER validators
router.post('/reserve',
  validators,      // ✅ First
  validateRequest, // ✅ Second
  controller       // ✅ Third
);
```

### Issue 4: "Events not publishing"
**Solution:**
```typescript
// Make sure outbox is in transaction with domain changes
await prisma.$transaction(async (tx) => {
  await tx.reservation.create({...});
  await tx.serviceOutbox.create({...});
});
```

---

## 📞 Need Help?

If you're stuck:
1. **Check payment-service** - It's your reference for everything
2. **Read claude.md** - All standardization rules are there
3. **Review DOCUMENTATION.md** - Understand current implementation
4. **Ask high-level agent** - For architectural questions
5. **Check warehouse-service-schema.prisma** - For schema questions

---

**Remember:** This service controls inventory and money (purchase orders). Security and correctness are PARAMOUNT! Don't skip any of the critical fixes!

Good luck! 🚀
