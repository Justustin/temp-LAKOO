# Feed-Service Documentation

**Service:** feed-service  
**Port:** 3018  
**Database:** feed_db (Neon PostgreSQL)  
**Language:** TypeScript (Node.js)  
**Status:** ✅ Implemented

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Business Logic](#business-logic)
6. [Events](#events)
7. [Background Jobs](#background-jobs)
8. [Setup & Configuration](#setup--configuration)
9. [Integration Guide](#integration-guide)

---

## Overview

The Feed-Service is the discovery engine of LAKOO's social commerce platform. It manages:

- **Social Graph** - Follow relationships, blocks, mutes
- **Feed Generation** - Personalized content feeds (following, explore, for-you)
- **User Interests** - Learning user preferences from interactions
- **Trending Content** - Computing and serving trending posts and hashtags
- **Content Ranking** - Algorithmic scoring and ranking

**Key Features:**
- Hybrid feed generation (fan-out on write + fan-out on read)
- Real-time interest profiling based on user interactions
- Multi-window trending computation (hourly, daily, weekly, monthly)
- Block/mute filtering for privacy and safety
- Personalized content recommendations

---

## Architecture

### Feed Generation Approach

We use a **hybrid approach** combining two strategies:

#### 1. Fan-out on Write (Following Feed)
When a user posts:
1. Get all their followers
2. Write FeedItem to each follower's feed table
3. Followers see post immediately when loading feed

**Pros:** Fast reads  
**Cons:** Slow writes for users with many followers

#### 2. Fan-out on Read (Explore/Trending)
When user loads explore feed:
1. Query trending posts in real-time
2. Filter by user's interests
3. Rank and return results

**Pros:** Always fresh  
**Cons:** Slower reads, more complex queries

### Feed Architecture Diagram

```
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

## Database Schema

### Core Tables

**UserFollow**
- Tracks follow relationships
- Fields: followerId, followingId, status, createdAt, unfollowedAt
- Supports follow/unfollow with status tracking

**UserFollowStats**
- Denormalized follower/following counts
- Fast stats retrieval
- Fields: userId, followerCount, followingCount, version

**FeedItem**
- Pre-computed feed items for fast retrieval
- Fields: userId, postId, authorId, feedType, relevanceScore, reasons, postCreatedAt, expiresAt
- Unique index: (userId, postId, feedType)

**UserInterest**
- User interest profile
- Fields: userId, interestType, interestValue, score, interactionCount, lastInteractionAt
- Types: category, hashtag, seller, brand, style, price_range

**UserInteraction**
- Interaction log for building interests
- Fields: userId, contentType, contentId, interactionType, durationSec, source, metadata
- Types: view, like, comment, save, share, click_product, purchase, follow, dwell

**TrendingContent**
- Computed trending posts
- Fields: contentType, contentId, score, windowType, windowStart, windowEnd, viewCount, likeCount, commentCount, shareCount, rank
- Windows: hourly, daily, weekly, monthly

**TrendingHashtag**
- Trending hashtags by day
- Fields: hashtag, score, postCount, windowType, windowDate, rank

**UserBlock**
- Blocked users
- Fields: blockerId, blockedId, reason, createdAt

**UserMute**
- Muted users (softer than block)
- Fields: muterId, mutedId, mutePosts, muteComments, expiresAt, createdAt

---

## API Endpoints

### Feed Endpoints

#### GET `/api/feed/for-you`
Get personalized "For You" feed (hybrid: following + suggested + trending)

**Auth:** Required  
**Query Params:**
- `limit` (optional, default: 20, max: 50)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "userId": "uuid",
        "caption": "...",
        "images": [...],
        "productTags": [...],
        "hashtags": ["fashion", "ootd"],
        "likeCount": 120,
        "commentCount": 15,
        "reasons": ["following", "trending"],
        "relevanceScore": 85.5,
        "publishedAt": "2026-01-27T12:00:00Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "count": 20
    }
  }
}
```

#### GET `/api/feed/following`
Get following-only feed (posts from people user follows)

**Auth:** Required  
**Query Params:** Same as for-you

#### GET `/api/feed/explore`
Get explore/discover feed (trending + suggested, no following)

**Auth:** Required  
**Query Params:** Same as for-you

#### POST `/api/feed/refresh`
Refresh user's feed (clear expired items)

**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "message": "Feed refreshed successfully"
}
```

---

### Follow Endpoints

#### GET `/api/follow/users/:userId/stats`
Get follower/following counts (public)

**Auth:** Optional  
**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "followerCount": 1250,
    "followingCount": 320
  }
}
```

#### GET `/api/follow/users/:userId/followers`
Get list of followers

**Auth:** Optional  
**Query Params:** limit, offset

#### GET `/api/follow/users/:userId/following`
Get list of users being followed

**Auth:** Optional  
**Query Params:** limit, offset

#### POST `/api/follow/users/:userId/follow`
Follow a user

**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "data": {
    "followerId": "uuid",
    "followingId": "uuid",
    "followedAt": "2026-01-27T12:00:00Z"
  }
}
```

#### DELETE `/api/follow/users/:userId/follow`
Unfollow a user

**Auth:** Required

#### GET `/api/follow/users/:userId/is-following`
Check if current user is following another user

**Auth:** Required

#### POST `/api/follow/users/:userId/block`
Block a user (also unfollows in both directions)

**Auth:** Required  
**Body:**
```json
{
  "reason": "Spam or harassment"
}
```

#### DELETE `/api/follow/users/:userId/block`
Unblock a user

**Auth:** Required

#### POST `/api/follow/users/:userId/mute`
Mute a user (hide from feed)

**Auth:** Required  
**Body:**
```json
{
  "mutePosts": true,
  "muteComments": false,
  "duration": "7d"  // Options: "1h", "24h", "7d", "30d", "forever"
}
```

#### DELETE `/api/follow/users/:userId/mute`
Unmute a user

**Auth:** Required

---

### Trending Endpoints

#### GET `/api/trending/posts`
Get trending posts (public)

**Auth:** None  
**Query Params:**
- `window` (optional): "hourly", "daily", "weekly", "monthly" (default: "daily")
- `limit` (optional, default: 20, max: 50)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "contentType": "post",
        "contentId": "uuid",
        "score": 1250.5,
        "windowType": "daily",
        "viewCount": 5000,
        "likeCount": 450,
        "commentCount": 120,
        "shareCount": 80,
        "rank": 1
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "count": 20
    }
  }
}
```

#### GET `/api/trending/hashtags`
Get trending hashtags (public)

**Auth:** None  
**Query Params:**
- `limit` (optional, default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "hashtags": [
      {
        "hashtag": "ootd",
        "score": 850.5,
        "postCount": 1200,
        "rank": 1
      }
    ]
  }
}
```

---

## Business Logic

### Follow Rules

1. **Cannot follow yourself**
2. **Cannot follow if blocked** (in either direction)
3. **Follow counts are denormalized** for fast stats retrieval
4. **Blocking automatically unfollows** in both directions
5. **Muting is softer than blocking** - hides content but doesn't notify

### Feed Generation Rules

#### For You Feed Mix (Hybrid)
- 60% from following feed (fan-out on write)
- 30% suggested posts (based on interests)
- 10% trending posts

#### Feed Freshness
- Posts expire after 30 days (configurable via `FEED_MAX_AGE_DAYS`)
- Expired items cleaned up daily

#### Content Filtering
- **NEVER** show posts from blocked users
- **NEVER** show posts from muted users (when mutePosts=true)
- Check blocking in **both directions** (if A blocks B, neither sees the other)

#### Relevance Scoring
```typescript
score = 
  engagement_score (40%) +
  velocity_score (60%) * time_decay +
  interest_match_bonus
```

Where:
- `engagement_score`: views*1 + likes*5 + comments*10 + shares*15 + saves*8
- `velocity_score`: engagement / hours_since_publish
- `time_decay`: 0.95^(age_in_days)
- `interest_match_bonus`: Based on user interest profile

### Interest Profiling

#### Interaction Weights
- `view`: 0.1
- `dwell`: 0.2 (spent time viewing)
- `like`: 0.5
- `comment`: 0.7
- `save`: 0.8
- `share`: 0.9
- `click_product`: 0.6
- `purchase`: 1.0
- `follow`: 0.7

#### Interest Decay
- Interests decay by 10% per week if not reinforced
- Very low scores (< 0.01) are deleted

---

## Events

### Events Published

| Event | When | Payload | Consumers |
|-------|------|---------|-----------|
| `user.followed` | User follows another | followerId, followingId, followedAt | notification-service |
| `user.unfollowed` | User unfollows | followerId, followingId, unfollowedAt | - |
| `user.blocked` | User blocks another | blockerId, blockedId, reason, blockedAt | - |
| `user.unblocked` | User unblocks | blockerId, blockedId, unblockedAt | - |
| `user.muted` | User mutes another | muterId, mutedId, mutePosts, muteComments, expiresAt, mutedAt | - |
| `user.unmuted` | User unmutes | muterId, mutedId, unmutedAt | - |
| `feed.refreshed` | Feed cache refreshed | userId, refreshedAt | - |

### Events Consumed

| Event | From | Action |
|-------|------|--------|
| `post.created` | content-service | Fan out to followers' feeds |
| `post.deleted` | content-service | Remove from all feeds |
| `post.liked` | content-service | Update interest scores |
| `post.saved` | content-service | Update interest scores |
| `post.viewed` | content-service | Update interest scores |
| `product_tag.clicked` | content-service | Update interest scores |

**Note:** Event consumption (Kafka) is not yet implemented. Events are logged to outbox table for future Kafka integration.

---

## Background Jobs

### Trending Computation

**Schedule:**
- Hourly trending: Every hour (0 * * * *)
- Daily trending: Every 6 hours (0 */6 * * *)
- Weekly trending: Daily at midnight (0 0 * * *)
- Monthly trending: Daily at 1 AM (0 1 * * *)
- Hashtag trending: Every 6 hours (with daily trending)

**Algorithm:**
```
trending_score = (total_engagement * 0.4 + velocity * 100 * 0.6) * time_decay
```

### Cleanup Jobs

**Schedule:**
- Expired feed items: Daily at 3 AM (0 3 * * *)
- Old feed items: Weekly Sunday at 4 AM (0 4 * * 0)
- Interest decay: Weekly Sunday at 5 AM (0 5 * * 0)
- Old trending data: Weekly Sunday at 2 AM (0 2 * * 0)

---

## Setup & Configuration

### Environment Variables

```env
# Server
PORT=3018
NODE_ENV=development

# Database
FEED_DATABASE_URL=postgresql://neondb_owner:npg_GVbUo4NiHXw1@ep-silent-boat-a1jd5w32-pooler.ap-southeast-1.aws.neon.tech/feed_db?sslmode=require

# Security
GATEWAY_SECRET_KEY=your-gateway-secret-key
SERVICE_SECRET=your-service-secret
SERVICE_NAME=feed-service

# Service URLs
CONTENT_SERVICE_URL=http://localhost:3017
PRODUCT_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3008

# Feed Configuration
FEED_PAGE_SIZE=20
FEED_MAX_AGE_DAYS=30
TRENDING_WINDOW_HOURS=24

# Background Jobs
ENABLE_BACKGROUND_JOBS=true

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Installation

```bash
cd backend/services/feed-service

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Run in development
pnpm dev

# Build for production
pnpm build

# Run in production
pnpm start
```

### Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to Neon database
pnpm db:push

# Open Prisma Studio (visual DB editor)
pnpm db:studio
```

---

## Integration Guide

### For Content-Service

**When user creates a post:**
1. Content-service publishes `post.created` event
2. Feed-service consumes event (future: Kafka consumer)
3. Feed-service fans out post to all followers' feeds

**When user deletes a post:**
1. Content-service publishes `post.deleted` event
2. Feed-service removes post from all feeds

**When user interacts with post:**
1. Content-service publishes `post.liked`, `post.saved`, etc.
2. Feed-service updates user interest profile

### For Notification-Service

**When user follows another:**
1. Feed-service publishes `user.followed` event
2. Notification-service sends "X followed you" notification

### For Frontend

**Loading feeds:**
```typescript
// For You feed (personalized)
GET /api/feed/for-you?limit=20&offset=0

// Following feed only
GET /api/feed/following?limit=20&offset=0

// Explore/discover feed
GET /api/feed/explore?limit=20&offset=0
```

**Follow actions:**
```typescript
// Follow user
POST /api/follow/users/:userId/follow

// Unfollow user
DELETE /api/follow/users/:userId/follow

// Get follow stats
GET /api/follow/users/:userId/stats
```

**Trending content:**
```typescript
// Get trending posts
GET /api/trending/posts?window=daily&limit=20

// Get trending hashtags
GET /api/trending/hashtags?limit=20
```

---

## Performance Considerations

### Feed Loading Performance

- **Following feed:** O(1) - read from pre-computed table
- **Trending feed:** O(log n) - indexed score-based query
- **For You feed:** O(k) where k = limit (combines 3 queries)

### Scaling Strategies

1. **Read Replicas:** Route read queries to replicas
2. **Caching:** Redis cache for hot feeds and trending data
3. **Pagination:** Always use limit/offset
4. **Feed Pre-computation:** Background jobs keep feeds fresh
5. **Batch Operations:** Use Prisma createMany for bulk inserts

### Monitoring

Key metrics to track:
- Feed generation latency (p50, p95, p99)
- Feed staleness (time since last update)
- Trending computation duration
- Database query performance
- Background job success rate

---

## Troubleshooting

### Issue: Feed is empty for new users

**Solution:** New users have no following, so following feed is empty. Show onboarding flow to follow suggested users.

### Issue: Trending not updating

**Solution:** Check background jobs are running (`ENABLE_BACKGROUND_JOBS=true`). Check content-service is providing engagement stats.

### Issue: Feed shows blocked users

**Solution:** Block/mute filtering happens in feed generation. Verify UserBlock/UserMute tables are populated correctly.

### Issue: High database load

**Solution:** 
- Add read replicas for feed queries
- Implement Redis caching for hot feeds
- Increase FEED_MAX_AGE_DAYS to reduce cleanup frequency

---

## API Health Check

```bash
# Check service health
curl http://localhost:3018/health

# Expected response:
{
  "status": "healthy",
  "service": "feed-service",
  "timestamp": "2026-01-27T12:00:00Z",
  "version": "1.0.0",
  "environment": "development"
}
```

---

**End of Documentation**
