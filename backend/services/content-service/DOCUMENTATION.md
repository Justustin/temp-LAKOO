# Content Service Documentation

**Service Name:** content-service  
**Port:** 3017  
**Database:** content_db (Neon PostgreSQL)  
**Language:** TypeScript (Node.js)  
**Status:** ✅ Fully Implemented

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [API Endpoints](#api-endpoints)
5. [Business Rules](#business-rules)
6. [Database Schema](#database-schema)
7. [Events Published](#events-published)
8. [Integration Points](#integration-points)
9. [Setup & Development](#setup--development)

---

## Overview

The **content-service** is the heart of LAKOO's social commerce platform. It powers the Xiaohongshu/Pinterest-style social feed where users create posts, tag products, and engage with content. **Product tagging is the KEY FEATURE** that connects social content to commerce.

### Key Responsibilities

- ✅ **Posts**: Create, read, update, delete posts with media
- ✅ **Product Tagging**: Validate and tag products from product-service
- ✅ **Comments**: Nested comments with mentions and likes
- ✅ **Engagement**: Likes, saves, views, tag clicks
- ✅ **Hashtags**: Trending, search, and post discovery
- ✅ **Collections**: Save posts to Pinterest-style boards
- ✅ **Moderation**: Content reporting and moderation workflow

---

## Architecture

### Product Tagging Flow

```
User creates post with product tags
            │
            ▼
    ┌─────────────────────┐
    │   content-service    │
    │   (creates post)     │
    └──────────┬──────────┘
               │
               │ For each tagged product:
               │ GET /api/products/:id/taggable
               ▼
    ┌─────────────────────┐
    │   product-service    │  ◄── Single source of truth
    │   (validates product)│      for ALL products
    └──────────┬──────────┘
               │
               │ Returns:
               │ - Product exists? ✓
               │ - Status = approved? ✓
               │ - Product info for snapshot
               ▼
    ┌─────────────────────┐
    │   content-service    │
    │   (saves tag with    │
    │    product snapshot) │
    └─────────────────────┘
```

### Why Snapshot Product Info?

When users tag products, we save a **snapshot** of product info:
- `productName` - Name at time of tagging
- `productPrice` - Price at time of tagging  
- `productImageUrl` - Image at time of tagging
- `snapshotAt` - When snapshot was taken

**Why?** If the seller changes the product later, old posts still show correct info from when they were created.

---

## Features

### ✅ Phase 1: Project Setup
- [x] Directory structure
- [x] Standardization files (auth, validation, error handling)
- [x] Local Prisma client setup
- [x] Environment configuration

### ✅ Phase 2: Posts
- [x] Post CRUD operations
- [x] Product tag validation (calls product-service)
- [x] Product info snapshot on tagging
- [x] Media handling (URLs from frontend)
- [x] Hashtag extraction and linking
- [x] Like/unlike posts
- [x] Save/unsave posts
- [x] View counting
- [x] Tag click tracking

### ✅ Phase 3: Comments
- [x] Comment CRUD
- [x] Nested replies
- [x] Comment likes
- [x] Mention extraction

### ✅ Phase 4: Content Moderation
- [x] Report content (posts/comments)
- [x] Moderation queue
- [x] Resolve reports with actions
- [x] Content removal

### ✅ Phase 5: Hashtags & Collections
- [x] Trending hashtags
- [x] Hashtag search
- [x] Posts by hashtag
- [x] Related hashtags
- [x] Create/manage collections
- [x] Save posts to collections
- [x] Collection privacy

---

## API Endpoints

### Posts

#### Public/Optional Auth
```
GET    /api/posts                    - Get posts (public feed)
GET    /api/posts/:id                - Get single post
GET    /api/posts/product/:productId - Get posts with product tag
```

#### Authenticated
```
POST   /api/posts                    - Create post
GET    /api/posts/me/posts           - Get my posts
PUT    /api/posts/:id                - Update post
DELETE /api/posts/:id                - Delete post
```

#### Engagement
```
POST   /api/posts/:id/like           - Like post
DELETE /api/posts/:id/like           - Unlike post
POST   /api/posts/:id/save           - Save post
DELETE /api/posts/:id/save           - Unsave post
POST   /api/posts/:id/view           - Record view
POST   /api/posts/:postId/tags/:tagId/click - Track tag click
```

### Comments

#### Public
```
GET    /api/comments/post/:postId    - Get comments for post
GET    /api/comments/:id             - Get single comment
```

#### Authenticated
```
POST   /api/comments                 - Create comment
PUT    /api/comments/:id             - Update comment
DELETE /api/comments/:id             - Delete comment
POST   /api/comments/:id/like        - Like comment
DELETE /api/comments/:id/like        - Unlike comment
```

### Hashtags (All Public)

```
GET    /api/hashtags/trending        - Get trending hashtags
GET    /api/hashtags/search          - Search hashtags
GET    /api/hashtags/popular         - Get popular hashtags
GET    /api/hashtags/:tag            - Get hashtag info
GET    /api/hashtags/:tag/posts      - Get posts by hashtag
GET    /api/hashtags/:tag/related    - Get related hashtags
```

### Collections

#### Public (if not private)
```
GET    /api/collections/:id          - Get collection
GET    /api/collections/:id/posts    - Get posts in collection
```

#### Authenticated
```
GET    /api/collections              - Get my collections
GET    /api/collections/saved/all    - Get my saved posts
POST   /api/collections              - Create collection
PUT    /api/collections/:id          - Update collection
DELETE /api/collections/:id          - Delete collection
```

### Moderation

#### User Routes
```
POST   /api/moderation/reports       - Report content
GET    /api/moderation/my-reports    - Get my reports
```

#### Moderator Routes (require 'moderator' or 'admin' role)
```
GET    /api/moderation/reports       - Get pending reports
GET    /api/moderation/reports/:id   - Get report by ID
PUT    /api/moderation/reports/:id/status - Update report status
POST   /api/moderation/reports/:id/resolve - Resolve report
POST   /api/moderation/reports/:id/dismiss - Dismiss report
```

---

## Business Rules

### Rule 1: Product Tagging Validation

```typescript
// ONLY approved products can be tagged
// ALWAYS call product-service to validate
// ALWAYS snapshot product info when tagging

const product = await productClient.checkTaggable(productId);
if (!product || !product.isTaggable) {
  throw new BadRequestError('Product cannot be tagged');
}
```

### Rule 2: Post Visibility

```typescript
// Public posts: visible to everyone
// Followers-only posts: visible to followers + author
// Private posts: visible only to author

// When fetching posts, always filter by visibility
if (post.visibility === 'followers_only') {
  const isFollower = await feedService.isFollowing(viewerId, post.userId);
  if (!isFollower && viewerId !== post.userId) {
    throw new ForbiddenError('Not authorized to view this post');
  }
}
```

### Rule 3: Engagement Counts

```typescript
// Use atomic operations for counters
// Prevent duplicate likes/saves
// Update counts in same transaction as action

await prisma.$transaction(async (tx) => {
  // Check not already liked
  const existing = await tx.postLike.findUnique({
    where: { postId_userId: { postId, userId } }
  });
  if (existing) throw new BadRequestError('Already liked');

  // Create like AND increment count atomically
  await tx.postLike.create({ data: { postId, userId } });
  await tx.post.update({
    where: { id: postId },
    data: { likeCount: { increment: 1 } }
  });
});
```

### Rule 4: Soft Deletes

```typescript
// Never hard delete posts or comments
// Use deletedAt timestamp
// Hide from queries but keep for audit

await prisma.post.update({
  where: { id: postId },
  data: { deletedAt: new Date() }
});

// In queries:
where: { deletedAt: null }
```

---

## Database Schema

See `prisma/schema.prisma` for full schema.

### Key Models

- **Post** - User-generated posts with media
- **PostMedia** - Images/videos attached to posts
- **PostProductTag** - Products tagged in posts (with snapshot)
- **Hashtag** - Hashtags for discovery
- **PostHashtag** - Junction table
- **PostLike** - User likes on posts
- **PostSave** - User saves/bookmarks
- **SaveCollection** - Pinterest-style boards
- **Comment** - Comments on posts (nested)
- **CommentLike** - Likes on comments
- **CommentMention** - User mentions in comments
- **ContentReport** - Moderation reports
- **ServiceOutbox** - Event outbox for Kafka

---

## Events Published

| Event | When | Payload | Who Consumes |
|-------|------|---------|--------------|
| `post.created` | Post published | postId, userId, productIds, hashtags | feed-service, notification-service |
| `post.updated` | Post edited | postId, changes | feed-service |
| `post.deleted` | Post removed | postId, userId | feed-service |
| `post.liked` | User likes post | postId, userId, authorId | notification-service, feed-service |
| `post.saved` | User saves post | postId, userId | feed-service |
| `post.viewed` | User views post | postId, userId, durationSec | feed-service |
| `comment.created` | Comment added | commentId, postId, userId, authorId | notification-service |
| `comment.liked` | Comment liked | commentId, userId | notification-service |
| `product_tag.clicked` | User clicks tag | postId, tagId, productId | analytics, feed-service |
| `content.reported` | Content reported | reportId, contentType, reason | moderation queue |
| `content.moderated` | Mod takes action | reportId, action | notification-service |

---

## Integration Points

### Calls to Other Services

#### Product-Service
- **Endpoint**: `GET /api/products/:id/taggable`
- **Purpose**: Validate product can be tagged (approved status)
- **Returns**: Product info for snapshot (name, price, image)
- **When**: When user tags product in post

### Called By Other Services

#### Feed-Service
- May call to get post details
- Subscribes to post events for feed updates

#### Notification-Service  
- Subscribes to like/comment events
- Sends notifications to users

---

## Setup & Development

### Prerequisites

- Node.js >= 18
- pnpm
- PostgreSQL (Neon)

### Environment Variables

Create `.env` file:

```env
PORT=3017
NODE_ENV=development

# Database
CONTENT_DATABASE_URL="postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/content_db?sslmode=require"

# Authentication
GATEWAY_SECRET_KEY=your-gateway-secret
SERVICE_SECRET=your-service-secret
SERVICE_NAME=content-service

# Service URLs
PRODUCT_SERVICE_URL=http://localhost:3002
FEED_SERVICE_URL=http://localhost:3018
NOTIFICATION_SERVICE_URL=http://localhost:3008
```

### Installation

```bash
cd backend/services/content-service
pnpm install
```

### Database Setup

```bash
# Generate Prisma client
pnpm run db:generate

# Push schema to database
pnpm run db:push
```

### Development

```bash
# Run in development mode
pnpm run dev

# Build for production
pnpm run build

# Run production build
pnpm start
```

### Testing

```bash
# Health check
curl http://localhost:3017/health

# Create post (requires auth headers)
curl -X POST http://localhost:3017/api/posts \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "caption": "Love this outfit! #fashion #ootd",
    "media": [{
      "mediaType": "image",
      "mediaUrl": "https://example.com/image.jpg",
      "sortOrder": 0
    }],
    "productTags": [{
      "productId": "product-uuid",
      "mediaIndex": 0,
      "positionX": 50,
      "positionY": 30
    }]
  }'
```

---

## 🚨 Important Notes

1. **Product Validation**: Always validate products via product-service before creating tags
2. **Snapshot Data**: Product info is snapshotted at tag time - immutable
3. **Soft Deletes**: Use `deletedAt` for posts and comments - never hard delete
4. **Atomic Counters**: Use Prisma's increment/decrement for engagement counts
5. **Event Outbox**: All state changes publish events for other services

---

## 📞 Support

For questions or issues:
1. Check `backend/services/claude.md` for standardization patterns
2. Reference `payment-service` for implementation examples
3. Review `FUTURE_ME_PROBLEMS.md` for architecture decisions

---

**Remember:** This service is what makes LAKOO a SOCIAL commerce platform. Without it, we're just another e-commerce site. Great content drives product discovery!

**Status:** ✅ Fully Implemented - All Phases Complete
