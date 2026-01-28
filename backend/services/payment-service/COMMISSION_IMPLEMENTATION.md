# Commission Ledger Implementation - Payment Service

**Date:** January 27, 2026  
**Business Model:** Social Commerce (3rd iteration)  
**Commission Rate:** 0.5%

## Summary

Successfully implemented the `CommissionLedger` functionality in the payment-service to track and manage the 0.5% commission on seller transactions for LAKOO's social commerce platform.

---

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)

#### Added `CommissionLedger` Model
```prisma
model CommissionLedger {
  id                String            @id @default(dbgenerated("gen_random_uuid()"))
  ledgerNumber      String            @unique @db.VarChar(50) // COM-20260127-XXXXX
  orderId           String            @db.Uuid
  orderNumber       String            @db.VarChar(50)
  sellerId          String            @db.Uuid
  paymentId         String?           @db.Uuid
  orderAmount       Decimal           @db.Decimal(15, 2)
  commissionRate    Decimal           @db.Decimal(5, 4)  // 0.0050 = 0.5%
  commissionAmount  Decimal           @db.Decimal(15, 2)
  settlementId      String?           @db.Uuid
  status            CommissionStatus  @default(pending)
  collectedAt       DateTime?         @db.Timestamptz(6)
  orderCompletedAt  DateTime?         @db.Timestamptz(6)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@unique([orderId, sellerId])
  @@map("commission_ledger")
}
```

#### Added `CommissionStatus` Enum
```prisma
enum CommissionStatus {
  pending      // Order not yet completed
  collectible  // Order completed, ready to collect
  collected    // Deducted from seller payout
  waived       // Commission waived (promo, etc.)
  refunded     // Order refunded, commission voided
}
```

### 2. Outbox Events (`src/services/outbox.service.ts`)

Added 5 new commission event types:
- `commission.recorded` - When commission is first recorded
- `commission.collectible` - When order completes and commission is ready
- `commission.collected` - When commission is deducted from payout
- `commission.waived` - When commission is waived
- `commission.refunded` - When order is refunded

### 3. Repository Layer (`src/repositories/commission.repository.ts`)

Created comprehensive repository with methods:
- `create()` - Create commission record
- `findById()`, `findByLedgerNumber()` - Lookups
- `findByOrderAndSeller()` - Check existing commission
- `findBySellerId()` - Get seller's commissions
- `getCollectibleBySeller()` - Get ready-to-collect commissions
- `markAsCollectible()`, `markAsCollected()` - Status updates
- `waive()`, `markAsRefunded()` - Special actions
- `getTotalBySeller()` - Aggregate statistics
- `getStatsBySeller()` - Full statistics breakdown

### 4. Service Layer (`src/services/commission.service.ts`)

Business logic implementation:
- **`recordCommission()`** - Called when order is created/paid
  - Calculates commission (0.5% of order amount)
  - Generates unique ledger number (COM-YYYYMMDD-XXXXX)
  - Creates record with `pending` status
  - Publishes `commission.recorded` event
  
- **`markOrderCompleted()`** - Called when order is delivered
  - Updates status from `pending` → `collectible`
  - Records `orderCompletedAt` timestamp
  - Publishes `commission.collectible` event
  
- **`collectCommissions()`** - Called during weekly settlement
  - Gets all `collectible` commissions for seller
  - Updates status to `collected`
  - Links to settlement record
  - Publishes `commission.collected` events
  - Returns total amount to deduct from payout
  
- **`waiveCommission()`** - Admin function to waive commission
  - Updates status to `waived`
  - Requires reason (promo, partnership, etc.)
  
- **`refundCommission()`** - Called when order is refunded
  - Updates status to `refunded`
  - Voids the commission

### 5. Controller Layer (`src/controllers/commission.controller.ts`)

HTTP endpoints created:
- `POST /api/commissions` - Record commission
- `PUT /api/commissions/order/:orderId/complete` - Mark order completed
- `POST /api/commissions/seller/:sellerId/collect` - Collect commissions
- `PUT /api/commissions/order/:orderId/waive` - Waive commission (admin)
- `PUT /api/commissions/order/:orderId/refund` - Refund commission
- `GET /api/commissions/:id` - Get commission by ID
- `GET /api/commissions/ledger/:ledgerNumber` - Get by ledger number
- `GET /api/commissions/seller/:sellerId` - Get seller's commissions
- `GET /api/commissions/order/:orderId` - Get commissions for order
- `GET /api/commissions/seller/:sellerId/stats` - Get seller statistics
- `POST /api/commissions/calculate-payout` - Calculate net payout

### 6. Routes (`src/routes/commission.routes.ts`)

Fully validated routes with `express-validator`:
- All routes require `gatewayOrInternalAuth`
- Admin routes require `requireRole('admin')`
- Comprehensive validation for all inputs
- Pagination support for list endpoints

### 7. Main Application (`src/index.ts`)

- Imported and registered commission routes at `/api/commissions`

---

## Usage Flow

### 1. When Order is Created/Paid
```typescript
// Called by order-service
POST /api/commissions
{
  "orderId": "uuid",
  "orderNumber": "ORD-20260127-12345",
  "sellerId": "uuid",
  "paymentId": "uuid",
  "orderAmount": 250000,
  "commissionRate": 0.005  // Optional, defaults to 0.5%
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "ledgerNumber": "COM-20260127-67890",
    "orderId": "uuid",
    "sellerId": "uuid",
    "orderAmount": 250000,
    "commissionRate": 0.005,
    "commissionAmount": 1250,  // 250000 * 0.005
    "status": "pending"
  }
}
```

### 2. When Order is Delivered/Completed
```typescript
// Called by order-service
PUT /api/commissions/order/{orderId}/complete
{
  "sellerId": "uuid",
  "completedAt": "2026-01-27T12:00:00Z"  // Optional
}

// Status changes: pending → collectible
```

### 3. During Weekly Settlement
```typescript
// Called by settlement job
POST /api/commissions/seller/{sellerId}/collect
{
  "settlementId": "uuid"  // Optional
}

// Response
{
  "success": true,
  "data": {
    "commissions": [...],  // Array of collected commissions
    "totalAmount": 15250,  // Total to deduct
    "count": 12
  }
}

// Use this to calculate net payout:
// Seller gross earnings: 3,050,000 IDR
// Commission deducted:      -15,250 IDR
// Net payout:           3,034,750 IDR
```

### 4. Get Seller Statistics
```typescript
GET /api/commissions/seller/{sellerId}/stats

// Response
{
  "success": true,
  "data": {
    "totalPending": 2500,      // Pending orders
    "totalCollectible": 8750,  // Ready to collect
    "totalCollected": 125000,  // Already collected
    "totalWaived": 5000,       // Waived commissions
    "totalRefunded": 3000,     // Refunded orders
    "totalLifetime": 130000    // collected + waived
  }
}
```

---

## Integration Points

### With Order Service
Order service should call payment-service when:

1. **Order is paid/confirmed:**
   ```typescript
   POST /api/commissions
   // Record commission with pending status
   ```

2. **Order is delivered:**
   ```typescript
   PUT /api/commissions/order/{orderId}/complete
   // Mark commission as collectible
   ```

3. **Order is refunded:**
   ```typescript
   PUT /api/commissions/order/{orderId}/refund
   // Mark commission as refunded
   ```

### With Seller Settlement Job
Weekly settlement job should:

1. **Collect all commissions for seller:**
   ```typescript
   POST /api/commissions/seller/{sellerId}/collect
   // Get total commission amount
   ```

2. **Calculate net payout:**
   ```typescript
   grossEarnings = calculateSellerGrossEarnings(sellerId, weekStart, weekEnd)
   collectResult = POST /api/commissions/seller/{sellerId}/collect
   netPayout = grossEarnings - collectResult.totalAmount
   
   // Transfer netPayout to seller
   ```

### Events Published
Other services can listen to these events:

- **`commission.recorded`** → Seller dashboard can show pending commissions
- **`commission.collectible`** → Notification to seller "Commission will be deducted in next settlement"
- **`commission.collected`** → Update seller ledger, send settlement breakdown
- **`commission.waived`** → Notification to seller about promotional waiver
- **`commission.refunded`** → Update seller ledger when order refunded

---

## Database Migration

To apply the schema changes to your database:

```bash
cd backend/services/payment-service

# Development (push schema)
npx prisma db push

# Production (create migration)
npx prisma migrate dev --name add_commission_ledger
npx prisma migrate deploy
```

---

## API Examples

### Calculate Net Payout Helper
```typescript
POST /api/commissions/calculate-payout
{
  "grossAmount": 3050000,
  "commissionAmount": 15250
}

// Response
{
  "success": true,
  "data": {
    "grossAmount": 3050000,
    "commissionAmount": 15250,
    "netPayout": 3034750
  }
}
```

### Get Seller's Commissions (with pagination)
```typescript
GET /api/commissions/seller/{sellerId}?status=collectible&limit=50&offset=0

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ledgerNumber": "COM-20260127-12345",
      "orderId": "uuid",
      "orderNumber": "ORD-20260127-67890",
      "orderAmount": 250000,
      "commissionRate": 0.005,
      "commissionAmount": 1250,
      "status": "collectible",
      "orderCompletedAt": "2026-01-27T12:00:00Z"
    }
    // ... more commissions
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 12
  }
}
```

---

## Testing Checklist

- [ ] Create commission when order is paid
- [ ] Commission is idempotent (same order/seller doesn't create duplicate)
- [ ] Commission rate defaults to 0.5%
- [ ] Commission amount is calculated correctly
- [ ] Mark as collectible when order completes
- [ ] Collect commissions during settlement
- [ ] Calculate correct net payout
- [ ] Waive commission (admin only)
- [ ] Refund commission when order refunded
- [ ] Get seller statistics
- [ ] Pagination works correctly
- [ ] Events are published to outbox
- [ ] All validations work correctly

---

## Next Steps

1. **Implement Settlement Job**
   - Create weekly cron job to process seller payouts
   - Collect commissions for each seller
   - Calculate net payouts
   - Transfer funds to seller wallets/bank accounts

2. **Update Order Service**
   - Call commission endpoints when orders are paid/completed/refunded
   - Handle commission errors gracefully

3. **Seller Dashboard**
   - Show commission breakdown
   - Display pending/collectible/collected amounts
   - Show commission history

4. **Admin Dashboard**
   - View all commissions
   - Waive commissions for promotions
   - Commission reports and analytics

5. **Monitoring**
   - Set up alerts for commission calculation errors
   - Monitor settlement job success rate
   - Track commission collection rates

---

## Notes

- Commission is **0.5%** (0.005) by default
- Commission is only **collected** when order is **completed/delivered**
- If order is **refunded** before collection, commission is **voided**
- Commission can be **waived** for promotional purposes
- Settlement happens **weekly** (Monday)
- All operations are **idempotent** and **transactional**
- All state changes publish **events** for other services

---

## File Structure

```
payment-service/
├── prisma/
│   └── schema.prisma                          # ✅ Updated with CommissionLedger
├── src/
│   ├── controllers/
│   │   └── commission.controller.ts           # ✅ NEW
│   ├── repositories/
│   │   └── commission.repository.ts           # ✅ NEW
│   ├── routes/
│   │   └── commission.routes.ts               # ✅ NEW
│   ├── services/
│   │   ├── commission.service.ts              # ✅ NEW
│   │   └── outbox.service.ts                  # ✅ Updated with commission events
│   └── index.ts                               # ✅ Updated with commission routes
└── COMMISSION_IMPLEMENTATION.md               # ✅ This file
```

---

**Implementation Status:** ✅ Complete  
**Linter Errors:** ✅ None  
**Prisma Client:** ✅ Regenerated  
**Ready for Testing:** ✅ Yes
