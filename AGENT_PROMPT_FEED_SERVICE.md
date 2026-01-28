# 🤖 AI Agent Prompt: Feed-Service Implementation

**Your Role:** Feed Service Lead Developer
**Service:** `feed-service` (Port 3018)
**Database:** `feed_db` (Neon PostgreSQL)
**Language:** TypeScript (Node.js)
**Status:** NEW SERVICE - Build from scratch

---

## 🎯 Your Mission

You are responsible for building the **feed-service** - the discovery engine of LAKOO's social commerce platform. This service manages:

1. **Social Graph** - Who follows whom
2. **Feed Generation** - Personalized content feeds
3. **Trending Content** - What's popular right now
4. **User Interests** - Learning user preferences
5. **Content Ranking** - Algorithmic content scoring

**CRITICAL:** This service determines what users see. Good recommendations = more engagement = more sales.

---

## 📚 Required Reading (IN ORDER)

Before you start, read these files to understand the context:

1. **`LAKOO_BUSINESS_MODEL.md`** - Business model
   - Focus on "Social Commerce" and "Discovery" sections
   - Understand how users discover products through content

2. **`feed-service-schema.prisma`** (root level) - Target schema
   - Study UserFollow, FeedItem, UserInterest, TrendingContent models
   - Understand the pre-computed feed pattern

3. **`FUTURE_ME_PROBLEMS.md`** - Critical architecture decisions
   - Read feed-service section
   - Understand integration with content-service

4. **`backend/services/claude.md`** - Standardization guide
   - ALL services must follow these patterns

5. **`backend/services/payment-service/`** - Reference implementation
   - Copy patterns from here

---

## 🔍 Architecture Understanding

### Feed Generation Approaches

**Option A: Fan-out on Write (We use this for following feed)**
```
When Alice posts:
1. Get all Alice's followers
2. Write FeedItem to each follower's feed
3. Followers see post immediately when loading feed

Pros: Fast reads
Cons: Slow writes for users with many followers
```

**Option B: Fan-out on Read (We use this for explore/trending)**
```
When Bob loads explore feed:
1. Query trending posts in real-time
2. Filter by Bob's interests
3. Rank and return results

Pros: Always fresh
Cons: Slower reads, more complex queries
```

**Our Hybrid Approach:**
```
┌─────────────────────────────────────────────────────────────┐
│                    FEED ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────┘

User Opens App
      │
      ├─► "Following" Tab (Fan-out on Write)
      │   └─► Read from pre-computed FeedItem table
      │       └─► Fast! Already computed.
      │
      ├─► "Explore" Tab (Fan-out on Read)
      │   └─► Query trending + personalized mix
      │       └─► TrendingContent + UserInterest scoring
      │
      └─► "For You" Tab (Hybrid)
          └─► Mix of following + suggested + trending
              └─► Personalized ranking algorithm
```

---

## 🎯 Your Tasks (Priority Order)

### Phase 1: Project Setup (DO FIRST!)

#### Task 1.1: Create Service Scaffold
```bash
backend/services/feed-service/
├── prisma/
│   └── schema.prisma          # Copy from feed-service-schema.prisma
├── src/
│   ├── clients/
│   │   └── content.client.ts  # Get post details
│   ├── controllers/
│   │   ├── feed.controller.ts
│   │   ├── follow.controller.ts
│   │   └── trending.controller.ts
│   ├── lib/
│   │   └── prisma.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── error-handler.ts
│   ├── repositories/
│   │   ├── follow.repository.ts
│   │   ├── feed.repository.ts
│   │   ├── interest.repository.ts
│   │   └── trending.repository.ts
│   ├── routes/
│   │   ├── feed.routes.ts
│   │   ├── follow.routes.ts
│   │   └── trending.routes.ts
│   ├── services/
│   │   ├── feed.service.ts
│   │   ├── follow.service.ts
│   │   ├── interest.service.ts
│   │   ├── trending.service.ts
│   │   ├── ranking.service.ts
│   │   └── outbox.service.ts
│   ├── jobs/                  # Background jobs
│   │   ├── trending.job.ts    # Compute trending
│   │   ├── feed-fanout.job.ts # Fan out new posts
│   │   └── cleanup.job.ts     # Clean old feed items
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
# Copy from payment-service:
src/lib/prisma.ts
src/middleware/auth.ts
src/middleware/validation.ts
src/middleware/error-handler.ts
src/utils/serviceAuth.ts
src/services/outbox.service.ts
```

#### Task 1.3: Setup Prisma
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("FEED_DATABASE_URL")
}

// Copy models from feed-service-schema.prisma
```

#### Task 1.4: Configure Environment
```env
# .env.example
PORT=3018
NODE_ENV=development

# Database
FEED_DATABASE_URL=postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/feed_db?sslmode=require

# Security
GATEWAY_SECRET_KEY=
SERVICE_SECRET=

# Service URLs
CONTENT_SERVICE_URL=http://localhost:3017
PRODUCT_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3008

# Feed Config
FEED_PAGE_SIZE=20
FEED_MAX_AGE_DAYS=30
TRENDING_WINDOW_HOURS=24
```

---

### Phase 2: Social Graph - Follow System

#### Task 2.1: Follow Repository
**File:** `src/repositories/follow.repository.ts`

```typescript
class FollowRepository {
  async follow(followerId: string, followingId: string): Promise<UserFollow> {
    return prisma.$transaction(async (tx) => {
      // Create follow relationship
      const follow = await tx.userFollow.create({
        data: { followerId, followingId, status: 'active' }
      });

      // Update follower stats
      await tx.userFollowStats.upsert({
        where: { userId: followerId },
        create: { userId: followerId, followingCount: 1 },
        update: { followingCount: { increment: 1 } }
      });

      // Update following stats
      await tx.userFollowStats.upsert({
        where: { userId: followingId },
        create: { userId: followingId, followerCount: 1 },
        update: { followerCount: { increment: 1 } }
      });

      return follow;
    });
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    return prisma.$transaction(async (tx) => {
      await tx.userFollow.update({
        where: { followerId_followingId: { followerId, followingId } },
        data: { status: 'unfollowed', unfollowedAt: new Date() }
      });

      await tx.userFollowStats.update({
        where: { userId: followerId },
        data: { followingCount: { decrement: 1 } }
      });

      await tx.userFollowStats.update({
        where: { userId: followingId },
        data: { followerCount: { decrement: 1 } }
      });
    });
  }

  async getFollowers(userId: string, options: PaginationOptions): Promise<UserFollow[]> {
    return prisma.userFollow.findMany({
      where: { followingId: userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }

  async getFollowing(userId: string, options: PaginationOptions): Promise<UserFollow[]> {
    return prisma.userFollow.findMany({
      where: { followerId: userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } }
    });
    return follow?.status === 'active';
  }

  async getFollowerIds(userId: string): Promise<string[]> {
    const follows = await prisma.userFollow.findMany({
      where: { followingId: userId, status: 'active' },
      select: { followerId: true }
    });
    return follows.map(f => f.followerId);
  }
}
```

#### Task 2.2: Follow Service
**File:** `src/services/follow.service.ts`

```typescript
class FollowService {
  async follow(followerId: string, followingId: string): Promise<UserFollow> {
    // Can't follow yourself
    if (followerId === followingId) {
      throw new BadRequestError('Cannot follow yourself');
    }

    // Check if already following
    const existing = await followRepository.isFollowing(followerId, followingId);
    if (existing) {
      throw new BadRequestError('Already following this user');
    }

    // Check if blocked
    const blocked = await this.isBlocked(followerId, followingId);
    if (blocked) {
      throw new ForbiddenError('Cannot follow this user');
    }

    // Create follow
    const follow = await followRepository.follow(followerId, followingId);

    // Publish event
    await outboxService.publish('UserFollow', follow.id, 'user.followed', {
      followerId,
      followingId
    });

    return follow;
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const existing = await followRepository.isFollowing(followerId, followingId);
    if (!existing) {
      throw new BadRequestError('Not following this user');
    }

    await followRepository.unfollow(followerId, followingId);

    await outboxService.publish('UserFollow', `${followerId}-${followingId}`, 'user.unfollowed', {
      followerId,
      followingId
    });
  }

  async getStats(userId: string): Promise<UserFollowStats> {
    const stats = await prisma.userFollowStats.findUnique({
      where: { userId }
    });

    return stats || { userId, followerCount: 0, followingCount: 0 };
  }

  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 }
        ]
      }
    });
    return !!block;
  }
}
```

#### Task 2.3: Follow Routes
**File:** `src/routes/follow.routes.ts`

```typescript
const router = Router();

// Get follow stats (public)
router.get('/users/:userId/stats',
  [param('userId').isUUID()],
  validateRequest,
  followController.getStats
);

// Get followers list
router.get('/users/:userId/followers',
  [
    param('userId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  followController.getFollowers
);

// Get following list
router.get('/users/:userId/following',
  [
    param('userId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  followController.getFollowing
);

// Authenticated routes
router.use(gatewayAuth);

// Follow user
router.post('/users/:userId/follow',
  [param('userId').isUUID()],
  validateRequest,
  followController.follow
);

// Unfollow user
router.delete('/users/:userId/follow',
  [param('userId').isUUID()],
  validateRequest,
  followController.unfollow
);

// Check if following
router.get('/users/:userId/is-following',
  [param('userId').isUUID()],
  validateRequest,
  followController.isFollowing
);

// Block user
router.post('/users/:userId/block',
  [param('userId').isUUID()],
  validateRequest,
  followController.blockUser
);

// Unblock user
router.delete('/users/:userId/block',
  [param('userId').isUUID()],
  validateRequest,
  followController.unblockUser
);

// Mute user
router.post('/users/:userId/mute',
  [
    param('userId').isUUID(),
    body('mutePosts').optional().isBoolean(),
    body('muteComments').optional().isBoolean(),
    body('duration').optional().isIn(['1h', '24h', '7d', '30d', 'forever']),
  ],
  validateRequest,
  followController.muteUser
);

export default router;
```

---

### Phase 3: Feed Generation

#### Task 3.1: Feed Repository
**File:** `src/repositories/feed.repository.ts`

```typescript
class FeedRepository {
  /**
   * Get user's following feed (pre-computed)
   */
  async getFollowingFeed(userId: string, options: PaginationOptions): Promise<FeedItem[]> {
    return prisma.feedItem.findMany({
      where: {
        userId,
        feedType: 'following',
        expiresAt: { gt: new Date() }
      },
      orderBy: { postCreatedAt: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }

  /**
   * Add item to user's feed
   */
  async addToFeed(data: {
    userId: string;
    postId: string;
    authorId: string;
    feedType: FeedType;
    postCreatedAt: Date;
    reasons: string[];
    relevanceScore?: number;
  }): Promise<FeedItem> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expire after 30 days

    return prisma.feedItem.upsert({
      where: {
        userId_postId_feedType: {
          userId: data.userId,
          postId: data.postId,
          feedType: data.feedType
        }
      },
      create: { ...data, expiresAt },
      update: { relevanceScore: data.relevanceScore, reasons: data.reasons }
    });
  }

  /**
   * Fan out post to all followers
   */
  async fanOutToFollowers(
    authorId: string,
    postId: string,
    postCreatedAt: Date
  ): Promise<number> {
    // Get all followers
    const followers = await prisma.userFollow.findMany({
      where: { followingId: authorId, status: 'active' },
      select: { followerId: true }
    });

    if (followers.length === 0) return 0;

    // Batch insert feed items
    const feedItems = followers.map(f => ({
      userId: f.followerId,
      postId,
      authorId,
      feedType: 'following' as const,
      postCreatedAt,
      reasons: ['following'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }));

    // Use createMany for batch insert
    await prisma.feedItem.createMany({
      data: feedItems,
      skipDuplicates: true
    });

    return followers.length;
  }

  /**
   * Remove post from all feeds (when deleted)
   */
  async removeFromAllFeeds(postId: string): Promise<void> {
    await prisma.feedItem.deleteMany({
      where: { postId }
    });
  }

  /**
   * Clean up expired feed items
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.feedItem.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    return result.count;
  }
}
```

#### Task 3.2: Feed Service
**File:** `src/services/feed.service.ts`

```typescript
class FeedService {
  /**
   * Get user's personalized feed
   * Combines: following + suggested + trending
   */
  async getForYouFeed(userId: string, options: PaginationOptions): Promise<FeedPost[]> {
    // 1. Get following feed items
    const followingItems = await feedRepository.getFollowingFeed(userId, {
      limit: Math.floor(options.limit * 0.6), // 60% from following
      offset: 0
    });

    // 2. Get suggested posts based on interests
    const suggestedPosts = await this.getSuggestedPosts(userId, {
      limit: Math.floor(options.limit * 0.3), // 30% suggested
      offset: 0
    });

    // 3. Get trending posts
    const trendingPosts = await trendingService.getTrendingPosts({
      limit: Math.floor(options.limit * 0.1), // 10% trending
      offset: 0
    });

    // 4. Merge and deduplicate
    const postIds = new Set<string>();
    const merged: FeedPost[] = [];

    for (const item of followingItems) {
      if (!postIds.has(item.postId)) {
        postIds.add(item.postId);
        merged.push({ postId: item.postId, reasons: item.reasons, score: item.relevanceScore });
      }
    }

    for (const post of suggestedPosts) {
      if (!postIds.has(post.postId)) {
        postIds.add(post.postId);
        merged.push({ postId: post.postId, reasons: ['suggested'], score: post.score });
      }
    }

    for (const post of trendingPosts) {
      if (!postIds.has(post.contentId)) {
        postIds.add(post.contentId);
        merged.push({ postId: post.contentId, reasons: ['trending'], score: post.score });
      }
    }

    // 5. Get blocked/muted users to filter
    const blockedUsers = await this.getBlockedAndMutedUsers(userId);

    // 6. Fetch post details from content-service
    const posts = await contentClient.getPosts(
      merged.map(m => m.postId).filter(id => !blockedUsers.has(id))
    );

    // 7. Rank and return
    return this.rankPosts(posts, merged, userId);
  }

  /**
   * Get following-only feed
   */
  async getFollowingFeed(userId: string, options: PaginationOptions): Promise<FeedPost[]> {
    const feedItems = await feedRepository.getFollowingFeed(userId, options);

    if (feedItems.length === 0) return [];

    // Fetch post details from content-service
    const posts = await contentClient.getPosts(feedItems.map(f => f.postId));

    return posts.map(post => ({
      ...post,
      reasons: feedItems.find(f => f.postId === post.id)?.reasons || ['following']
    }));
  }

  /**
   * Get suggested posts based on user interests
   */
  async getSuggestedPosts(userId: string, options: PaginationOptions): Promise<SuggestedPost[]> {
    // 1. Get user interests
    const interests = await interestService.getUserInterests(userId);

    if (interests.length === 0) {
      // No interests yet, return trending
      return trendingService.getTrendingPosts(options);
    }

    // 2. Build query based on interests
    // This would typically be a more complex recommendation query
    const categoryInterests = interests.filter(i => i.interestType === 'category');
    const hashtagInterests = interests.filter(i => i.interestType === 'hashtag');
    const sellerInterests = interests.filter(i => i.interestType === 'seller');

    // 3. Query content-service for matching posts
    const posts = await contentClient.searchPosts({
      categories: categoryInterests.map(i => i.interestValue),
      hashtags: hashtagInterests.map(i => i.interestValue),
      sellerIds: sellerInterests.map(i => i.interestValue),
      limit: options.limit,
      excludeAuthorIds: [userId] // Don't suggest own posts
    });

    return posts.map(p => ({
      postId: p.id,
      score: this.calculateRelevanceScore(p, interests)
    }));
  }

  /**
   * Calculate relevance score for a post
   */
  calculateRelevanceScore(post: any, interests: UserInterest[]): number {
    let score = 0;

    // Base score from engagement
    score += Math.log10(post.likeCount + 1) * 10;
    score += Math.log10(post.commentCount + 1) * 15;
    score += Math.log10(post.saveCount + 1) * 20;

    // Recency boost (newer = higher)
    const ageHours = (Date.now() - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 100 - ageHours); // Max 100 points for brand new

    // Interest matching
    for (const interest of interests) {
      if (interest.interestType === 'category' && post.categoryId === interest.interestValue) {
        score += interest.score * 50;
      }
      if (interest.interestType === 'hashtag' && post.hashtags?.includes(interest.interestValue)) {
        score += interest.score * 30;
      }
      if (interest.interestType === 'seller' && post.sellerId === interest.interestValue) {
        score += interest.score * 40;
      }
    }

    return score;
  }

  /**
   * Rank posts using combined signals
   */
  rankPosts(posts: Post[], feedItems: FeedPost[], userId: string): FeedPost[] {
    // Simple ranking: sort by score descending
    // In production: use ML model for personalized ranking
    return posts
      .map(post => {
        const feedItem = feedItems.find(f => f.postId === post.id);
        return {
          ...post,
          reasons: feedItem?.reasons || [],
          score: feedItem?.score || 0
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  async getBlockedAndMutedUsers(userId: string): Promise<Set<string>> {
    const [blocked, muted] = await Promise.all([
      prisma.userBlock.findMany({
        where: { blockerId: userId },
        select: { blockedId: true }
      }),
      prisma.userMute.findMany({
        where: { muterId: userId, mutePosts: true },
        select: { mutedId: true }
      })
    ]);

    return new Set([
      ...blocked.map(b => b.blockedId),
      ...muted.map(m => m.mutedId)
    ]);
  }
}
```

#### Task 3.3: Feed Routes
**File:** `src/routes/feed.routes.ts`

```typescript
const router = Router();

router.use(gatewayAuth);

// Get personalized "For You" feed
router.get('/for-you',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  feedController.getForYouFeed
);

// Get following-only feed
router.get('/following',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  feedController.getFollowingFeed
);

// Get explore/discover feed (trending + suggested)
router.get('/explore',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('category').optional().isUUID(),
  ],
  validateRequest,
  feedController.getExploreFeed
);

// Refresh feed (clear cache, rebuild)
router.post('/refresh',
  feedController.refreshFeed
);

export default router;
```

---

### Phase 4: User Interests & Interactions

#### Task 4.1: Interest Service
**File:** `src/services/interest.service.ts`

```typescript
class InterestService {
  /**
   * Record user interaction and update interests
   */
  async recordInteraction(
    userId: string,
    contentType: string,
    contentId: string,
    interactionType: InteractionType,
    metadata?: any
  ): Promise<void> {
    // 1. Log the interaction
    await prisma.userInteraction.create({
      data: {
        userId,
        contentType,
        contentId,
        interactionType,
        durationSec: metadata?.durationSec,
        source: metadata?.source,
        metadata
      }
    });

    // 2. Update interests based on interaction
    await this.updateInterestsFromInteraction(userId, contentType, contentId, interactionType);
  }

  /**
   * Update user interests based on interaction
   */
  async updateInterestsFromInteraction(
    userId: string,
    contentType: string,
    contentId: string,
    interactionType: InteractionType
  ): Promise<void> {
    // Weight different interaction types
    const weights: Record<InteractionType, number> = {
      view: 0.1,
      dwell: 0.2,  // Spent time viewing
      like: 0.5,
      comment: 0.7,
      save: 0.8,
      share: 0.9,
      click_product: 0.6,
      purchase: 1.0,
      follow: 0.7
    };

    const weight = weights[interactionType] || 0.1;

    if (contentType === 'post') {
      // Get post details to extract interests
      const post = await contentClient.getPost(contentId);
      if (!post) return;

      // Update category interest
      if (post.categoryId) {
        await this.updateInterest(userId, 'category', post.categoryId, weight);
      }

      // Update hashtag interests
      for (const hashtag of post.hashtags || []) {
        await this.updateInterest(userId, 'hashtag', hashtag, weight * 0.5);
      }

      // Update seller interest (if post has product tags)
      for (const tag of post.productTags || []) {
        if (tag.sellerId) {
          await this.updateInterest(userId, 'seller', tag.sellerId, weight * 0.3);
        }
      }
    }

    if (contentType === 'product') {
      // Direct product interaction
      const product = await productClient.getProduct(contentId);
      if (!product) return;

      await this.updateInterest(userId, 'category', product.categoryId, weight);
      if (product.sellerId) {
        await this.updateInterest(userId, 'seller', product.sellerId, weight);
      }
    }
  }

  /**
   * Update or create interest record
   */
  async updateInterest(
    userId: string,
    interestType: InterestType,
    interestValue: string,
    scoreIncrement: number
  ): Promise<void> {
    await prisma.userInterest.upsert({
      where: {
        userId_interestType_interestValue: {
          userId,
          interestType,
          interestValue
        }
      },
      create: {
        userId,
        interestType,
        interestValue,
        score: scoreIncrement,
        interactionCount: 1,
        lastInteractionAt: new Date()
      },
      update: {
        // Decay old score + add new (simple exponential decay)
        score: {
          // In production: use SQL expression for decay
          increment: scoreIncrement
        },
        interactionCount: { increment: 1 },
        lastInteractionAt: new Date()
      }
    });
  }

  /**
   * Get user's top interests
   */
  async getUserInterests(userId: string, limit: number = 20): Promise<UserInterest[]> {
    return prisma.userInterest.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
      take: limit
    });
  }

  /**
   * Decay all interest scores (run periodically)
   * Older interests become less relevant
   */
  async decayInterests(): Promise<void> {
    // Decay by 10% for interests not updated in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await prisma.$executeRaw`
      UPDATE user_interest
      SET score = score * 0.9
      WHERE last_interaction_at < ${sevenDaysAgo}
    `;
  }
}
```

---

### Phase 5: Trending Content

#### Task 5.1: Trending Service
**File:** `src/services/trending.service.ts`

```typescript
class TrendingService {
  /**
   * Get trending posts
   */
  async getTrendingPosts(options: PaginationOptions): Promise<TrendingContent[]> {
    return prisma.trendingContent.findMany({
      where: {
        contentType: 'post',
        windowType: 'daily',
        windowEnd: { gt: new Date() }
      },
      orderBy: { score: 'desc' },
      skip: options.offset,
      take: options.limit
    });
  }

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags(limit: number = 20): Promise<TrendingHashtag[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.trendingHashtag.findMany({
      where: {
        windowType: 'daily',
        windowDate: today
      },
      orderBy: { rank: 'asc' },
      take: limit
    });
  }

  /**
   * Compute trending content (run as background job)
   */
  async computeTrending(windowType: TrendingWindow = 'daily'): Promise<void> {
    const now = new Date();
    let windowStart: Date;

    switch (windowType) {
      case 'hourly':
        windowStart = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // 1. Get engagement data from content-service
    const engagementData = await contentClient.getEngagementStats(windowStart, now);

    // 2. Calculate trending scores
    const scores = engagementData.map(item => ({
      contentType: 'post',
      contentId: item.postId,
      score: this.calculateTrendingScore(item),
      windowType,
      windowStart,
      windowEnd: now,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      shareCount: item.shareCount
    }));

    // 3. Sort and rank
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((item, index) => {
      item.rank = index + 1;
    });

    // 4. Upsert trending content
    for (const item of scores.slice(0, 100)) { // Top 100
      await prisma.trendingContent.upsert({
        where: {
          contentType_contentId_windowType_windowStart: {
            contentType: item.contentType,
            contentId: item.contentId,
            windowType: item.windowType,
            windowStart: item.windowStart
          }
        },
        create: item,
        update: {
          score: item.score,
          rank: item.rank,
          viewCount: item.viewCount,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          shareCount: item.shareCount
        }
      });
    }

    console.log(`Computed ${windowType} trending: ${scores.length} items`);
  }

  /**
   * Calculate trending score using engagement velocity
   */
  calculateTrendingScore(item: EngagementData): number {
    // Weighted engagement
    const engagement =
      item.viewCount * 1 +
      item.likeCount * 5 +
      item.commentCount * 10 +
      item.shareCount * 15 +
      item.saveCount * 8;

    // Time decay (newer content gets boost)
    const ageHours = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
    const timeFactor = Math.pow(0.95, ageHours / 24); // Decay by 5% per day

    // Velocity (engagement per hour)
    const velocity = engagement / Math.max(1, ageHours);

    // Final score
    return (engagement * 0.4 + velocity * 100 * 0.6) * timeFactor;
  }

  /**
   * Compute trending hashtags
   */
  async computeTrendingHashtags(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get hashtag usage in last 24 hours from content-service
    const hashtagStats = await contentClient.getHashtagStats();

    // Calculate scores and rank
    const scored = hashtagStats
      .map(h => ({
        hashtag: h.tag,
        score: h.postCount * 10 + h.recentPostCount * 50, // Boost recent usage
        postCount: h.postCount
      }))
      .sort((a, b) => b.score - a.score);

    // Upsert trending hashtags
    for (let i = 0; i < Math.min(scored.length, 50); i++) {
      const item = scored[i];
      await prisma.trendingHashtag.upsert({
        where: {
          hashtag_windowType_windowDate: {
            hashtag: item.hashtag,
            windowType: 'daily',
            windowDate: today
          }
        },
        create: {
          hashtag: item.hashtag,
          score: item.score,
          postCount: item.postCount,
          windowType: 'daily',
          windowDate: today,
          rank: i + 1
        },
        update: {
          score: item.score,
          postCount: item.postCount,
          rank: i + 1
        }
      });
    }
  }
}
```

#### Task 5.2: Trending Routes
**File:** `src/routes/trending.routes.ts`

```typescript
const router = Router();

// Get trending posts (public)
router.get('/posts',
  [
    query('window').optional().isIn(['hourly', 'daily', 'weekly']),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  trendingController.getTrendingPosts
);

// Get trending hashtags (public)
router.get('/hashtags',
  [query('limit').optional().isInt({ min: 1, max: 50 })],
  validateRequest,
  trendingController.getTrendingHashtags
);

// Get trending products (posts with most product tag clicks)
router.get('/products',
  [query('limit').optional().isInt({ min: 1, max: 50 })],
  validateRequest,
  trendingController.getTrendingProducts
);

export default router;
```

---

### Phase 6: Background Jobs

#### Task 6.1: Feed Fanout Job
**File:** `src/jobs/feed-fanout.job.ts`

```typescript
/**
 * Fan out new posts to followers' feeds
 * Triggered by: post.created event from content-service
 */
export async function handlePostCreated(event: PostCreatedEvent): Promise<void> {
  const { postId, userId, publishedAt } = event.payload;

  console.log(`Fanning out post ${postId} from user ${userId}`);

  const count = await feedRepository.fanOutToFollowers(
    userId,
    postId,
    new Date(publishedAt)
  );

  console.log(`Fanned out to ${count} followers`);
}

/**
 * Remove deleted posts from all feeds
 * Triggered by: post.deleted event from content-service
 */
export async function handlePostDeleted(event: PostDeletedEvent): Promise<void> {
  const { postId } = event.payload;

  await feedRepository.removeFromAllFeeds(postId);

  console.log(`Removed post ${postId} from all feeds`);
}
```

#### Task 6.2: Trending Computation Job
**File:** `src/jobs/trending.job.ts`

```typescript
import cron from 'node-cron';

/**
 * Compute trending content periodically
 */
export function startTrendingJobs(): void {
  // Compute hourly trending every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Computing hourly trending...');
    await trendingService.computeTrending('hourly');
  });

  // Compute daily trending every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Computing daily trending...');
    await trendingService.computeTrending('daily');
    await trendingService.computeTrendingHashtags();
  });

  // Compute weekly trending once a day
  cron.schedule('0 0 * * *', async () => {
    console.log('Computing weekly trending...');
    await trendingService.computeTrending('weekly');
  });

  console.log('Trending jobs scheduled');
}
```

#### Task 6.3: Cleanup Job
**File:** `src/jobs/cleanup.job.ts`

```typescript
import cron from 'node-cron';

/**
 * Clean up expired data
 */
export function startCleanupJobs(): void {
  // Clean expired feed items daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('Cleaning up expired feed items...');
    const count = await feedRepository.cleanupExpired();
    console.log(`Cleaned up ${count} expired feed items`);
  });

  // Decay interest scores weekly
  cron.schedule('0 4 * * 0', async () => {
    console.log('Decaying interest scores...');
    await interestService.decayInterests();
  });

  // Clean old interactions (keep 90 days)
  cron.schedule('0 5 * * 0', async () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await prisma.userInteraction.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } }
    });

    console.log(`Cleaned up ${result.count} old interactions`);
  });

  console.log('Cleanup jobs scheduled');
}
```

---

## 🔗 Events

### Events Published

| Event | When | Payload | Who Consumes |
|-------|------|---------|--------------|
| `user.followed` | User follows another | followerId, followingId | notification-service |
| `user.unfollowed` | User unfollows | followerId, followingId | - |
| `user.blocked` | User blocks another | blockerId, blockedId | - |
| `feed.refreshed` | Feed cache refreshed | userId | - |

### Events Consumed

| Event | From | Action |
|-------|------|--------|
| `post.created` | content-service | Fan out to followers' feeds |
| `post.deleted` | content-service | Remove from all feeds |
| `post.liked` | content-service | Update interest scores |
| `post.saved` | content-service | Update interest scores |
| `post.viewed` | content-service | Update interest scores |
| `product_tag.clicked` | content-service | Update interest scores |

---

## 📋 API Endpoints Summary

### Feed
```
GET    /api/feed/for-you             - Personalized feed
GET    /api/feed/following           - Following-only feed
GET    /api/feed/explore             - Explore/discover feed
POST   /api/feed/refresh             - Refresh user's feed
```

### Follow
```
GET    /api/follow/users/:id/stats       - Get follower/following counts
GET    /api/follow/users/:id/followers   - Get followers list
GET    /api/follow/users/:id/following   - Get following list
POST   /api/follow/users/:id/follow      - Follow user
DELETE /api/follow/users/:id/follow      - Unfollow user
GET    /api/follow/users/:id/is-following - Check if following
POST   /api/follow/users/:id/block       - Block user
DELETE /api/follow/users/:id/block       - Unblock user
POST   /api/follow/users/:id/mute        - Mute user
DELETE /api/follow/users/:id/mute        - Unmute user
```

### Trending
```
GET    /api/trending/posts           - Trending posts
GET    /api/trending/hashtags        - Trending hashtags
GET    /api/trending/products        - Trending products
```

### Interactions (Internal)
```
POST   /api/interactions             - Record user interaction
```

---

## 🚨 Critical Business Rules

### Rule 1: Feed Freshness
```typescript
// Always return recent content
// Don't show posts older than 30 days in main feed
// Trending should prioritize last 24 hours

where: {
  postCreatedAt: { gt: thirtyDaysAgo }
}
```

### Rule 2: Block/Mute Filtering
```typescript
// NEVER show content from blocked users
// NEVER show content from muted users (in posts, optionally in comments)
// Check BOTH directions (if A blocks B, neither sees the other)

const blocked = await getBlockedAndMutedUsers(userId);
posts = posts.filter(p => !blocked.has(p.authorId));
```

### Rule 3: Privacy Respect
```typescript
// Only show public posts in explore/trending
// Followers-only posts only visible to approved followers
// Private posts never in feeds (only on profile)

where: {
  visibility: 'public',
  status: 'published'
}
```

### Rule 4: Fair Ranking
```typescript
// Mix content from various sources
// Don't let one user dominate the feed
// Ensure diversity of sellers/categories

// Limit posts per author
const maxPerAuthor = 3;
const authorCounts = new Map();
posts = posts.filter(p => {
  const count = authorCounts.get(p.authorId) || 0;
  if (count >= maxPerAuthor) return false;
  authorCounts.set(p.authorId, count + 1);
  return true;
});
```

---

## 📋 Implementation Checklist

### Setup
- [ ] Create directory structure
- [ ] Copy standardization files
- [ ] Setup Prisma
- [ ] Configure environment
- [ ] Push schema to Neon

### Social Graph
- [ ] Follow/unfollow
- [ ] Follower/following lists
- [ ] Follow stats
- [ ] Block users
- [ ] Mute users

### Feed Generation
- [ ] Following feed (fan-out on write)
- [ ] Explore feed (on-demand)
- [ ] For You feed (hybrid)
- [ ] Feed ranking algorithm

### User Interests
- [ ] Record interactions
- [ ] Update interest scores
- [ ] Interest-based recommendations
- [ ] Score decay

### Trending
- [ ] Trending posts computation
- [ ] Trending hashtags
- [ ] Time-windowed scoring

### Background Jobs
- [ ] Feed fanout job
- [ ] Trending computation cron
- [ ] Cleanup expired data

### Events
- [ ] Outbox service
- [ ] Event consumption setup
- [ ] All events documented

---

## 🤝 Coordination

### With Content-Service
- You CONSUME events: post.created, post.deleted, post.liked, etc.
- You CALL content-service to get post details
- Content-service CALLS you to check follow status (for followers-only posts)

### With Notification-Service
- You PUBLISH user.followed events
- Notification-service sends "X followed you" notifications

### With High-Level Orchestrator
- Report when feed generation works
- Ask about ranking algorithm priorities
- Escalate performance concerns

---

## 📞 Need Help?

1. Check `payment-service` for standardization
2. Read `FUTURE_ME_PROBLEMS.md` for architecture
3. Review `feed-service-schema.prisma` for schema
4. Ask high-level orchestrator for guidance

---

**Remember:** You're building the discovery engine. Good recommendations = users find products they love = more sales. Focus on relevance and freshness!

Good luck! 🚀
