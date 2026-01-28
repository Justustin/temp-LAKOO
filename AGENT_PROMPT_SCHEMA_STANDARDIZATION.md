# 🔧 AI Agent Prompt: Schema Standardization (snake_case)

**Agent ID:** Agent 7 - Schema Standardization Lead  
**Priority:** 🔴 CRITICAL (Blocking all integration)  
**Estimated Time:** 3-4 hours

---

## 📋 Mission Brief

You are assigned to **standardize ALL database schemas** to use **snake_case** column names. Currently, all schemas use camelCase for field names without `@map` directives, resulting in camelCase columns in the database.

**Problem:** 
- All 18 service schemas use camelCase field names (e.g., `userId`, `createdAt`)
- 4 services already deployed to Neon have camelCase columns
- LAKOO standard requires **snake_case** database columns (e.g., `user_id`, `created_at`)

---

## 🎯 Objectives

### Part 1: Fix Deployed Services (Neon databases have wrong column names)
These services have databases deployed with camelCase columns. Need to:
1. Add `@map` directives to Prisma schema
2. Drop and recreate tables with correct column names
3. Update service code to match Prisma field names (camelCase in code, snake_case in DB)

| Service | Port | Database | Status |
|---------|------|----------|--------|
| product-service | 3002 | product_db | ⚠️ camelCase in DB |
| content-service | 3017 | content_db | ⚠️ camelCase in DB |
| feed-service | 3018 | feed_db | ⚠️ camelCase in DB |
| warehouse-service | 3012 | warehouse_db | ⚠️ camelCase in DB |

### Part 2: Update Root Schema Files
Update all 18 `*-service-schema.prisma` files in root directory to have `@map` directives.

---

## 🗄️ Database Convention Standard

**CRITICAL:** All LAKOO databases use **snake_case** for column names:

```prisma
// ✅ CORRECT - Prisma maps camelCase to snake_case
model Post {
  id          String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String @map("user_id") @db.Uuid
  postCode    String @unique @map("post_code") @db.VarChar(50)
  likeCount   Int    @default(0) @map("like_count")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  @@map("post")  // table name is snake_case
}

// ❌ WRONG - Creates camelCase columns in database
model Post {
  id        String @id
  userId    String @db.Uuid  // Creates "userId" column instead of "user_id"
  postCode  String           // Creates "postCode" column instead of "post_code"
  createdAt DateTime         // Creates "createdAt" column instead of "created_at"
}
```

---

## 📐 Mapping Rules

### Fields that NEED `@map`:

| Pattern | Example Field | Maps To |
|---------|---------------|---------|
| Two-word camelCase | `userId` | `@map("user_id")` |
| Three-word camelCase | `createdByUserId` | `@map("created_by_user_id")` |
| Boolean prefix | `isActive` | `@map("is_active")` |
| Boolean prefix | `hasVariants` | `@map("has_variants")` |
| URL suffix | `imageUrl` | `@map("image_url")` |
| ID suffix | `orderId` | `@map("order_id")` |
| At suffix | `createdAt` | `@map("created_at")` |
| Count suffix | `likeCount` | `@map("like_count")` |

### Fields that DON'T need `@map`:

| Field | Reason |
|-------|--------|
| `id` | Already lowercase |
| `name` | Already lowercase |
| `slug` | Already lowercase |
| `email` | Already lowercase |
| `status` | Already lowercase |
| `amount` | Already lowercase |
| `description` | Already lowercase |

---

## 🔄 Phase 1: Fix Deployed Services

### Step 1.1: Product Service (product_db)

```bash
cd backend/services/product-service
```

**Files to update:**
1. `prisma/schema.prisma` - Add `@map` directives
2. `src/types/index.ts` - Update DTOs (factoryId → sellerId)
3. `src/repositories/product.repository.ts` - Verify uses Prisma camelCase
4. `src/routes/admin.routes.ts` - Update validation

**Schema changes for `prisma/schema.prisma`:**

```prisma
model Category {
  id           String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  parentId     String?    @map("parent_id") @db.Uuid
  name         String     @db.VarChar(255)
  slug         String     @unique @db.VarChar(255)
  description  String?
  imageUrl     String?    @map("image_url")
  iconUrl      String?    @map("icon_url")
  displayOrder Int        @default(0) @map("display_order")
  level        Int        @default(0)
  path         String?    @db.VarChar(500)
  isActive     Boolean    @default(true) @map("is_active")
  isFeatured   Boolean    @default(false) @map("is_featured")
  metaTitle    String?    @map("meta_title") @db.VarChar(255)
  metaDescription String? @map("meta_description")
  createdAt    DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime   @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime?  @map("deleted_at") @db.Timestamptz(6)

  // Relations...
  
  @@map("category")
}

model Product {
  id               String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  categoryId       String        @map("category_id") @db.Uuid
  sellerId         String?       @map("seller_id") @db.Uuid
  draftId          String?       @unique @map("draft_id") @db.Uuid
  productCode      String        @unique @map("product_code") @db.VarChar(50)
  name             String        @db.VarChar(255)
  slug             String        @unique @db.VarChar(255)
  description      String?
  shortDescription String?       @map("short_description") @db.VarChar(500)
  baseCostPrice    Decimal       @map("base_cost_price") @db.Decimal(15, 2)
  baseSellPrice    Decimal       @map("base_sell_price") @db.Decimal(15, 2)
  weightGrams      Int?          @map("weight_grams")
  lengthCm         Decimal?      @map("length_cm") @db.Decimal(10, 2)
  widthCm          Decimal?      @map("width_cm") @db.Decimal(10, 2)
  heightCm         Decimal?      @map("height_cm") @db.Decimal(10, 2)
  primaryImageUrl  String?       @map("primary_image_url")
  grosirUnitSize   Int?          @default(12) @map("grosir_unit_size")
  material         String?       @db.VarChar(255)
  careInstructions String?       @map("care_instructions")
  countryOfOrigin  String?       @map("country_of_origin") @db.VarChar(100)
  status           ProductStatus @default(draft)
  moderationNotes  String?       @map("moderation_notes")
  metaTitle        String?       @map("meta_title") @db.VarChar(255)
  metaDescription  String?       @map("meta_description")
  tags             String[]
  publishedAt      DateTime?     @map("published_at") @db.Timestamptz(6)
  supplierName     String?       @map("supplier_name") @db.VarChar(255)
  avgRating        Decimal?      @map("avg_rating") @db.Decimal(3, 2)
  reviewCount      Int           @default(0) @map("review_count")
  createdBy        String?       @map("created_by") @db.Uuid
  updatedBy        String?       @map("updated_by") @db.Uuid
  createdAt        DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt        DateTime?     @map("deleted_at") @db.Timestamptz(6)

  // Relations...
  
  @@map("product")
}

// Continue for ALL models in product-service schema...
```

**After schema update:**
```bash
# Regenerate Prisma client
npx prisma generate

# Push to Neon (this will drop and recreate tables)
npx prisma db push --force-reset --accept-data-loss
```

---

### Step 1.2: Content Service (content_db)

```bash
cd backend/services/content-service
```

**Key models to update with @map:**

```prisma
model Post {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String      @map("user_id") @db.Uuid
  postCode        String      @unique @map("post_code") @db.VarChar(50)
  title           String?     @db.VarChar(255)
  caption         String
  postType        PostType    @default(standard) @map("post_type")
  likeCount       Int         @default(0) @map("like_count")
  commentCount    Int         @default(0) @map("comment_count")
  saveCount       Int         @default(0) @map("save_count")
  shareCount      Int         @default(0) @map("share_count")
  viewCount       Int         @default(0) @map("view_count")
  status          PostStatus  @default(draft)
  publishedAt     DateTime?   @map("published_at") @db.Timestamptz(6)
  visibility      PostVisibility @default(public)
  locationName    String?     @map("location_name") @db.VarChar(255)
  locationLat     Decimal?    @map("location_lat") @db.Decimal(10, 8)
  locationLng     Decimal?    @map("location_lng") @db.Decimal(11, 8)
  isReported      Boolean     @default(false) @map("is_reported")
  reportCount     Int         @default(0) @map("report_count")
  moderationStatus ModerationStatus @default(pending) @map("moderation_status")
  moderatedAt     DateTime?   @map("moderated_at") @db.Timestamptz(6)
  moderatedBy     String?     @map("moderated_by") @db.Uuid
  createdAt       DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime    @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime?   @map("deleted_at") @db.Timestamptz(6)

  // Relations...
  
  @@map("post")
}

model PostMedia {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  postId        String    @map("post_id") @db.Uuid
  mediaType     MediaType @map("media_type")
  mediaUrl      String    @map("media_url")
  thumbnailUrl  String?   @map("thumbnail_url")
  altText       String?   @map("alt_text") @db.VarChar(255)
  displayOrder  Int       @default(0) @map("display_order")
  width         Int?
  height        Int?
  durationSecs  Int?      @map("duration_secs")
  sizeBytes     Int?      @map("size_bytes")
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  // Relations...
  
  @@map("post_media")
}

// Continue for ALL models: PostProductTag, Comment, PostLike, PostSave, Hashtag, etc.
```

---

### Step 1.3: Feed Service (feed_db)

```bash
cd backend/services/feed-service
```

**Key models to update with @map:**

```prisma
model UserFollow {
  id          String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  followerId  String      @map("follower_id") @db.Uuid
  followingId String      @map("following_id") @db.Uuid
  status      FollowStatus @default(active)
  createdAt   DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  unfollowedAt DateTime?  @map("unfollowed_at") @db.Timestamptz(6)

  @@unique([followerId, followingId])
  @@map("user_follow")
}

model UserFollowStats {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String   @unique @map("user_id") @db.Uuid
  followerCount  Int      @default(0) @map("follower_count")
  followingCount Int      @default(0) @map("following_count")
  version        Int      @default(0)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("user_follow_stats")
}

model FeedItem {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String      @map("user_id") @db.Uuid
  postId        String      @map("post_id") @db.Uuid
  authorId      String      @map("author_id") @db.Uuid
  feedType      FeedType    @default(following) @map("feed_type")
  relevanceScore Decimal?   @map("relevance_score") @db.Decimal(10, 4)
  reasons       String[]
  postCreatedAt DateTime    @map("post_created_at") @db.Timestamptz(6)
  createdAt     DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  expiresAt     DateTime?   @map("expires_at") @db.Timestamptz(6)

  @@unique([userId, postId, feedType])
  @@map("feed_item")
}

// Continue for ALL models: UserInterest, TrendingContent, UserBlock, UserMute, etc.
```

---

### Step 1.4: Warehouse Service (warehouse_db)

```bash
cd backend/services/warehouse-service
```

**Key models to update with @map:**

```prisma
model WarehouseInventory {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  productId         String    @map("product_id") @db.Uuid
  variantId         String?   @map("variant_id") @db.Uuid
  sku               String    @db.VarChar(100)
  quantity          Int       @default(0)
  reservedQuantity  Int       @default(0) @map("reserved_quantity")
  availableQuantity Int       @default(0) @map("available_quantity")
  damagedQuantity   Int       @default(0) @map("damaged_quantity")
  minStockLevel     Int       @default(0) @map("min_stock_level")
  maxStockLevel     Int?      @map("max_stock_level")
  reorderPoint      Int?      @map("reorder_point")
  reorderQuantity   Int?      @map("reorder_quantity")
  location          String?   @db.VarChar(100)
  zone              String?   @db.VarChar(50)
  lastRestockedAt   DateTime? @map("last_restocked_at") @db.Timestamptz(6)
  lastSoldAt        DateTime? @map("last_sold_at") @db.Timestamptz(6)
  lastCountedAt     DateTime? @map("last_counted_at") @db.Timestamptz(6)
  status            InventoryStatus @default(active)
  version           Int       @default(0)
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  // Relations...
  
  @@unique([productId, variantId])
  @@map("warehouse_inventory")
}

// Continue for ALL models: InventoryMovement, StockReservation, GrosirBundleConfig, etc.
```

---

## 🔄 Phase 2: Update Root Schema Files

Update ALL 18 `*-service-schema.prisma` files in the root directory with `@map` directives.

### Files to Update:

| File | Priority |
|------|----------|
| `product-service-schema.prisma` | 🔴 HIGH |
| `content-service-schema.prisma` | 🔴 HIGH |
| `feed-service-schema.prisma` | 🔴 HIGH |
| `warehouse-service-schema.prisma` | 🔴 HIGH |
| `payment-service-schema.prisma` | 🟡 MEDIUM |
| `auth-service-schema.prisma` | 🟡 MEDIUM |
| `seller-service-schema.prisma` | 🟡 MEDIUM |
| `order-service-schema.prisma` | 🟡 MEDIUM |
| `cart-service-schema.prisma` | 🟡 MEDIUM |
| `address-service-schema.prisma` | 🟢 LOW |
| `brand-service-schema.prisma` | 🟢 LOW |
| `review-service-schema.prisma` | 🟢 LOW |
| `logistic-service-schema.prisma` | 🟢 LOW |
| `notification-service-schema.prisma` | 🟢 LOW |
| `wallet-service-schema.prisma` | 🟢 LOW |
| `advertisement-service-schema.prisma` | 🟢 LOW |
| `support-service-schema.prisma` | 🟢 LOW |
| `supplier-service-schema.prisma` | 🟢 LOW |

---

## ✅ Implementation Steps

### Step 1: Fix Service Schemas (in order)

```bash
# 1. Product Service
cd backend/services/product-service
# Update prisma/schema.prisma with @map directives
# Update src/types/index.ts
# Update src/repositories/product.repository.ts
# Update src/routes/admin.routes.ts
npx prisma generate
npx prisma db push --force-reset --accept-data-loss
npm run build

# 2. Content Service
cd ../content-service
# Update prisma/schema.prisma with @map directives
npx prisma generate
npx prisma db push --force-reset --accept-data-loss
npm run build

# 3. Feed Service
cd ../feed-service
# Update prisma/schema.prisma with @map directives
npx prisma generate
npx prisma db push --force-reset --accept-data-loss
npm run build

# 4. Warehouse Service
cd ../warehouse-service
# Update prisma/schema.prisma with @map directives
npx prisma generate
npx prisma db push --force-reset --accept-data-loss
npm run build
```

### Step 2: Update Root Schema Files

For each root schema file, add `@map` directives to all camelCase fields:

```bash
# In project root
# Update all 18 *-service-schema.prisma files
```

### Step 3: Verify

```bash
# Test each service
cd backend/services/product-service && npm run build && npm run dev
cd ../content-service && npm run build && npm run dev
cd ../feed-service && npm run build && npm run dev
cd ../warehouse-service && npm run build && npm run dev
```

---

## 📁 Database Connections

Use these connections from `DB_Connection.txt`:

```
product_db:    postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/product_db?sslmode=require
content_db:    postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/content_db?sslmode=require
feed_db:       postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/feed_db?sslmode=require
warehouse_db:  postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/warehouse_db?sslmode=require
```

---

## 🚫 Common Mistakes to Avoid

1. **Don't forget `@map` on ANY camelCase field** - Every camelCase field needs mapping
2. **Don't use `@map` on single-word fields** - `id`, `name`, `slug` don't need it
3. **Don't change relation field names** - Keep relation arrays like `products Product[]`
4. **Don't forget `@@map` on model** - Table names should be snake_case too
5. **Don't run db push without `--force-reset`** - Need to recreate tables with new column names

---

## 📊 Success Criteria

### For Deployed Services
- [ ] product-service: Schema updated, db pushed, builds, product CRUD works
- [ ] content-service: Schema updated, db pushed, builds, post CRUD works
- [ ] feed-service: Schema updated, db pushed, builds, follow works
- [ ] warehouse-service: Schema updated, db pushed, builds, inventory works

### For Root Schema Files
- [ ] All 18 `*-service-schema.prisma` files updated with `@map` directives
- [ ] No camelCase columns will be created when these schemas are used

### Integration Tests
- [ ] Re-run integration tests after fix
- [ ] Product creation works
- [ ] Product tagging works
- [ ] All 18/18 tests should pass

---

## 🔗 Dependencies

**This fix unblocks:**
- Integration testing (50% tests blocked)
- Product tagging in content-service
- Future service deployments

**Coordinate with:**
- Orchestrator Agent for status updates
- Integration Testing Agent for re-testing

---

## 📞 Coordination

**Report to:** Orchestrator Agent  
**After completion:** Request Integration Testing Agent to re-run tests  
**Escalate if:** Data loss issues or migration failures

---

**Created:** 2026-01-27  
**Status:** 📋 READY FOR ASSIGNMENT  
**Blocking:** ALL integration testing
