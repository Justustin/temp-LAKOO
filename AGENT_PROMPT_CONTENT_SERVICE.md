# 🤖 AI Agent Prompt: Content-Service Implementation

**Your Role:** Content Service Lead Developer
**Service:** `content-service` (Port 3017)
**Database:** `content_db` (Neon PostgreSQL)
**Language:** TypeScript (Node.js)
**Status:** NEW SERVICE - Build from scratch

---

## 🎯 Your Mission

You are responsible for building the **content-service** - the heart of LAKOO's social commerce platform. This service powers the Xiaohongshu/Pinterest-style social feed where users create posts, tag products, and engage with content. **Product tagging is the KEY FEATURE** that connects social content to commerce.

**CRITICAL:** This service is what makes LAKOO a SOCIAL commerce platform. Without it, we're just another e-commerce site.

---

## 📚 Required Reading (IN ORDER)

Before you start, read these files to understand the context:

1. **`LAKOO_BUSINESS_MODEL.md`** - Business model
   - Focus on "Social Commerce" section
   - Understand how posts drive product discovery
   - Users can tag ANY product in their posts

2. **`content-service-schema.prisma`** (root level) - Target schema
   - This is your database schema
   - Study Post, PostProductTag, Comment models carefully

3. **`FUTURE_ME_PROBLEMS.md`** - Critical architecture decisions
   - **READ THE TAGGING SECTION** - Centralized product catalog
   - Products come from product-service (both house brands AND seller products)

4. **`backend/services/claude.md`** - Standardization guide
   - ALL services must follow these patterns
   - Gateway auth, validation, outbox events

5. **`backend/services/payment-service/`** - Reference implementation
   - Copy patterns from here (auth, validation, outbox, error handling)

---

## 🔍 Architecture Understanding

### Key Insight: Product Tagging

```
┌─────────────────────────────────────────────────────────────┐
│                    TAGGING ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────┘

User creates post with product tags:
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

When user tags a product, we save a **snapshot** of product info:
- `productName` - Name at time of tagging
- `productPrice` - Price at time of tagging
- `productImageUrl` - Image at time of tagging
- `snapshotAt` - When snapshot was taken

**Why?** If seller changes product later, old posts still show correct info from when they were created.

---

## 🎯 Your Tasks (Priority Order)

### Phase 1: Project Setup (DO FIRST!)

#### Task 1.1: Create Service Scaffold
```bash
# Create directory structure
backend/services/content-service/
├── prisma/
│   └── schema.prisma          # Copy from content-service-schema.prisma
├── src/
│   ├── clients/               # Service clients
│   │   └── product.client.ts
│   ├── controllers/
│   │   ├── post.controller.ts
│   │   ├── comment.controller.ts
│   │   └── moderation.controller.ts
│   ├── lib/
│   │   └── prisma.ts          # Local Prisma client
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── error-handler.ts
│   ├── repositories/
│   │   ├── post.repository.ts
│   │   ├── comment.repository.ts
│   │   └── hashtag.repository.ts
│   ├── routes/
│   │   ├── post.routes.ts
│   │   ├── comment.routes.ts
│   │   └── moderation.routes.ts
│   ├── services/
│   │   ├── post.service.ts
│   │   ├── comment.service.ts
│   │   ├── product-tag.service.ts
│   │   └── outbox.service.ts
│   ├── utils/
│   │   └── serviceAuth.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── .env.example
└── DOCUMENTATION.md
```

#### Task 1.2: Copy Standardization Files
```bash
# Copy these from payment-service:
src/lib/prisma.ts
src/middleware/auth.ts
src/middleware/validation.ts
src/middleware/error-handler.ts
src/utils/serviceAuth.ts
src/services/outbox.service.ts  # Then customize for content events
```

#### Task 1.3: Setup Prisma
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"  // ← Local output!
}

datasource db {
  provider = "postgresql"
  url      = env("CONTENT_DATABASE_URL")
}

// Copy models from content-service-schema.prisma
```

#### Task 1.4: Configure Environment
```env
# .env.example
PORT=3017
NODE_ENV=development

# Database
CONTENT_DATABASE_URL=postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/content_db?sslmode=require

# Security
GATEWAY_SECRET_KEY=
SERVICE_SECRET=

# Service URLs
PRODUCT_SERVICE_URL=http://localhost:3002
FEED_SERVICE_URL=http://localhost:3018
NOTIFICATION_SERVICE_URL=http://localhost:3008

# AWS S3 (for media uploads)
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=lakoo-content
```

---

### Phase 2: Core Features - Posts

#### Task 2.1: Post Repository
**File:** `src/repositories/post.repository.ts`

```typescript
class PostRepository {
  // CRUD
  async create(data: CreatePostData): Promise<Post>
  async findById(id: string): Promise<Post | null>
  async findByUserId(userId: string, options: PaginationOptions): Promise<Post[]>
  async update(id: string, data: UpdatePostData): Promise<Post>
  async softDelete(id: string): Promise<void>

  // Queries
  async findPublished(options: PaginationOptions): Promise<Post[]>
  async findByHashtag(hashtag: string, options: PaginationOptions): Promise<Post[]>
  async findWithProductTag(productId: string): Promise<Post[]>

  // Engagement
  async incrementLikeCount(id: string): Promise<void>
  async decrementLikeCount(id: string): Promise<void>
  async incrementCommentCount(id: string): Promise<void>
  async incrementViewCount(id: string): Promise<void>
}
```

#### Task 2.2: Post Service
**File:** `src/services/post.service.ts`

```typescript
class PostService {
  /**
   * Create a new post
   * 1. Validate all tagged products exist and are approved
   * 2. Upload media to S3 (or receive URLs)
   * 3. Extract hashtags from caption
   * 4. Create post with media, tags, hashtags
   * 5. Publish post.created event
   */
  async createPost(userId: string, data: CreatePostDTO): Promise<Post> {
    // 1. Validate product tags
    const validatedTags = await this.validateProductTags(data.productTags);

    // 2. Extract hashtags from caption
    const hashtags = this.extractHashtags(data.caption);

    // 3. Create post in transaction
    const post = await prisma.$transaction(async (tx) => {
      // Create post
      const post = await tx.post.create({
        data: {
          userId,
          postCode: generatePostCode(),
          caption: data.caption,
          title: data.title,
          postType: data.postType || 'standard',
          status: 'published',
          publishedAt: new Date(),
          // ... other fields
        }
      });

      // Create media
      for (const media of data.media) {
        await tx.postMedia.create({
          data: { postId: post.id, ...media }
        });
      }

      // Create product tags (with snapshots)
      for (const tag of validatedTags) {
        await tx.postProductTag.create({
          data: {
            postId: post.id,
            productId: tag.productId,
            sellerId: tag.sellerId,
            productSource: tag.sellerId ? 'seller_product' : 'warehouse_product',
            mediaIndex: tag.mediaIndex,
            positionX: tag.positionX,
            positionY: tag.positionY,
            // Snapshot from product-service
            productName: tag.productName,
            productPrice: tag.productPrice,
            productImageUrl: tag.productImageUrl,
          }
        });
      }

      // Create/link hashtags
      for (const tagName of hashtags) {
        const hashtag = await tx.hashtag.upsert({
          where: { tag: tagName.toLowerCase() },
          create: { tag: tagName.toLowerCase(), postCount: 1 },
          update: { postCount: { increment: 1 } }
        });
        await tx.postHashtag.create({
          data: { postId: post.id, hashtagId: hashtag.id }
        });
      }

      // Write to outbox
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Post',
          aggregateId: post.id,
          eventType: 'post.created',
          payload: {
            postId: post.id,
            userId,
            productIds: validatedTags.map(t => t.productId),
            hashtags
          }
        }
      });

      return post;
    });

    return post;
  }

  /**
   * Validate product tags by calling product-service
   */
  async validateProductTags(tags: ProductTagInput[]): Promise<ValidatedTag[]> {
    const validated = [];

    for (const tag of tags) {
      // Call product-service to check if product is taggable
      const product = await productClient.checkTaggable(tag.productId);

      if (!product) {
        throw new BadRequestError(`Product ${tag.productId} not found`);
      }

      if (!product.isTaggable) {
        throw new BadRequestError(`Product ${tag.productId} is not approved for tagging`);
      }

      validated.push({
        ...tag,
        sellerId: product.sellerId,
        productName: product.name,
        productPrice: product.price,
        productImageUrl: product.primaryImageUrl
      });
    }

    return validated;
  }

  /**
   * Extract hashtags from caption
   */
  extractHashtags(caption: string): string[] {
    const regex = /#(\w+)/g;
    const matches = caption.match(regex) || [];
    return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
  }
}
```

#### Task 2.3: Product Client
**File:** `src/clients/product.client.ts`

```typescript
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

export class ProductServiceClient {
  /**
   * Check if product can be tagged in posts
   * Only approved products can be tagged
   */
  async checkTaggable(productId: string): Promise<TaggableProduct | null> {
    try {
      const response = await axios.get(
        `${PRODUCT_SERVICE_URL}/api/products/${productId}/taggable`,
        {
          headers: getServiceAuthHeaders(),
          timeout: 5000
        }
      );

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error checking product taggable:', error.message);
      throw new Error('Product service unavailable');
    }
  }

  /**
   * Get multiple products for batch validation
   */
  async getProductsForTagging(productIds: string[]): Promise<TaggableProduct[]> {
    try {
      const response = await axios.post(
        `${PRODUCT_SERVICE_URL}/api/products/batch-taggable`,
        { productIds },
        {
          headers: getServiceAuthHeaders(),
          timeout: 10000
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Error batch checking products:', error.message);
      throw new Error('Product service unavailable');
    }
  }
}

export const productClient = new ProductServiceClient();
```

#### Task 2.4: Post Routes
**File:** `src/routes/post.routes.ts`

```typescript
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { gatewayAuth, gatewayOrInternalAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { postController } from '../controllers/post.controller';

const router = Router();

// ============ Public Routes (with optional auth) ============

// Get published posts (public feed)
router.get('/',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
    query('hashtag').optional().isString(),
  ],
  validateRequest,
  postController.getPosts
);

// Get single post
router.get('/:id',
  [param('id').isUUID()],
  validateRequest,
  postController.getPostById
);

// Get posts with specific product tag
router.get('/product/:productId',
  [
    param('productId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  postController.getPostsByProduct
);

// ============ Authenticated Routes ============

router.use(gatewayAuth);

// Create post
router.post('/',
  [
    body('caption').notEmpty().isLength({ min: 1, max: 5000 }),
    body('title').optional().isLength({ max: 255 }),
    body('postType').optional().isIn(['standard', 'review', 'lookbook', 'tutorial', 'unboxing']),
    body('visibility').optional().isIn(['public', 'followers_only', 'private']),
    body('media').isArray({ min: 1, max: 9 }),
    body('media.*.mediaType').isIn(['image', 'video']),
    body('media.*.mediaUrl').isURL(),
    body('media.*.thumbnailUrl').optional().isURL(),
    body('productTags').optional().isArray(),
    body('productTags.*.productId').isUUID(),
    body('productTags.*.mediaIndex').isInt({ min: 0, max: 8 }),
    body('productTags.*.positionX').optional().isFloat({ min: 0, max: 100 }),
    body('productTags.*.positionY').optional().isFloat({ min: 0, max: 100 }),
    body('locationName').optional().isLength({ max: 255 }),
  ],
  validateRequest,
  postController.createPost
);

// Get my posts
router.get('/me/posts',
  [
    query('status').optional().isIn(['draft', 'published', 'archived']),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  postController.getMyPosts
);

// Update post
router.put('/:id',
  [
    param('id').isUUID(),
    body('caption').optional().isLength({ min: 1, max: 5000 }),
    body('title').optional().isLength({ max: 255 }),
    body('visibility').optional().isIn(['public', 'followers_only', 'private']),
  ],
  validateRequest,
  postController.updatePost
);

// Delete post
router.delete('/:id',
  [param('id').isUUID()],
  validateRequest,
  postController.deletePost
);

// ============ Engagement Routes ============

// Like post
router.post('/:id/like',
  [param('id').isUUID()],
  validateRequest,
  postController.likePost
);

// Unlike post
router.delete('/:id/like',
  [param('id').isUUID()],
  validateRequest,
  postController.unlikePost
);

// Save post
router.post('/:id/save',
  [
    param('id').isUUID(),
    body('collectionId').optional().isUUID(),
  ],
  validateRequest,
  postController.savePost
);

// Unsave post
router.delete('/:id/save',
  [param('id').isUUID()],
  validateRequest,
  postController.unsavePost
);

// Record view
router.post('/:id/view',
  [param('id').isUUID()],
  validateRequest,
  postController.recordView
);

// Track product tag click
router.post('/:postId/tags/:tagId/click',
  [
    param('postId').isUUID(),
    param('tagId').isUUID(),
  ],
  validateRequest,
  postController.trackTagClick
);

export default router;
```

---

### Phase 3: Comments System

#### Task 3.1: Comment Service
**File:** `src/services/comment.service.ts`

```typescript
class CommentService {
  async createComment(userId: string, postId: string, data: CreateCommentDTO): Promise<Comment> {
    // 1. Verify post exists and is published
    const post = await postRepository.findById(postId);
    if (!post || post.status !== 'published') {
      throw new NotFoundError('Post not found');
    }

    // 2. If reply, verify parent comment exists
    if (data.parentId) {
      const parent = await commentRepository.findById(data.parentId);
      if (!parent || parent.postId !== postId) {
        throw new BadRequestError('Invalid parent comment');
      }
    }

    // 3. Extract mentions from content
    const mentions = this.extractMentions(data.content);

    // 4. Create comment in transaction
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          postId,
          userId,
          parentId: data.parentId,
          content: data.content,
          moderationStatus: 'approved' // Auto-approve comments
        }
      });

      // Create mentions
      for (const mentionedUserId of mentions) {
        await tx.commentMention.create({
          data: { commentId: comment.id, mentionedUserId }
        });
      }

      // Update counts
      await tx.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } }
      });

      if (data.parentId) {
        await tx.comment.update({
          where: { id: data.parentId },
          data: { replyCount: { increment: 1 } }
        });
      }

      // Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'Comment',
          aggregateId: comment.id,
          eventType: 'comment.created',
          payload: {
            commentId: comment.id,
            postId,
            userId,
            postAuthorId: post.userId,
            mentions,
            isReply: !!data.parentId
          }
        }
      });

      return comment;
    });
  }

  extractMentions(content: string): string[] {
    // Extract @username mentions and resolve to user IDs
    // For now, assume format @userId for simplicity
    const regex = /@([a-f0-9-]{36})/gi;
    const matches = content.match(regex) || [];
    return [...new Set(matches.map(m => m.slice(1)))];
  }
}
```

#### Task 3.2: Comment Routes
**File:** `src/routes/comment.routes.ts`

```typescript
const router = Router();

// Get comments for post
router.get('/post/:postId',
  [
    param('postId').isUUID(),
    query('parentId').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  commentController.getComments
);

// Authenticated routes
router.use(gatewayAuth);

// Create comment
router.post('/',
  [
    body('postId').isUUID(),
    body('content').notEmpty().isLength({ min: 1, max: 2000 }),
    body('parentId').optional().isUUID(),
  ],
  validateRequest,
  commentController.createComment
);

// Like comment
router.post('/:id/like',
  [param('id').isUUID()],
  validateRequest,
  commentController.likeComment
);

// Delete comment (only own comments)
router.delete('/:id',
  [param('id').isUUID()],
  validateRequest,
  commentController.deleteComment
);

export default router;
```

---

### Phase 4: Content Moderation

#### Task 4.1: Moderation Service
**File:** `src/services/moderation.service.ts`

```typescript
class ModerationService {
  /**
   * Report content (post or comment)
   */
  async reportContent(
    reporterId: string,
    contentType: 'post' | 'comment',
    contentId: string,
    reason: ReportReason,
    description?: string
  ): Promise<ContentReport> {
    // 1. Verify content exists
    if (contentType === 'post') {
      const post = await postRepository.findById(contentId);
      if (!post) throw new NotFoundError('Post not found');
    } else {
      const comment = await commentRepository.findById(contentId);
      if (!comment) throw new NotFoundError('Comment not found');
    }

    // 2. Create report
    return prisma.$transaction(async (tx) => {
      const report = await tx.contentReport.create({
        data: {
          reporterId,
          contentType,
          contentId,
          postId: contentType === 'post' ? contentId : null,
          commentId: contentType === 'comment' ? contentId : null,
          reason,
          description,
          status: 'pending'
        }
      });

      // 3. Update content report flags
      if (contentType === 'post') {
        await tx.post.update({
          where: { id: contentId },
          data: {
            isReported: true,
            reportCount: { increment: 1 }
          }
        });
      } else {
        await tx.comment.update({
          where: { id: contentId },
          data: { isReported: true }
        });
      }

      // 4. Publish event for moderation queue
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'ContentReport',
          aggregateId: report.id,
          eventType: 'content.reported',
          payload: { reportId: report.id, contentType, contentId, reason }
        }
      });

      return report;
    });
  }

  /**
   * Moderator: Review and resolve report
   */
  async resolveReport(
    reportId: string,
    moderatorId: string,
    action: ReportAction,
    resolution: string
  ): Promise<ContentReport> {
    const report = await prisma.contentReport.findUnique({
      where: { id: reportId }
    });

    if (!report) throw new NotFoundError('Report not found');
    if (report.status !== 'pending' && report.status !== 'under_review') {
      throw new BadRequestError('Report already resolved');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Take action on content
      if (action === 'content_removed') {
        if (report.contentType === 'post') {
          await tx.post.update({
            where: { id: report.contentId },
            data: { status: 'removed', moderationStatus: 'rejected' }
          });
        } else {
          await tx.comment.update({
            where: { id: report.contentId },
            data: { moderationStatus: 'rejected', deletedAt: new Date() }
          });
        }
      }

      // 2. Update report
      const updated = await tx.contentReport.update({
        where: { id: reportId },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: moderatorId,
          resolution,
          actionTaken: action
        }
      });

      // 3. Publish event
      await tx.serviceOutbox.create({
        data: {
          aggregateType: 'ContentReport',
          aggregateId: report.id,
          eventType: 'content.moderated',
          payload: { reportId, action, contentType: report.contentType, contentId: report.contentId }
        }
      });

      return updated;
    });
  }
}
```

---

### Phase 5: Hashtags & Collections

#### Task 5.1: Hashtag Service
**File:** `src/services/hashtag.service.ts`

```typescript
class HashtagService {
  /**
   * Get trending hashtags
   */
  async getTrending(limit: number = 20): Promise<Hashtag[]> {
    return prisma.hashtag.findMany({
      where: {
        isActive: true,
        isBanned: false
      },
      orderBy: { postCount: 'desc' },
      take: limit
    });
  }

  /**
   * Search hashtags
   */
  async search(query: string, limit: number = 10): Promise<Hashtag[]> {
    return prisma.hashtag.findMany({
      where: {
        tag: { startsWith: query.toLowerCase() },
        isActive: true,
        isBanned: false
      },
      orderBy: { postCount: 'desc' },
      take: limit
    });
  }

  /**
   * Get posts by hashtag
   */
  async getPostsByHashtag(hashtag: string, options: PaginationOptions) {
    const tag = await prisma.hashtag.findUnique({
      where: { tag: hashtag.toLowerCase() }
    });

    if (!tag || tag.isBanned) {
      throw new NotFoundError('Hashtag not found');
    }

    return prisma.post.findMany({
      where: {
        hashtags: { some: { hashtagId: tag.id } },
        status: 'published',
        deletedAt: null
      },
      include: {
        media: true,
        productTags: true,
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: { publishedAt: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }
}
```

#### Task 5.2: Save Collection Service
**File:** `src/services/collection.service.ts`

```typescript
class CollectionService {
  /**
   * Get user's collections
   */
  async getUserCollections(userId: string): Promise<SaveCollection[]> {
    return prisma.saveCollection.findMany({
      where: { userId },
      include: { _count: { select: { saves: true } } },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Create collection
   */
  async createCollection(userId: string, data: CreateCollectionDTO): Promise<SaveCollection> {
    return prisma.saveCollection.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate || false
      }
    });
  }

  /**
   * Save post to collection
   */
  async saveToCollection(userId: string, postId: string, collectionId?: string): Promise<PostSave> {
    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundError('Post not found');

    // If collection specified, verify it belongs to user
    if (collectionId) {
      const collection = await prisma.saveCollection.findFirst({
        where: { id: collectionId, userId }
      });
      if (!collection) throw new NotFoundError('Collection not found');
    }

    return prisma.$transaction(async (tx) => {
      const save = await tx.postSave.create({
        data: { postId, userId, collectionId }
      });

      // Update counts
      await tx.post.update({
        where: { id: postId },
        data: { saveCount: { increment: 1 } }
      });

      if (collectionId) {
        await tx.saveCollection.update({
          where: { id: collectionId },
          data: { postCount: { increment: 1 } }
        });
      }

      return save;
    });
  }
}
```

---

## 🔗 Events Published

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

## 📋 API Endpoints Summary

### Posts
```
POST   /api/posts                    - Create post
GET    /api/posts                    - Get posts (public feed)
GET    /api/posts/:id                - Get single post
GET    /api/posts/me/posts           - Get my posts
PUT    /api/posts/:id                - Update post
DELETE /api/posts/:id                - Delete post
GET    /api/posts/product/:productId - Get posts with product tag
```

### Engagement
```
POST   /api/posts/:id/like           - Like post
DELETE /api/posts/:id/like           - Unlike post
POST   /api/posts/:id/save           - Save post
DELETE /api/posts/:id/save           - Unsave post
POST   /api/posts/:id/view           - Record view
POST   /api/posts/:postId/tags/:tagId/click - Track tag click
```

### Comments
```
GET    /api/comments/post/:postId    - Get comments for post
POST   /api/comments                 - Create comment
POST   /api/comments/:id/like        - Like comment
DELETE /api/comments/:id             - Delete comment
```

### Hashtags
```
GET    /api/hashtags/trending        - Get trending hashtags
GET    /api/hashtags/search          - Search hashtags
GET    /api/hashtags/:tag/posts      - Get posts by hashtag
```

### Collections
```
GET    /api/collections              - Get my collections
POST   /api/collections              - Create collection
PUT    /api/collections/:id          - Update collection
DELETE /api/collections/:id          - Delete collection
GET    /api/collections/:id/posts    - Get posts in collection
```

### Moderation (Admin)
```
GET    /api/moderation/reports       - Get pending reports
POST   /api/moderation/reports/:id/resolve - Resolve report
POST   /api/posts/:id/report         - Report post
POST   /api/comments/:id/report      - Report comment
```

---

## 🚨 Critical Business Rules

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

## 📋 Implementation Checklist

### Setup
- [ ] Create directory structure
- [ ] Copy standardization files from payment-service
- [ ] Setup Prisma with local output
- [ ] Configure environment variables
- [ ] Push schema to Neon database

### Core Features
- [ ] Post CRUD operations
- [ ] Product tag validation (call product-service)
- [ ] Product info snapshot on tagging
- [ ] Media handling (URLs from frontend)
- [ ] Hashtag extraction and linking

### Engagement
- [ ] Like/unlike posts
- [ ] Save/unsave posts
- [ ] View counting
- [ ] Tag click tracking

### Comments
- [ ] Comment CRUD
- [ ] Nested replies
- [ ] Comment likes
- [ ] Mention extraction

### Collections
- [ ] Create/manage collections
- [ ] Save posts to collections
- [ ] Collection privacy

### Moderation
- [ ] Report content
- [ ] Moderation queue
- [ ] Resolve reports
- [ ] Content removal

### Events
- [ ] Outbox service setup
- [ ] All events published
- [ ] Event payloads documented

### Documentation
- [ ] DOCUMENTATION.md
- [ ] API documentation
- [ ] .env.example

---

## 🤝 Coordination

### With Product-Service
- You CALL product-service to validate product tags
- Need endpoint: `GET /api/products/:id/taggable`
- This endpoint should return: id, name, price, imageUrl, sellerId, isTaggable

### With Feed-Service
- You PUBLISH events for post.created, post.liked, etc.
- Feed-service consumes these to update feeds
- Feed-service may call you to get post details

### With Notification-Service
- You PUBLISH events for likes, comments, mentions
- Notification-service sends notifications to users

### With High-Level Orchestrator
- Report when core features complete
- Ask for clarification on moderation rules
- Escalate architecture questions

---

## 📞 Need Help?

1. Check `payment-service` for standardization patterns
2. Read `FUTURE_ME_PROBLEMS.md` for architecture decisions
3. Review `content-service-schema.prisma` for schema details
4. Ask high-level orchestrator for architectural guidance

---

**Remember:** You're building the SOCIAL part of social commerce. Great content drives product discovery. Make it easy for users to create engaging posts with product tags!

Good luck! 🚀
