# 🧪 AI Agent Prompt: Integration Testing

**Your Role:** QA & Integration Testing Lead
**Mission:** Test all implemented microservices and verify integrations
**Status:** READY TO START

---

## 🎯 Your Mission

You are responsible for testing the LAKOO social commerce platform. Your job is to:

1. **Verify each service starts correctly**
2. **Test API endpoints** with real requests
3. **Test cross-service integrations**
4. **Document any issues found**
5. **Create test data** for development

---

## 📋 Services to Test

| Service | Port | Database | Status |
|---------|------|----------|--------|
| product-service | 3002 | product_db | ✅ Ready |
| warehouse-service | 3012 | warehouse_db | ✅ Ready |
| content-service | 3017 | content_db | ✅ Ready |
| feed-service | 3018 | feed_db | ✅ Ready |
| payment-service | 3007 | payment_db | ✅ Ready |

---

## 🔧 Pre-Testing Setup

### Step 1: Create Environment Files

For each service, copy `.env.example` to `.env` and set values:

```bash
# Product Service
cd backend/services/product-service
cp .env.example .env
# Edit .env with:
# PRODUCT_DATABASE_URL=postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/product_db?sslmode=require

# Content Service
cd ../content-service
cp .env.example .env
# Edit .env with:
# CONTENT_DATABASE_URL=postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/content_db?sslmode=require

# Feed Service
cd ../feed-service
cp .env.example .env
# Edit .env with:
# FEED_DATABASE_URL=postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/feed_db?sslmode=require

# Warehouse Service
cd ../warehouse-service
cp .env.example .env
# Edit .env with:
# DATABASE_URL=postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/warehouse_db?sslmode=require
```

### Step 2: Start Services

Start each service in a separate terminal:

```bash
# Terminal 1: Product Service
cd backend/services/product-service
npm run dev

# Terminal 2: Content Service
cd backend/services/content-service
npm run dev

# Terminal 3: Feed Service
cd backend/services/feed-service
npm run dev

# Terminal 4: Warehouse Service
cd backend/services/warehouse-service
npm run dev
```

### Step 3: Verify Health Endpoints

```bash
curl http://localhost:3002/health  # product-service
curl http://localhost:3017/health  # content-service
curl http://localhost:3018/health  # feed-service
curl http://localhost:3012/health  # warehouse-service
```

Expected response for each:
```json
{
  "status": "healthy",
  "service": "service-name",
  "version": "1.0.0"
}
```

---

## 🧪 Test Scenarios

### Test 1: Product Service - Basic CRUD

#### 1.1 Create a Category
```bash
curl -X POST http://localhost:3002/api/categories \
  -H "Content-Type: application/json" \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000001" \
  -H "x-user-role: admin" \
  -d '{
    "name": "Fashion",
    "slug": "fashion",
    "description": "Fashion and clothing"
  }'
```

**Expected:** 201 Created with category data
**Save:** categoryId for next tests

#### 1.2 Create a Product (House Brand)
```bash
curl -X POST http://localhost:3002/api/admin/products \
  -H "Content-Type: application/json" \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000001" \
  -H "x-user-role: admin" \
  -d '{
    "categoryId": "<CATEGORY_ID>",
    "name": "Test T-Shirt",
    "slug": "test-t-shirt",
    "productCode": "TST-001",
    "description": "A test product for integration testing",
    "baseCostPrice": 50000,
    "baseSellPrice": 100000,
    "status": "approved"
  }'
```

**Expected:** 201 Created with product data
**Save:** productId for tagging tests

#### 1.3 Test Taggable Endpoint (NEW!)
```bash
curl http://localhost:3002/api/products/<PRODUCT_ID>/taggable \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000001"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "id": "<PRODUCT_ID>",
    "name": "Test T-Shirt",
    "sellerId": null,
    "status": "approved",
    "isTaggable": true,
    "price": 100000,
    "primaryImageUrl": null,
    "productSource": "warehouse_product"
  }
}
```

#### 1.4 Test Batch Taggable
```bash
curl -X POST http://localhost:3002/api/products/batch-taggable \
  -H "Content-Type: application/json" \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000001" \
  -d '{
    "productIds": ["<PRODUCT_ID>"]
  }'
```

**Expected:** Array of taggable products

---

### Test 2: Content Service - Posts & Product Tagging

#### 2.1 Create a Post WITHOUT Product Tags
```bash
curl -X POST http://localhost:3017/api/posts \
  -H "Content-Type: application/json" \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000001" \
  -H "x-user-role: user" \
  -d '{
    "caption": "Check out this amazing outfit! #fashion #ootd",
    "media": [
      {
        "mediaType": "image",
        "mediaUrl": "https://example.com/image1.jpg",
        "sortOrder": 0
      }
    ]
  }'
```

**Expected:** 201 Created with post data and extracted hashtags
**Save:** postId for engagement tests

#### 2.2 Create a Post WITH Product Tags
```bash
curl -X POST http://localhost:3017/api/posts \
  -H "Content-Type: application/json" \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000001" \
  -H "x-user-role: user" \
  -d '{
    "caption": "Love this t-shirt! #fashion",
    "media": [
      {
        "mediaType": "image",
        "mediaUrl": "https://example.com/outfit.jpg",
        "sortOrder": 0
      }
    ],
    "productTags": [
      {
        "productId": "<PRODUCT_ID>",
        "mediaIndex": 0,
        "positionX": 50,
        "positionY": 30
      }
    ]
  }'
```

**Expected:**
- 201 Created if product is approved
- Product snapshot saved (name, price, image)
- Error if product not found or not approved

#### 2.3 Like a Post
```bash
curl -X POST http://localhost:3017/api/posts/<POST_ID>/like \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
  -H "x-user-role: user"
```

**Expected:** 200 OK, likeCount incremented

#### 2.4 Add a Comment
```bash
curl -X POST http://localhost:3017/api/comments \
  -H "Content-Type: application/json" \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
  -H "x-user-role: user" \
  -d '{
    "postId": "<POST_ID>",
    "content": "Great outfit! Where did you get that shirt?"
  }'
```

**Expected:** 201 Created with comment data

#### 2.5 Get Trending Hashtags
```bash
curl http://localhost:3017/api/hashtags/trending \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000001"
```

**Expected:** Array of trending hashtags

---

### Test 3: Feed Service - Social Graph & Feeds

#### 3.1 Follow a User
```bash
curl -X POST http://localhost:3018/api/follow/users/00000000-0000-0000-0000-000000000001/follow \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
  -H "x-user-role: user"
```

**Expected:** 200 OK with follow relationship created

#### 3.2 Get Follower Stats
```bash
curl http://localhost:3018/api/follow/users/00000000-0000-0000-0000-000000000001/stats \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002"
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "followerCount": 1,
    "followingCount": 0
  }
}
```

#### 3.3 Get Following Feed
```bash
curl http://localhost:3018/api/feed/following \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
  -H "x-user-role: user"
```

**Expected:** Array of posts from followed users

#### 3.4 Get For You Feed
```bash
curl http://localhost:3018/api/feed/for-you \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002" \
  -H "x-user-role: user"
```

**Expected:** Personalized feed with mixed content

#### 3.5 Get Trending Posts
```bash
curl http://localhost:3018/api/trending/posts \
  -H "x-gateway-key: test-gateway-key" \
  -H "x-user-id: 00000000-0000-0000-0000-000000000001"
```

**Expected:** Array of trending posts

---

### Test 4: Cross-Service Integration Tests

#### 4.1 Full Product Tagging Flow
```
1. Create product in product-service (status: approved)
2. Verify product is taggable via /taggable endpoint
3. Create post in content-service with product tag
4. Verify product snapshot was saved correctly
5. Click product tag and verify click tracking
```

#### 4.2 Full Social Flow
```
1. User A creates a post
2. User B follows User A
3. User B's following feed shows User A's post
4. User B likes the post
5. Verify like count incremented
6. User B comments on the post
7. Verify comment count incremented
```

#### 4.3 Feed Generation Flow
```
1. User A follows User B and User C
2. User B creates a post
3. User C creates a post
4. User A's feed shows both posts
5. Verify posts are sorted by recency
```

---

## 📋 Test Results Template

### Service: [service-name]

| Test | Endpoint | Status | Notes |
|------|----------|--------|-------|
| Health Check | GET /health | ✅/❌ | |
| Test 1 | POST /api/... | ✅/❌ | |
| Test 2 | GET /api/... | ✅/❌ | |

### Issues Found

| Issue | Severity | Service | Description |
|-------|----------|---------|-------------|
| 1 | HIGH/MED/LOW | service-name | Description |

---

## 🔧 Troubleshooting

### Service Won't Start

```bash
# Check if port is in use
netstat -ano | findstr :3002

# Check logs
npm run dev 2>&1 | head -50
```

### Database Connection Error

```bash
# Verify database URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Authentication Error (401/403)

```bash
# In development, set NODE_ENV
export NODE_ENV=development

# Or add gateway key header
-H "x-gateway-key: your-key"
```

### Product Tagging Fails

```bash
# Check product status (must be 'approved' or 'active')
curl http://localhost:3002/api/products/<id>/taggable

# Check product-service is running
curl http://localhost:3002/health
```

---

## 📊 Test Coverage Checklist

### Product Service
- [ ] Create category
- [ ] Create product
- [ ] Get product by ID
- [ ] Get product by slug
- [ ] Check taggable endpoint
- [ ] Batch taggable endpoint
- [ ] Create draft (seller flow)
- [ ] Approve draft

### Content Service
- [ ] Create post without tags
- [ ] Create post with product tags
- [ ] Get post by ID
- [ ] Get user's posts
- [ ] Like post
- [ ] Unlike post
- [ ] Save post
- [ ] Create comment
- [ ] Like comment
- [ ] Report content
- [ ] Get trending hashtags
- [ ] Search hashtags

### Feed Service
- [ ] Follow user
- [ ] Unfollow user
- [ ] Get followers
- [ ] Get following
- [ ] Get follow stats
- [ ] Check is following
- [ ] Block user
- [ ] Mute user
- [ ] Get following feed
- [ ] Get for-you feed
- [ ] Get explore feed
- [ ] Get trending posts
- [ ] Get trending hashtags

### Warehouse Service
- [ ] Check inventory status
- [ ] Reserve inventory
- [ ] Release reservation
- [ ] Confirm reservation
- [ ] Check bundle overflow

---

## 🎯 Success Criteria

Testing is complete when:

1. ✅ All services start without errors
2. ✅ All health endpoints return healthy
3. ✅ Product CRUD operations work
4. ✅ Product tagging validation works (taggable endpoint)
5. ✅ Posts can be created with product tags
6. ✅ Product snapshots are saved correctly
7. ✅ Follow/unfollow works
8. ✅ Feeds are generated correctly
9. ✅ Engagement features work (likes, comments, saves)
10. ✅ No critical errors in logs

---

## 📝 Report Template

After testing, create a report:

```markdown
# Integration Test Report

**Date:** YYYY-MM-DD
**Tester:** Agent Name
**Environment:** Development

## Summary

- Services Tested: X/5
- Tests Passed: X/Y
- Tests Failed: X
- Critical Issues: X

## Detailed Results

### Product Service
[Results here]

### Content Service
[Results here]

### Feed Service
[Results here]

### Warehouse Service
[Results here]

## Issues Found
[List issues]

## Recommendations
[List recommendations]
```

---

## 📞 Escalation

If you encounter:
- **Database connection issues** → Check Neon dashboard
- **Service won't build** → Report to orchestrator
- **Cross-service integration fails** → Check service URLs in .env
- **Authentication issues** → Verify gateway key config

---

**Good luck testing! Thorough testing ensures a quality product.** 🧪
