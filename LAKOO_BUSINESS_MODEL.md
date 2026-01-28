# LAKOO - SOCIAL COMMERCE PLATFORM FOR INDONESIAN FASHION

**Last Updated:** January 2026
**Status:** Active Development
**Document Purpose:** New Employee Onboarding Guide

---

## TL;DR - WHAT IS LAKOO? (Read This First!)

**If you only have 2 minutes, read this:**

🎯 **What we are:** A social commerce app for Indonesian women's fashion - like **Xiaohongshu (Little Red Book)** or **Pinterest with checkout**

🛒 **How it works:**
1. Users scroll a visual feed of fashion content (like Instagram/Pinterest)
2. Every post can have product tags - tap to buy instantly
3. Anyone can post content and tag products from ANY store
4. Sellers pay only 0.5% commission (lowest in Indonesia!)

💰 **How we make money:**
- 0.5% commission on sales
- Sponsored Posts (brands pay to boost their posts in the feed)

🎪 **How we get sellers:** We sponsor local bazaars (Rp 1M cash) to onboard community fashion brands

👩 **Who we serve:** Women aged 17-30 in Jakarta who want to discover trendy local fashion

🔑 **Key Features:**
- **Discovery Feed** - Pinterest-style visual browsing (not search-first like Shopee)
- **Shoppable Posts** - Tag products in posts, buy with one tap
- **Tag ANY Product** - Users can tag items from any store they like
- **Reviews ≠ Posts** - Reviews are separate, tied to orders (verified purchases only)
- **Store Page Builder** - Sellers can customize their store like Taobao
- **Fitting Room** - Mix & match items from different stores (frontend demo)

**Clarification (Tagging vs Selling vs Reviews):**
- **Post tags** are for discovery only: users can tag products from any store.
- **Sellable catalog** requires approval: only LAKOO‑approved products can be purchased in‑app.
- **Reviews** are purchase‑verified and separate from post comments.

👤 **Users vs Sellers:** Sellers ARE users! A seller is just a user who also sells. Sellers can post, comment, follow, and even buy from other sellers.

📱 **We are NOT:**
- Shopee/Tokopedia (search-first, price-focused)
- Instagram (can't buy in-app)
- Just another marketplace

**Read the full document for details!**

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Business Model Overview](#business-model-overview)
3. [Core Entities](#core-entities)
4. [Revenue Model](#revenue-model)
5. [Social Features & Content Discovery](#social-features--content-discovery)
6. [Bazaar Sponsorship Program](#bazaar-sponsorship-program)
7. [Quality Control & Draft Approval](#quality-control--draft-approval)
8. [LAKOO House Brands (Filler)](#lakoo-house-brands-filler)
9. [How Orders Work](#how-orders-work)
10. [Warehouse & Inventory System](#warehouse--inventory-system)
11. [Advertising System](#advertising-system)
12. [Platform Features](#platform-features)
13. [Marketing Strategy](#marketing-strategy)
14. [Technology Stack](#technology-stack)
15. [Team Structure](#team-structure)
16. [Success Metrics](#success-metrics)

---

## EXECUTIVE SUMMARY

**What is LAKOO?**

LAKOO is Indonesia's **social commerce platform for fashion discovery** - combining the visual inspiration of Pinterest, the content-driven shopping of Xiaohongshu (Little Red Book), and the trusted recommendations of Dianping, with **seamless integrated checkout**.

Think: *"Where do I find the best Indonesian fashion brands?"* → LAKOO

**Key Differentiators:**
- **Pinterest-style Discovery** - Visual, browsable, inspirational feed (not transactional like Shopee)
- **Content + Commerce** - Every post is shoppable with seamless checkout (no external links like Instagram)
- **Community-Driven** - Real Indonesian brands, authentic user reviews, community trust
- **0.5% Commission** - Lowest in market (vs. Shopee 4.25%-10%, Tokopedia and tiktok shop 4.75%-10%) https://seller.shopee.co.id/edu/article/15965 https://seller-id.tokopedia.com/university/essay?knowledge_id=5411650459305729&lang=en
- **Curated Quality** - All products go through draft approval (no fake photos, no fake products)
- **Bazaar Brand Acquisition** - We sponsor local bazaars to onboard community-heavy brands

**Target Market:** Indonesian women aged 17-30, fashion-conscious, Jakarta-based, seeking trendy local fashion discovery

**Geographic Focus:** Jakarta (initial launch) → Java → Indonesia

**Business Stage:** Development/Pre-Launch (pivoting to social commerce model)

**Positioning:** We don't compete on price with Shopee. We compete on **experience, discovery, and trust**. Even if users discover on LAKOO and buy elsewhere initially, our 0.5% commission will attract sellers when traffic grows.

---

## BUSINESS MODEL OVERVIEW

### The Social Commerce Model

```
┌─────────────────────────────────────────────────────────────┐
│                      USERS                                   │
│            (Discover, Browse, Save, Follow, Buy)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CONTENT DISCOVERY FEED                          │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Brand   │  │ User    │  │ Brand   │  │ Review  │        │
│  │ Post    │  │ Review  │  │ Post    │  │ + Photo │        │
│  │ [Shop]  │  │ [Shop]  │  │ [Shop]  │  │ [Shop]  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                              │
│  Pinterest-style visual grid • Algorithm-driven             │
│  Like, Save, Comment, Follow • Seamless checkout            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
┌───────▼──────────┐      ┌────────▼──────────┐
│  COMMUNITY       │      │  LAKOO HOUSE      │
│  BRANDS          │      │  BRANDS (Filler)  │
│                  │      │                   │
│ • From bazaars   │      │ • Fill gaps only  │
│ • 0.5% commission│      │ • No competition  │
│ • Own inventory  │      │ • e.g., hats if   │
│ • Create content │      │   no one sells    │
└──────────────────┘      └───────────────────┘
```

### The Core Concept

**Discovery Platform, Not Shopping App**

Users come to LAKOO to:
1. **Discover** - "What are the trending hijab brands?"
2. **Get Inspired** - Browse outfit ideas, styling tips
3. **Save & Follow** - Build collections, follow favorite brands
4. **Buy Seamlessly** - One-tap checkout without leaving the app

This is different from Shopee/Tokopedia where users search for specific products. LAKOO is for **exploration and discovery**.

### Why This Model Works

**For Users:**
- Beautiful, inspiring content (not cluttered product listings)
- Discover new Indonesian brands they'd never find on Shopee
- Trust through community reviews and curated quality
- Seamless checkout (unlike Instagram's external links)

**For Community Brands:**
- Lowest commission in market (0.5% vs 5-15% elsewhere)
- Content-first discovery (not buried in search results)
- Community of engaged fashion enthusiasts
- We help set up their store and migrate their IG content

**For LAKOO:**
- Cheap acquisition via bazaar sponsorship (~Rp 1M per brand)
- 0.5% commission on all transactions
- Sponsored post revenue (brands pay for feed visibility)
- Traffic-first approach attracts investors and sellers

### Competitive Positioning

| Platform | Content | Commerce | Checkout | Our Advantage |
|----------|---------|----------|----------|---------------|
| **Instagram** | Yes | Limited | External links (friction) | Seamless checkout |
| **TikTok Shop** | Video only | Yes | In-app | Pinterest-style (not video) |
| **Lemon8** | Yes | No | None | Integrated commerce |
| **Shopee** | No | Yes | In-app | Discovery & inspiration |
| **Pinterest** | Yes | Limited | External | Full commerce + local brands |
| **LAKOO** | **Yes** | **Yes** | **Seamless** | **All combined** |

---

## CORE ENTITIES

### Understanding Users vs Sellers

> **Key Concept:** Sellers ARE users. A seller is just a user with additional selling capabilities.

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                    (Base Account)                            │
│                                                              │
│  Everyone starts as a user. All users can:                  │
│  ✓ Browse the feed                                          │
│  ✓ Like, save, comment on posts                             │
│  ✓ Follow other users and sellers                           │
│  ✓ Create posts and tag products                            │
│  ✓ Buy products from any seller                             │
│  ✓ Write reviews after purchase                             │
│                                                              │
│         ┌─────────────────────────────────────┐             │
│         │      SELLER = User + Selling        │             │
│         │                                     │             │
│         │  All user features PLUS:            │             │
│         │  ✓ List products for sale           │             │
│         │  ✓ Receive and fulfill orders       │             │
│         │  ✓ Customize store page             │             │
│         │  ✓ Run sponsored posts              │             │
│         │  ✓ Receive payouts                  │             │
│         │  ✓ Access seller dashboard          │             │
│         │                                     │             │
│         │  Sellers can ALSO buy from others!  │             │
│         └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

**Example Scenarios:**
- A seller posts an OOTD wearing their own products AND items from other stores → totally fine!
- A seller buys supplies from another seller → totally fine!
- A user becomes a seller later → just upgrade, same account

---

### 1. USERS (Everyone on the Platform)

**Function:** The heart of the platform - they discover, create content, and buy

**What ALL users can do:**

**Browse & Discover:**
- Scroll the discovery feed
- Search for products and brands
- Save products to collections
- Follow favorite brands and users

**Create Content:**
- Post outfit photos and styling ideas
- Tag products from ANY store in posts
- Comment on other posts
- Write reviews after purchase

**Shop:**
- Add to cart and checkout
- Track orders
- Request returns/refunds

**Behaviors We're Designing For:**
- "I'm bored, let me scroll LAKOO for fashion inspiration"
- "I'm going to a wedding, what should I wear?" → Search LAKOO
- "My friend posted this outfit, I want to buy it" → Tap to shop

---

### 2. COMMUNITY BRANDS

**Function:** Independent Indonesian fashion brands acquired through bazaar sponsorship

**Characteristics:**
- Onboarded via bazaar sponsorship program (Rp 1M sponsorship)
- Own their inventory and handle fulfillment
- Pay only 0.5% commission (lowest in market)
- Create content (posts) to appear in discovery feed
- All products go through draft approval before listing

**How They Join:**
1. LAKOO sponsors their physical bazaar (Rp 1M cash)
2. Brand agrees to set up store on LAKOO
3. LAKOO team sets up their store and migrates their last 10 IG posts
4. Brand continues posting and selling on the platform

**Target Brands:**
- Community-heavy women's fashion brands
- Hijab/modest fashion (Wearing Klamby, etc.)
- Local streetwear with engaged communities
- Sustainable/artisan fashion brands
- Brands with strong Instagram following

**Brand Tools Provided:**
- Brand dashboard (products, orders, analytics)
- Content posting (photos, descriptions, shoppable tags)
- Analytics (views, saves, follows, conversions)
- Sponsored post campaigns (pay for feed visibility)

---

### 3. LAKOO HOUSE BRANDS (Filler)

**Function:** Fill product gaps that community brands don't cover

**Key Principle:** LAKOO House Brands do NOT compete with community brands. They only exist to fill gaps.

**Example:**
- If no community brand sells hats → LAKOO sells hats
- If no community brand sells basic tees → LAKOO sells basic tees
- Once a community brand starts selling hats → LAKOO stops

**Characteristics:**
- Pull inventory from LAKOO warehouse
- Managed by internal team
- Reduced from original 15 brands to gap-filler role only
- May maintain 2-3 house brands maximum (e.g., LAKOO Basics, LAKOO Modest)

**Warehouse (for House Brands only):**
- Location: TBD (smaller footprint needed now)
- Manages grosir bundle constraints for house brand inventory
- Quality control and fulfillment

---

### 4. LAKOO PLATFORM

**Function:** Social commerce platform operator

**Key Responsibilities:**
- Operate PWA (MVP) and native mobile apps (launch)
- Manage content discovery feed algorithm
- Process customer payments
- Handle customer service
- Quality control (draft approval for all products)
- Bazaar sponsorship outreach
- Technology development

**Revenue Sources:**
- **Commission:** 0.5% on all community brand transactions
- **Sponsored Posts:** Brands pay for visibility in feed
- **House Brand Sales:** Margin on filler products
- **Live Streaming:** Direct sales during live events (future)

**Team:** See [Team Structure](#team-structure) section

---

## REVENUE MODEL

### Revenue Streams

```
┌─────────────────────────────────────────────────────────────┐
│                    REVENUE SOURCES                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. COMMISSION (0.5%)                                        │
│     └─ On every community brand transaction                  │
│     └─ Lowest in market (Shopee 5-15%, Tokopedia 5-10%)     │
│                                                              │
│  2. SPONSORED POSTS                                          │
│     └─ Brands pay for visibility in discovery feed           │
│     └─ Similar to Instagram sponsored posts                  │
│     └─ CPC (cost per click) or CPM (cost per impression)    │
│                                                              │
│  3. HOUSE BRAND MARGINS                                      │
│     └─ 50-60% margin on filler products                     │
│     └─ Reduced role (gap-filler only)                       │
│                                                              │
│  4. FUTURE: AFFILIATE PROGRAM                                │
│     └─ Users earn % on referred sales                       │
│     └─ LAKOO takes small cut of affiliate fees              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Revenue Projections (Year 1 - Realistic Bootstrap)

> **Reality Check:** We are a 5-founder team with no employees. Revenue in Year 1 will be minimal. The focus is survival and traction, not profit.

**Phase 1: Survival Mode (Month 1-6)**
- Focus: Build MVP, onboard first 50 brands, prove concept
- Revenue: Near zero (not the priority)
- Goal: 50+ community brands, 10K+ MAU, working product

**Phase 2: Early Traction (Month 7-12)**

```
┌─────────────────────────────────────────────────────────────┐
│ REVENUE SOURCE           │ AMOUNT (Rp)     │ NOTES         │
├─────────────────────────────────────────────────────────────┤
│ 1. Commission (0.5%)     │ 5,000,000       │ GMV Rp 1B     │
│    (realistic early GMV) │                 │ × 0.5%        │
│                          │                 │               │
│ 2. Sponsored Posts       │ 15,000,000      │ 5 brands ×    │
│    (early adopters)      │                 │ Rp 3M/month   │
│                          │                 │               │
│ 3. House Brand Margins   │ 0               │ Deprioritized │
│    (focus on platform)   │                 │ for MVP       │
│                          │                 │               │
│ MONTHLY REVENUE (M12)    │ 20,000,000      │ ~$1,250 USD   │
└─────────────────────────────────────────────────────────────┘
```

**Realistic Year 1 Total Revenue:** Rp 50-100M (mostly Month 9-12)

---

### Cost Structure (Bootstrap - 5 Founders, No Employees)

```
┌─────────────────────────────────────────────────────────────┐
│ COST ITEM                │ MONTHLY (Rp)    │ NOTES         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🖥️  INFRASTRUCTURE (18 Microservices)                       │
│                                                              │
│ EC2 Instances            │ 1,500,000       │ 2-3 t3.medium │
│ (2-3 servers, Docker)    │ (~$94 USD)      │ shared hosting│
│                          │                 │               │
│ RDS PostgreSQL           │ 500,000         │ db.t3.micro   │
│ (managed database)       │ (~$31 USD)      │ single-AZ     │
│                          │                 │               │
│ Redis (ElastiCache)      │ 350,000         │ cache.t3.micro│
│                          │ (~$22 USD)      │               │
│                          │                 │               │
│ Kafka (Upstash/MSK)      │ 500,000         │ Event bus     │
│                          │ (~$31 USD)      │               │
│                          │                 │               │
│ S3 + CloudFront          │ 300,000         │ Images, CDN   │
│                          │ (~$19 USD)      │               │
│                          │                 │               │
│ Domain + SSL + Misc      │ 150,000         │               │
│                          │ (~$9 USD)       │               │
│                          │                 │               │
│ INFRA SUBTOTAL           │ 3,300,000       │ ~$206 USD/mo  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🔌 THIRD-PARTY APIs                                         │
│                                                              │
│ Xendit (payments)        │ 0               │ Fees paid by  │
│                          │                 │ buyer (2.9%)  │
│                          │                 │               │
│ Biteship (logistics)     │ 0               │ Fees paid by  │
│                          │                 │ buyer         │
│                          │                 │               │
│ SendGrid (email)         │ 0 - 350,000     │ Free tier →   │
│                          │                 │ $20/mo later  │
│                          │                 │               │
│ Twilio (SMS/OTP)         │ 800,000         │ ~$50/mo for   │
│                          │                 │ OTP & notifs  │
│                          │                 │               │
│ Firebase (push)          │ 0               │ Free tier     │
│                          │                 │               │
│ Algolia (search)         │ 0 - 800,000     │ Free tier →   │
│                          │                 │ $50/mo later  │
│                          │                 │               │
│ API SUBTOTAL             │ 800,000-2,000,000│ ~$50-125/mo  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 👥 TEAM (5 Founders - No Salary Initially)                  │
│                                                              │
│ Founder Salaries         │ 0               │ Bootstrapping │
│                          │                 │ equity only   │
│                          │                 │               │
│ Accountant (part-time)   │ 1,500,000       │ Monthly       │
│                          │                 │ bookkeeping   │
│                          │                 │               │
│ Tax Consultant           │ 500,000         │ Quarterly =   │
│                          │                 │ ~2M/quarter   │
│                          │                 │               │
│ TEAM SUBTOTAL            │ 2,000,000       │ ~$125 USD/mo  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🎪 BRAND ACQUISITION                                        │
│                                                              │
│ Bazaar Sponsorships      │ 10,000,000      │ 10 brands/mo  │
│ (conservative start)     │ (Rp 1M × 10)    │ @ Rp 1M each  │
│                          │                 │               │
│ ACQUISITION SUBTOTAL     │ 10,000,000      │ ~$625 USD/mo  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 📱 OPERATIONS                                               │
│                                                              │
│ Co-working/Meeting Space │ 2,000,000       │ Optional      │
│                          │                 │               │
│ Misc (transport, etc)    │ 1,000,000       │               │
│                          │                 │               │
│ OPS SUBTOTAL             │ 3,000,000       │ ~$188 USD/mo  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 💰 TOTAL MONTHLY BURN    │ 19,100,000      │ ~$1,194 USD   │
│                          │                 │               │
│ With buffer (+20%)       │ 23,000,000      │ ~$1,438 USD   │
└─────────────────────────────────────────────────────────────┘
```

---

### Initial Runway Budget (Pre-Revenue Survival)

```
┌─────────────────────────────────────────────────────────────┐
│ STARTUP RUNWAY CALCULATION                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Monthly burn rate:           Rp 23,000,000 (~$1,438 USD)    │
│                                                              │
│ Recommended runway:          6-9 months before revenue      │
│                                                              │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ 6-month runway:   Rp 138,000,000  (~$8,625 USD)    │     │
│ │ 9-month runway:   Rp 207,000,000  (~$12,938 USD)   │     │
│ │ 12-month runway:  Rp 276,000,000  (~$17,250 USD)   │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                              │
│ RECOMMENDED INITIAL CAPITAL: Rp 200-300 Juta                │
│ (covers 9-12 months + unexpected costs)                     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ BUDGET ALLOCATION (Rp 250,000,000 example):                 │
│                                                              │
│ • Infrastructure (12 mo)      Rp 40,000,000    16%          │
│ • Third-party APIs (12 mo)    Rp 24,000,000    10%          │
│ • Accountant/Tax (12 mo)      Rp 24,000,000    10%          │
│ • Bazaar sponsorships (12 mo) Rp 120,000,000   48%          │
│   (120 brands @ Rp 1M each)                                 │
│ • Operations (12 mo)          Rp 36,000,000    14%          │
│ • Emergency buffer            Rp 6,000,000     2%           │
│                               ─────────────                 │
│ TOTAL                         Rp 250,000,000   100%         │
└─────────────────────────────────────────────────────────────┘
```

---

### Payment Flow (Xendit Fees Paid by Buyer)

> **Important:** Xendit payment gateway fees are passed to the buyer, NOT absorbed by LAKOO.

**Customer Payment Breakdown:**
```
Product price:              Rp 250,000
Shipping (paid by buyer):   Rp 20,000
Payment fee (2.9% + 2K):    Rp 9,250  ← Buyer pays this
─────────────────────────────────────
Total paid by customer:     Rp 279,250

Seller receives:            Rp 250,000 - 0.5% commission
                          = Rp 248,750

LAKOO commission:           Rp 1,250 (0.5%)
```

**Why Buyer Pays Fees:**
- Industry standard in Indonesia (Shopee, Tokopedia do this)
- Keeps our 0.5% commission promise clean
- Transparent pricing for sellers

### Unit Economics

**Per Brand Acquisition:**
```
Cost to acquire brand:     Rp 1,000,000 (bazaar sponsorship)
Expected brand GMV/month:  Rp 10,000,000
Commission earned:         Rp 50,000 (0.5%)
Months to payback:         20 months

BUT: The real value is TRAFFIC, not commission
     - Each brand brings their community
     - More traffic = more investors
     - More traffic = more brands want to join
```

**Why 0.5% Commission Works:**
- We're not trying to profit from commission (yet)
- 0.5% is essentially "payment processing pass-through"
- Real monetization is sponsored posts + future scale
- Low commission attracts brands away from Shopee/Tokopedia

---

## SOCIAL FEATURES & CONTENT DISCOVERY

### The Pinterest-Style Feed

LAKOO's core experience is a visual discovery feed - not a product catalog.

```
┌─────────────────────────────────────────────────────────────┐
│  LAKOO FEED (Algorithm-Driven)                              │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ [Image]     │  │ [Image]     │  │ [Image]     │         │
│  │             │  │             │  │             │         │
│  │ Brand Post  │  │ User Review │  │ Outfit Idea │         │
│  │ @hijabbrand │  │ @sarah_style│  │ @modestlook │         │
│  │ ♡ 234  💬 12│  │ ♡ 89   💬 5 │  │ ♡ 456  💬 23│         │
│  │ [Shop Now]  │  │ [Shop Item] │  │ [Shop Look] │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ [Sponsored] │  │ [Image]     │  │ [Image]     │         │
│  │ Brand Post  │  │ ...         │  │ ...         │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Content Types

> **Important:** Posts and Reviews are SEPARATE (like Xiaohongshu)
> - **Posts** = General content anyone can create anytime
> - **Reviews** = Tied to orders, only after purchase

**1. Posts (Anyone Can Create)**

Posts are general content that ANYONE (brands or users) can create at any time.

- Product photos with styling
- Outfit of the day (OOTD)
- Style inspiration and tips
- New collection announcements (brands)
- Behind-the-scenes content
- Can be boosted as Sponsored Posts

**Key Feature: Tag ANY Product**
- Users can tag products from ANY store (not just their own)
- Example: A user posts an outfit photo and tags the hijab from @brand_A, blouse from @brand_B, and pants from @brand_C
- This is a core social commerce feature - users recommend products they love

**2. Reviews (Tied to Orders)**

Reviews are SEPARATE from posts and can only be created AFTER purchasing a product.

- Post-purchase photo reviews
- Verified purchase badge (shows you actually bought it)
- Star ratings and written feedback
- Appear on product pages AND can surface in feed
- Honest feedback and recommendations

**Why Separate?**
- Reviews = verified, trusted feedback from actual buyers
- Posts = general content, inspiration, recommendations
- This follows the Xiaohongshu model where reviews are distinct

**3. Style Inspiration**
- Outfit ideas (multiple products tagged from different stores)
- Styling tips and tutorials
- Trend reports

### User Interactions

| Action | Description |
|--------|-------------|
| **Like (♡)** | Show appreciation, saves to algorithm |
| **Save** | Add to personal collections for later |
| **Comment** | Ask questions, share thoughts |
| **Follow** | Follow brands or users for updates |
| **Share** | Share to WhatsApp, Instagram, etc. |
| **Shop** | Tap product tag → seamless checkout |

### Feed Algorithm

The algorithm prioritizes:
1. **Relevance** - Based on user's past likes, saves, purchases
2. **Engagement** - Posts with high engagement get boosted
3. **Freshness** - Recent content preferred
4. **Diversity** - Mix of brands, users, content types
5. **Sponsored** - Paid posts inserted naturally

**Personalization Signals:**
- Categories browsed
- Brands followed
- Products purchased
- Content saved
- Search history
- Time spent on posts

### Collections (Pinterest Boards)

Users can create collections to save content:
- "Wedding Guest Outfits"
- "Daily Hijab Looks"
- "Wishlist"
- "Outfit Inspo"

Collections can be:
- Private (only you)
- Public (others can follow)
- Collaborative (invite friends)

### Creator/Affiliate Program (Phase 2)

**For Users Who Post:**
- Earn affiliate commission when someone buys through your post
- Commission: 2-5% of sale (paid by LAKOO, not brand)
- Track earnings in dashboard
- Minimum payout: Rp 100,000

**Creator Tiers:**
| Tier | Requirements | Benefits |
|------|--------------|----------|
| **Starter** | 0+ followers | Basic affiliate links |
| **Rising** | 500+ followers | Higher commission (3%) |
| **Verified** | 2000+ followers, quality content | Verified badge, 5% commission, brand deals |

---

## BAZAAR SPONSORSHIP PROGRAM

### The Acquisition Strategy

Instead of paying for digital ads to acquire brands, LAKOO sponsors physical bazaars to onboard community-heavy brands directly.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  BAZAAR SPONSORSHIP FLOW                                     │
│                                                              │
│  1. IDENTIFY                                                 │
│     └─ Find upcoming bazaars in Jakarta/Java                │
│     └─ Target: Women's fashion, community brands            │
│                                                              │
│  2. APPROACH                                                 │
│     └─ Contact brand owners at bazaar                       │
│     └─ Offer: Rp 1,000,000 cash sponsorship                 │
│                                                              │
│  3. AGREEMENT                                                │
│     └─ Brand agrees to:                                     │
│        • Set up store on LAKOO                              │
│        • Allow LAKOO to migrate last 10 IG posts            │
│        • Continue selling on LAKOO                          │
│                                                              │
│  4. ONBOARDING                                               │
│     └─ LAKOO team sets up their store                       │
│     └─ LAKOO team migrates their IG content                 │
│     └─ Brand reviews and approves                           │
│                                                              │
│  5. LIVE                                                     │
│     └─ Brand is now on LAKOO                                │
│     └─ Brand's community discovers LAKOO                    │
│     └─ Brand continues posting (optional but encouraged)    │
└─────────────────────────────────────────────────────────────┘
```

### Sponsorship Details

**What LAKOO Provides:**
- Rp 1,000,000 cash payment
- Full store setup (free)
- Migration of last 10 Instagram posts
- Training on how to use the platform
- Ongoing support

**What Brand Provides:**
- Agreement to have store on LAKOO
- Permission to migrate their IG content
- Basic product information (prices, sizes, etc.)
- Continued engagement (encouraged, not required)

### Target Bazaars

**Jakarta:**
- JCC Fashion Bazaars
- Mall pop-up events
- Community fashion markets
- Ramadan bazaars (seasonal)
- University fashion events

**Java:**
- Bandung creative markets
- Surabaya fashion bazaars
- Yogyakarta artisan markets

### Target Brand Profile

**Ideal Brands:**
- Women's fashion focus
- Active Instagram presence (1K-100K followers)
- Community-heavy (engaged followers, not just numbers)
- Products priced Rp 50K-500K
- Owns inventory, can fulfill orders

**Examples:**
- Local hijab brands
- Modest fashion designers
- Sustainable/artisan fashion
- Indie streetwear for women
- Handmade accessories

### Economics

**Per Bazaar Event:**
```
Brands approached:        10-20
Expected conversion:      50% (5-10 brands)
Cost per brand:           Rp 1,000,000
Total spend per event:    Rp 5,000,000 - 10,000,000
```

**Monthly Targets:**
```
Bazaar events attended:   10-15
Brands onboarded:         50-100
Monthly acquisition cost: Rp 50,000,000 - 100,000,000
```

**Why This Works:**
- Rp 1M is meaningful for small brands
- Face-to-face builds trust
- We see their products in person (quality check)
- Their community is proven (they're at bazaar)
- Much cheaper than digital CAC

---

## QUALITY CONTROL & DRAFT APPROVAL

### The Promise

**"If it's on LAKOO, it's real."**

Every product on LAKOO goes through draft approval before going live. This ensures:
- No fake product photos
- No stolen images
- Accurate descriptions
- Real, legitimate products

### Draft Approval Flow

```
┌─────────────────────────────────────────────────────────────┐
│  PRODUCT LISTING FLOW                                        │
│                                                              │
│  1. BRAND UPLOADS DRAFT                                      │
│     └─ Product photos                                       │
│     └─ Product name & description                           │
│     └─ Price & variants (size, color)                       │
│     └─ Inventory count                                      │
│                                                              │
│  2. LAKOO REVIEWS (24-48 hours)                             │
│     └─ Photo quality check                                  │
│     └─ Photo authenticity (not stolen)                      │
│     └─ Description accuracy                                 │
│     └─ Price reasonableness                                 │
│     └─ Category correctness                                 │
│                                                              │
│  3. DECISION                                                 │
│     ├─ ✓ APPROVED → Product goes live                       │
│     └─ ✗ REJECTED → Feedback sent to brand                  │
│                     Brand can revise and resubmit           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Review Criteria

**Photo Requirements:**
| Criteria | Requirement |
|----------|-------------|
| **Authenticity** | Must be brand's own photos (not stolen from internet) |
| **Quality** | Minimum 800x800px, clear, well-lit |
| **Accuracy** | Photo must match actual product |
| **Appropriateness** | No offensive content |
| **Quantity** | Minimum 3 photos per product |

**Description Requirements:**
- Accurate product name
- Honest material/fabric description
- Correct sizing information
- No misleading claims

**Price Requirements:**
- Within reasonable market range
- Consistent with brand's other products
- Not suspiciously low (counterfeit signal)

### Rejection Reasons

Common rejection reasons with feedback:
1. "Photo appears to be from another source. Please upload original photos."
2. "Image quality too low. Please upload higher resolution photos."
3. "Description doesn't match visible product. Please correct."
4. "Missing size chart. Please add sizing information."
5. "Price seems inconsistent. Please verify."

### Turnaround Time

- **Standard:** 24-48 hours
- **Priority (for active sellers):** 12-24 hours
- **Rejection resubmission:** 24 hours

### Quality Control Team

**Staffing (at scale):**
- 2-3 Content Moderators
- Reviewing ~100-200 products/day per person
- Total capacity: 300-600 products/day

**Tools:**
- Reverse image search (detect stolen photos)
- AI-assisted quality scoring (future)
- Brand history tracking (trusted brands = faster approval)

### Why This Matters

**For Users:**
- Trust that products are real
- Photos represent actual items
- No bait-and-switch

**For Brands:**
- Level playing field (no fake competitors)
- Platform credibility helps their sales
- Quality association

**For LAKOO:**
- Differentiation from Shopee's chaos
- Premium positioning
- Reduced disputes and returns

---

## LAKOO HOUSE BRANDS (FILLER)

### New Role: Gap Fillers Only

**Important:** LAKOO House Brands have been reduced from 15 competing brands to a minimal gap-filler role.

**Core Principle:** House brands exist ONLY to fill gaps that community brands don't cover. They do NOT compete with community brands.

### Active House Brands (Reduced)

| Brand | Purpose | When Active |
|-------|---------|-------------|
| **LAKOO Basics** | Essential basics (plain tees, basic hijabs) | Only if no community brand covers basics |
| **LAKOO Modest** | Modest fashion essentials | Only for categories not covered |

*Other house brands (Elite, Street, Classic, etc.) are DEPRECATED and will be phased out.*

### How Gap-Filling Works

```
Scenario: No community brand sells plain white t-shirts

1. LAKOO identifies gap in catalog
2. LAKOO Basics sources plain white t-shirts
3. LAKOO Basics lists them on platform
4. Users can buy basics alongside community brand products

Scenario: Community brand "BasicWear" joins and sells white t-shirts

1. LAKOO sees overlap
2. LAKOO Basics stops selling white t-shirts
3. Community brand takes over that category
4. LAKOO Basics focuses on other gaps
```

### Why This Change?

**Old Model Problems:**
- 15 house brands competed with potential partners
- Community brands wouldn't join if LAKOO was a competitor
- High inventory risk and warehouse costs

**New Model Benefits:**
- Community brands are partners, not competitors
- Lower inventory risk (only stock gaps)
- Focus resources on brand acquisition
- Warehouse needs reduced significantly

### House Brand Management

**Team:**
- 1 House Brand Manager (down from 15 brand managers)
- Identifies catalog gaps
- Sources products for gaps only
- Monitors when to exit categories

**Warehouse:**
- Smaller footprint needed
- Focus on basics and gap-fillers
- Grosir bundle system still applies for stocked items

---

## HOW ORDERS WORK

### Customer Journey: Discovery to Purchase

```
1. DISCOVER
   User scrolling feed sees outfit post from @hijabbrand
   ↓
2. ENGAGE
   Likes post, taps product tag to see details
   ↓
3. BROWSE
   Views product page (photos, description, reviews)
   Checks other products from same brand
   ↓
4. ADD TO CART
   Selects size/color, adds to cart
   ↓
5. CHECKOUT
   Enters shipping address
   Selects payment method
   ↓
6. PAYMENT
   Pays Rp 250,000 via Xendit (e-wallet/bank transfer/credit card)
   Order status: "Pending Payment"
   ↓
7. PAYMENT CONFIRMED
   Xendit webhook confirms payment received
   Order status: "Processing"
   Order sent to brand's dashboard
   Commission (0.5%) = Rp 1,250 recorded
   ↓
8. BRAND FULFILLMENT
   Brand packs and ships from their location
   Uploads tracking number (24-hour SLA)
   ↓
9. LOGISTICS
   Biteship tracking activated
   Customer receives tracking link via WhatsApp/app
   ↓
10. DELIVERY
    Product delivered (2-5 days depending on location)
    Order status: "Delivered"
    ↓
11. REVIEW PROMPT
    App prompts: "How was your purchase? Post a review!"
    Customer posts photo review → Appears in feed
    (Affiliate link attached if review drives future sales)
```

### LAKOO House Brand Purchase (Gap-Filler Products)

```
Steps 1-6: Same as above
   ↓
7. PAYMENT CONFIRMED
   Order sent to LAKOO warehouse
   ↓
8. WAREHOUSE FULFILLMENT
   LAKOO warehouse picks, packs, ships
   ↓
9-11: Same as above
```

### Payment Flow

> **Key:** Xendit fees are paid by the BUYER, not absorbed by seller or platform.

**Community Brand Order (Standard):**
```
Product price:                    Rp 250,000
Shipping (buyer pays):            Rp 20,000
Payment processing fee (buyer):   Rp 9,250  (2.9% + Rp 2,000)
───────────────────────────────────────────
Customer total:                   Rp 279,250
    ↓
Xendit receives:                  Rp 279,250
Xendit keeps fee:                 Rp 9,250
    ↓
LAKOO receives:                   Rp 270,000 (product + shipping)
    ↓
LAKOO commission (0.5%):          Rp 1,250
Shipping to courier:              Rp 20,000
    ↓
Seller payout:                    Rp 248,750

LAKOO net revenue:                Rp 1,250 (0.5% commission only)
```

**LAKOO House Brand Order (Gap-Filler Products):**
```
Product price:                    Rp 250,000
Shipping (buyer pays):            Rp 20,000
Payment processing fee (buyer):   Rp 9,250
───────────────────────────────────────────
Customer total:                   Rp 279,250
    ↓
LAKOO receives:                   Rp 270,000
    ↓
COGS (warehouse cost):            Rp 100,000
Shipping to courier:              Rp 20,000
    ↓
LAKOO gross margin:               Rp 150,000 (60%)
```

### Refund & Return Process

**Customer initiates return:**
1. Within 7 days of delivery
2. Submits return request with reason
3. CS agent reviews (or auto-approved for valid reasons)
4. Return label generated
5. Customer ships back
6. Warehouse inspects upon receipt
7. If approved: Full refund to original payment method
8. If rejected: Item returned to customer

**Refund Types:**
- Full refund (wrong item, defective, not as described)
- Partial refund (minor defect customer keeps)
- Store credit (customer choice)
- Exchange (different size/color)

---

## WAREHOUSE & INVENTORY SYSTEM

### The Grosir Bundle System

**Critical Concept:** Factories don't ship individual items. They ship fixed bundles.

**Example: T-Shirt Factory Bundle**
```
Factory ships 1 bundle = 12 units:
- 2 × Small
- 5 × Medium
- 4 × Large
- 1 × XL
```

**The Problem:**
If customers only want Medium, we'd need to order 5 bundles (60 units) to get 25 Mediums. But that means we also get:
- 10 Smalls (might not sell)
- 20 Larges (might not sell)
- 5 XLs (might not sell)

**The Solution: Tolerance System**

Warehouse sets maximum excess allowed per size:
```
Size    | Max Excess Allowed
--------|-------------------
Small   | 20 units
Medium  | 50 units
Large   | 40 units
XL      | 30 units
```

**Real-Time Constraint Checking:**

When customer tries to order:
1. System calculates total demand across ALL orders + carts (all 15 brands)
2. Calculates how many bundles needed to fulfill demand
3. Calculates resulting excess per size
4. If any size would exceed tolerance → LOCK that variant
5. Customer sees: "Size M temporarily unavailable - other sizes need to catch up!"

**Example Calculation:**
```
Current orders + carts across all brands:
- S: 15 units
- M: 48 units (HIGH DEMAND)
- L: 22 units
- XL: 8 units

To fulfill 48 Medium, need 10 bundles (48 ÷ 5 = 9.6 → round up)

10 bundles result in:
- S: 20 (need 15, excess: 5) ✓ OK
- M: 50 (need 48, excess: 2) ✓ OK
- L: 40 (need 22, excess: 18) ✓ OK
- XL: 10 (need 8, excess: 2) ✓ OK

All within tolerance → Customer can order any size

But if M reaches 51:
- Need 11 bundles (51 ÷ 5 = 10.2 → round up)
- M excess would be 55 - 51 = 4 ✓ Still OK
- BUT L excess would be 44 - 22 = 22 ✓ Still OK
- S excess would be 22 - 15 = 7 ✓ Still OK

Actually still OK! But if M reaches 60:
- Need 12 bundles
- L excess: 48 - 22 = 26 ✓ OK
- S excess: 24 - 15 = 9 ✓ OK
- XL excess: 12 - 8 = 4 ✓ OK

Still OK! System is smart.

But if SMALL only has 5 orders and M has 60:
- Need 12 bundles for M
- S excess: 24 - 5 = 19 ✓ OK (under 20 limit)
- Just barely OK

If one more S is removed (now 4 orders):
- S excess: 24 - 4 = 20 ✓ EXACTLY at limit

If S drops to 3:
- S excess: 24 - 3 = 21 ✗ EXCEEDS limit (max 20)
- System LOCKS Medium and Large sizes
- Message: "S and XL sizes need more orders before M/L available"
```

### Proactive Inventory Ordering

**Don't Wait for Orders:**
1. Analyze sales trends (last 30 days)
2. Forecast demand for next 2 weeks
3. Create Purchase Orders (POs) to factories
4. Maintain buffer stock (never run out)

**PO Creation:**
- Manual: Inventory Manager creates PO
- Automated: System suggests POs based on low stock alerts

**Factory Communication:**
- WhatsApp messages (automated via Baileys)
- Email POs
- Track delivery dates

---

## COMMUNITY BRANDS (FORMERLY THIRD-PARTY SELLERS)

### Why Brands Choose LAKOO

**Competitive Comparison:**

| Platform | Commission | Content/Discovery | Checkout |
|----------|-----------|-------------------|----------|
| Tokopedia | 5-10% | No feed | In-app |
| Shopee | 5-15% | No feed | In-app |
| Instagram | 0% | Great feed | External links |
| TikTok Shop | 5-8% | Video feed | In-app |
| **LAKOO** | **0.5%** | **Pinterest-style feed** | **Seamless** |

**Key Differentiators:**
- Lowest commission in market (0.5%)
- Content-first discovery (not buried in search)
- Seamless checkout (unlike Instagram)
- Curated platform (quality brands only)
- We help set up your store

### Brand Onboarding (via Bazaar Sponsorship)

**Primary Path: Bazaar Sponsorship**

```
1. LAKOO approaches brand at bazaar
2. Offers Rp 1,000,000 sponsorship
3. Brand agrees to join LAKOO
4. LAKOO team sets up store + migrates 10 IG posts
5. Brand is live on LAKOO
```

**Secondary Path: Self-Registration (Future)**
- Brand applies online
- LAKOO reviews application
- If approved, brand sets up own store
- Draft approval required for all products

### Brand Tools

**Dashboard:**
- Sales overview (today, week, month)
- Order management (pending, shipped, delivered)
- Product management (add, edit, delete) - all drafts reviewed
- Inventory tracking
- Content posting (for feed)
- Analytics and insights

**Content Tools:**
- Post creator (photos + product tags)
- Content calendar
- Performance analytics (views, saves, clicks)
- Sponsored post campaigns

**Analytics:**
- Feed performance (impressions, engagement)
- Traffic sources
- Conversion funnel
- Follower growth
- Top performing content

### Brand Payouts

**Payout Schedule:** Weekly (every Monday)

**Payout Calculation:**
```
Week's sales: Rp 10,000,000
- LAKOO commission (0.5%): Rp 50,000
- Xendit fees (3%): Rp 300,000
- Sponsored post spend: Rp 200,000 (if ran ads)
────────────────────────────────
Payout to brand: Rp 9,450,000
```

**Payout Methods:**
- Bank transfer (Indonesian banks)
- E-wallet (GoPay, OVO, DANA)

---

## ADVERTISING SYSTEM

### Core Principle

**Brands pay 0.5% commission + can boost content for visibility.**

Similar to Instagram's sponsored posts - brands can pay to have their content shown to more users in the discovery feed.

### Primary Ad Type: Sponsored Posts

**What it is:** Brand's post appears in more users' feeds with "Sponsored" label

```
┌─────────────────────────────────────────────────────────────┐
│  DISCOVERY FEED                                              │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ [Image]     │  │ [Image]     │  │ [Image]     │         │
│  │             │  │ Sponsored   │  │             │         │
│  │ Organic     │  │ @hijabbrand │  │ Organic     │         │
│  │ @user       │  │ ♡ 234       │  │ @brand      │         │
│  │ ♡ 89        │  │ [Shop Now]  │  │ ♡ 156       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

**How It Works:**
1. Brand creates a regular post (product photos, styling content)
2. Brand selects "Boost this post"
3. Sets target audience (optional: age, location, interests)
4. Sets budget and duration
5. Post appears in more feeds with "Sponsored" label

**Pricing Models:**
- **CPM (Cost Per 1000 Impressions):** Rp 15,000 - 30,000
- **CPC (Cost Per Click):** Rp 500 - 2,000

**Targeting Options:**
- Location (Jakarta, Java, All Indonesia)
- Age range
- Interests (hijab, streetwear, modest, etc.)
- Similar to followers of specific brands

### Secondary Ad Types

#### 1. Featured Brand Spot

**What it is:** Brand appears in "Featured Brands" section on homepage/category

**Pricing:** Rp 500K/week per slot

#### 2. Search Results Boost

**What it is:** Brand's products appear higher in search results

**Pricing:** CPC Rp 300 - 1,000 per click

#### 3. Collection Spotlight (Future)

**What it is:** Brand's collection featured in "Collections to Explore" section

**Pricing:** Rp 2M/week

### Advertising Dashboard

**Brand View:**
```
Campaign Performance

Active Campaigns: 1

┌─────────────────────────────────────────────┐
│ Boosted Post: "New Ramadan Collection"      │
│ Status: 🟢 Active                           │
│                                             │
│ Performance (3 days):                       │
│ • Impressions: 45,230                       │
│ • Reach: 32,100 unique users                │
│ • Engagement: 2,340 (5.2%)                  │
│ • Profile visits: 890                       │
│ • Product taps: 456                         │
│ • Orders: 23                                │
│ • Revenue: Rp 4,600,000                     │
│                                             │
│ Budget: Rp 1,000,000                        │
│ Spent: Rp 678,000                           │
│ Remaining: Rp 322,000                       │
│                                             │
│ [Pause] [Edit Targeting] [View Insights]    │
└─────────────────────────────────────────────┘
```

### Ad Revenue Potential

**Assumptions (at scale):**
- 300 community brands on platform
- 30% boost posts regularly (100 brands)
- Average spend: Rp 3M/month per brand

**Monthly Sponsored Post Revenue:**
```
100 brands × Rp 3,000,000 = Rp 300,000,000/month
Annual: Rp 3.6 Billion
```

---

## PLATFORM FEATURES

### For Customers

#### 1. Product Discovery

**Homepage:**
- Hero banners (promotions, featured brands)
- Shop by brand (15 brand cards)
- Trending products
- New arrivals
- Flash sales
- Live shopping (ongoing streams)

**Search:**
- Intelligent search (handles typos, synonyms)
- Autocomplete suggestions
- Filters (price, size, color, brand, rating)
- Sort (relevance, price, newest)

**Categories:**
- Hierarchical navigation (Women → Dresses → Casual Dresses)
- Breadcrumbs for easy backtracking

**Brand Storefronts:**
- Each brand has dedicated page
- Brand story and values
- Curated collections
- Follow brand for updates

#### 2. Product Pages

**Professional Presentation:**
- 10 high-quality photos per product
- Zoom functionality (2x-4x)
- 360° view (if available)
- Video demonstrations
- Product badges ("100% Cotton", "Anti-Crease")

**Variant Selection:**
- Visual size chart
- Color swatches
- Stock availability per variant
- Real-time grosir constraint status

**Product Information:**
- Detailed description
- Material composition
- Care instructions
- Size guide (with model measurements)
- Estimated delivery date

**Social Proof:**
- Customer reviews (star rating, text, photos)
- "True to size" feedback
- Helpful votes on reviews
- Q&A section

#### 3. Shopping Experience

**Cart:**
- Save for later
- Apply voucher codes
- Use wallet balance
- See total with shipping

**Checkout:**
- Multi-step process (clear, not overwhelming)
- Address selection/creation
- Shipping method (economy, regular, express)
- Payment method (bank transfer, e-wallet, credit card, installments)
- Order review before confirming

**Payment Methods:**
- Bank Transfer (all Indonesian banks)
- E-wallets (GoPay, OVO, DANA, ShopeePay)
- Credit/Debit Cards (Visa, Mastercard)
- Installment plans (Kredivo, Akulaku)
- LAKOO Wallet (stored balance)

#### 4. Order Tracking

**Order Status Flow:**
```
To Pay → Processing → Shipped → Delivered → Completed
```

**Order Detail Page:**
- Real-time status updates
- Estimated delivery date
- Tracking number (link to courier)
- Live tracking map
- Order timeline (visual)
- Contact seller button
- Download invoice
- Request return/refund

#### 5. Account Management

**Profile:**
- Edit personal info
- Profile picture
- Preferred categories
- Style preferences

**Addresses:**
- Multiple addresses
- Set default
- Label (Home, Office, etc.)

**Payment Methods:**
- Saved cards
- E-wallet linking

**Order History:**
- Filter (status, date range)
- Reorder functionality
- Track all orders

**Wishlist:**
- Save products for later
- Price drop alerts
- Back-in-stock notifications

**LAKOO Wallet:**
- Check balance
- Top-up
- Withdrawal to bank
- Transaction history
- Wallet can be loaded with refunds, cashback, promotional credits

**Reviews:**
- My reviews
- Edit reviews
- Upload photos to existing reviews

#### 6. Personalization

**Onboarding Quiz (New Users):**
```
Question 1: What's your style?
[Minimalist] [Bohemian] [Streetwear] [Classic] [Edgy]

Question 2: Favorite brands?
[Zara] [H&M] [Uniqlo] [Gap] [Other]

Question 3: Your size?
Top: [S] [M] [L] [XL]

Question 4: Budget per item?
[<100K] [100-300K] [300-500K] [500K+]

Question 5 (Optional): Upload style photos
```

**Result:**
- Personalized homepage feed
- Product recommendations
- Brand recommendations

**Ongoing Learning:**
- Tracks browsing behavior
- Learns from purchases
- Refines recommendations over time

#### 7. Live Shopping

**Live Stream Room:**
- HD video stream
- Product overlay (click to buy)
- Live chat (comment, react)
- Flash sales during stream
- Giveaways and games

**Featured Streams:**
- Daily streams (schedule on homepage)
- Celebrity/influencer hosts
- Brand launches
- Behind-the-scenes factory tours
- Styling sessions

**Viewer Experience:**
- One-tap purchase without leaving stream
- Share stream to social media
- Set reminder for upcoming streams
- Watch replays

#### 8. Fitting Room (Mix & Match) 🆕

**What it is:** Users create virtual outfits by combining items from different stores on a canvas.

```
┌─────────────────────────────────────────────────────────────┐
│  FITTING ROOM                                                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              [Mannequin Canvas]                     │   │
│  │                                                     │   │
│  │    ┌─────┐   Selected: Hijab from @brand_A         │   │
│  │    │ 👤  │   Selected: Blouse from @brand_B        │   │
│  │    │     │   Selected: Pants from @brand_C         │   │
│  │    │     │   Selected: Bag from @brand_D           │   │
│  │    └─────┘                                         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Categories: [Tops] [Pants] [Hijab] [Bags] [Shoes]          │
│                                                              │
│  [Save Look] [Share] [Buy All Items]                        │
└─────────────────────────────────────────────────────────────┘
```

**How it works:**
1. User opens Fitting Room
2. Selects category (e.g., "Tops")
3. Browses products across ALL stores
4. Selects an item → appears on canvas
5. Repeats for other categories
6. Creates a complete outfit look
7. Can save, share, or purchase all items

**MVP Status:** Frontend demo only (no backend integration yet)
- For MVP, this is a frontend-only feature to demonstrate the concept
- Backend (saving looks, sharing) will be implemented in a future phase

**Future Backend (Post-MVP):**
- Save looks to user profile
- Share looks as posts in the feed
- Track which combinations lead to purchases

---

#### 9. Store Page Builder (Taobao-style) 🆕

**What it is:** Sellers can create rich, customized store pages with carousels, banners, and decorations - like Taobao/Tmall.

```
┌─────────────────────────────────────────────────────────────┐
│  STORE PAGE BUILDER (Seller Dashboard)                       │
│                                                              │
│  Drag & Drop Components:                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Banner  │ │Carousel │ │ Grid    │ │  Text   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                              │
│  Live Preview:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Hero Banner - Sale 50% OFF]                        │   │
│  │                                                     │   │
│  │ [Image Carousel: New Arrivals]                      │   │
│  │  ← [img1] [img2] [img3] [img4] →                   │   │
│  │                                                     │   │
│  │ Featured Products:                                  │   │
│  │ ┌───┐ ┌───┐ ┌───┐ ┌───┐                           │   │
│  │ │ P │ │ P │ │ P │ │ P │                           │   │
│  │ └───┘ └───┘ └───┘ └───┘                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [Preview] [Save Draft] [Publish]                           │
└─────────────────────────────────────────────────────────────┘
```

**Available Components:**
| Component | Description |
|-----------|-------------|
| **Hero Banner** | Full-width image with text overlay |
| **Image Carousel** | Swipeable image gallery |
| **Product Grid** | 2x2, 3x3, or 4x4 product layout |
| **Product List** | Vertical product list |
| **Text Block** | Custom text (store description, announcements) |
| **Divider** | Visual separator |
| **Video** | Embedded video player |
| **Collection Link** | Link to product collection |

**How it works (Backend):**
- Store layout saved as JSON in seller-service
- JSON defines component order, types, and content
- Frontend renders components dynamically

**Example Layout JSON:**
```json
{
  "blocks": [
    { "type": "hero_banner", "imageUrl": "...", "text": "Sale 50%" },
    { "type": "carousel", "images": ["...", "...", "..."] },
    { "type": "product_grid", "productIds": ["...", "...", "..."], "columns": 3 }
  ]
}
```

---

#### 10. Customer Service

**Support Channels:**
- Live chat (AI first, human escalation)
- WhatsApp
- Email
- Phone (for urgent issues)
- In-app ticket system

**Self-Service:**
- FAQ/Knowledge base
- Order tracking
- Automated refund requests
- Return label generation

**Response Times:**
- Live chat: <5 minutes (during business hours)
- WhatsApp/Email: <2 hours
- Phone: Immediate
- Tickets: <24 hours

---

### For Sellers (Third-Party)

#### 1. Seller Dashboard

**Overview:**
- Today's sales
- Pending orders (need action)
- Messages from customers
- Low stock alerts
- Performance score (rating, response time)

**Products:**
- Add new product (name, price, images, variants, inventory)
- Bulk upload (CSV)
- Edit existing products
- Mark out of stock
- Duplicate products

**Orders:**
- Filter (pending, packed, shipped, completed)
- Print packing slips
- Print shipping labels (Biteship integration)
- Mark as shipped (upload tracking)
- Bulk processing

**Inventory:**
- Stock levels per variant
- Low stock alerts
- Stock movement history
- Inventory sync (if using external systems)

**Financials:**
- Sales reports (daily, weekly, monthly)
- Payout schedule
- Payout history
- Balance (pending vs. available)
- Ad spend tracking

**Messages:**
- Customer inbox
- Quick replies (canned responses)
- Auto-responders
- Mark as read/unread

**Shop Settings:**
- Shop name, logo, banner
- About/description
- Policies (shipping, returns)
- Business hours
- Vacation mode

#### 2. Page Builder

**Drag-and-Drop Interface:**
- Component library (banners, product grids, text, images)
- Pre-built templates (10+ full-page templates)
- Live preview
- Mobile/tablet/desktop view toggle
- Publish/unpublish pages

**Customization:**
- Upload images
- Edit text inline
- Select products from catalog
- Choose colors (from brand palette)
- Adjust spacing/layout

**Pages You Can Build:**
- Homepage (main shop page)
- Collections (seasonal, themed)
- About page
- Contact page

#### 3. Advertising

**Campaign Manager:**
- Create new campaign (wizard)
- Choose ad type (sponsored search, banner, category)
- Set budget and schedule
- View performance analytics
- Pause/resume campaigns

**Top-Up Balance:**
- Add funds to ad account
- Payment methods (same as customer checkout)
- Bonus for large top-ups (e.g., top-up Rp 10M, get 5% bonus)

**Reports:**
- Impressions, clicks, conversions
- ROI by campaign
- Best performing products
- Keyword performance (for search ads)
- Hour-of-day analysis

#### 4. Analytics

**Traffic:**
- Page views
- Unique visitors
- Referral sources (social media, Google, direct)
- Search terms used to find shop

**Sales:**
- Revenue trends
- Average order value
- Conversion rate
- Cart abandonment rate
- Repeat customer rate

**Products:**
- Best sellers
- Low performers
- View-to-purchase ratio

**Customers:**
- New vs. returning
- Customer demographics (age, location)
- Lifetime value

---

### For Brand Managers (Internal)

#### 1. Brand Dashboard

**Performance:**
- Sales (today, week, month, year)
- Revenue
- Orders
- Average order value
- Conversion rate
- Top products
- Customer demographics

**Product Curation:**
- Browse warehouse catalog
- Assign products to brand
- Set brand-specific pricing
- Set discount pricing
- Mark products as featured
- Create collections

**Storefront Editor:**
- Visual page builder (same as seller page builder)
- Brand-specific templates
- Maintain brand identity (colors, fonts)

**Content Management:**
- Upload brand story
- Add team photos
- Create blog posts
- Upload lookbooks

#### 2. Social Media Management

**Content Calendar:**
- Schedule Instagram posts
- Schedule TikTok videos
- Schedule Stories
- Plan campaigns

**Content Creation:**
- Access to photography studio
- Access to models
- Access to props
- Editing software

**Analytics:**
- Follower growth
- Engagement rate (likes, comments, shares)
- Link clicks to products
- Traffic driven to storefront
- Sales attributed to social media

**Campaigns:**
- Monthly campaign planning
- Influencer collaborations
- User-generated content campaigns
- Contests and giveaways

#### 3. Marketing Budget

**Monthly Budget:** Rp 20M per brand

**Allocation:**
- Paid ads (Instagram, TikTok, Google): Rp 10M
- Influencer partnerships: Rp 5M
- Props, styling, misc: Rp 3M
- Giveaways: Rp 2M

**Approval Process:**
- Campaigns >Rp 5M require CMO approval
- Monthly budget review
- ROI tracking

---

### For Admins (Internal)

#### 1. Super Admin Dashboard

**Platform Overview:**
- Total users (customers + sellers)
- Active orders (last 24 hours)
- Revenue (today, week, month)
- Top selling products
- System health (API response time, errors)

**Pending Actions:**
- Seller verifications (approve/reject)
- Product moderations (approve/reject)
- Ad campaign approvals
- Refund requests (review exceptions)
- Customer disputes

#### 2. User Management

**Customers:**
- View all users
- Search/filter (name, email, phone, registration date)
- View user details (orders, reviews, wallet)
- Suspend/ban accounts (spam, fraud)
- Reset passwords
- Adjust wallet balance (for CS resolutions)

**Sellers:**
- View all sellers
- Verification queue
- Performance monitoring (rating, response time, order fulfillment)
- Suspend/ban sellers (policy violations)
- Adjust commission (if special deals)

#### 3. Brand Management

**Configure 15 Brands:**
- Create/edit brands
- Set brand managers
- Monitor brand performance
- Rebalance inventory between brands

**Brand Settings:**
- Brand name, slug, logo
- Brand story
- Target audience
- Price multiplier (vs. warehouse cost)
- Color palette
- Font choices

#### 4. Product Moderation

**Approval Queue:**
- Review new products from sellers
- Check photos (quality, appropriateness)
- Check descriptions (accuracy, no prohibited items)
- Approve/reject with reason

**Bulk Actions:**
- Approve all from trusted sellers
- Reject all from new sellers (until established)

**Policy Enforcement:**
- Prohibited items (weapons, drugs, counterfeit)
- Copyright violations
- Inappropriate content

#### 5. Order Management

**Search Orders:**
- By order ID, customer, seller, product
- Filter by status, date range, amount

**Manual Interventions:**
- Cancel orders (with refund)
- Mark as shipped (if seller forgot)
- Extend delivery timeframe
- Issue refunds

**Dispute Resolution:**
- Customer vs. seller disputes
- Review evidence (photos, messages)
- Make final decision
- Issue refunds or deny

#### 6. Financial Controls

**Settlement Approval:**
- Review weekly payouts to sellers
- Approve/hold payouts (if fraud suspected)
- Adjust for refunds/returns

**Refund Management:**
- Manual refund issuance
- Bulk refunds (if platform error)

**Commission Settings:**
- Set default commission rates (currently 0%)
- Special deals for large sellers

**Reports:**
- Revenue by brand
- Revenue by seller
- Gateway fees
- Ad revenue
- Net profit

#### 7. Warehouse Control

**Inventory Overview:**
- Real-time stock levels (all products, all variants)
- Reserved inventory (pending orders)
- Available inventory
- Low stock alerts

**Purchase Orders:**
- View all POs (pending, shipped, received)
- Create manual POs
- Approve POs (if >Rp 50M)
- Track factory deliveries

**Grosir Monitoring:**
- Current tolerance status per variant
- Locked variants (excess too high)
- Bundle utilization efficiency
- Recommendations (which products to order)

**Warehouse Operations:**
- Receiving (log incoming shipments)
- Quality control (accept/reject)
- Stock adjustments (damage, loss, found)
- Cycle counting (regular inventory audits)

#### 8. Content Management

**Homepage:**
- Edit hero banners
- Feature brands
- Feature products
- Manage flash sales

**Static Pages:**
- Edit About Us
- Edit FAQ
- Edit Terms & Conditions
- Edit Privacy Policy

**Blog:**
- Create blog posts
- Fashion tips
- Style guides
- Behind-the-scenes

**Email Templates:**
- Order confirmation
- Shipping notification
- Delivery confirmation
- Promotional emails

#### 9. System Configuration

**General Settings:**
- Site name, logo, favicon
- Default currency (IDR)
- Default language (Indonesian)
- Time zone (Asia/Jakarta)

**Feature Toggles:**
- Enable/disable live streaming
- Enable/disable AI recommendations
- Enable/disable seller marketplace
- Enable/disable specific payment methods

**Shipping Settings:**
- Courier partners (Biteship)
- Free shipping threshold
- Shipping subsidies
- Same-day delivery zones

**Payment Settings:**
- Payment gateway (Xendit)
- Supported payment methods
- Installment plans
- Gateway fees

**Tax Settings:**
- VAT rate (11% in Indonesia)
- Tax ID
- Tax invoicing

#### 10. Security & Compliance

**Activity Logs:**
- Admin actions (who did what, when)
- Failed login attempts
- Suspicious activity

**Fraud Detection:**
- Duplicate accounts
- Suspicious orders (high value, multiple addresses)
- Bot activity
- Fake reviews

**GDPR/Privacy:**
- Data export (user requests their data)
- Data deletion (right to be forgotten)
- Privacy policy compliance

---

## MARKETING STRATEGY

### 1. Primary Strategy: Bazaar Sponsorship (Brand Acquisition)

**This is our main growth engine.** Instead of spending on digital ads, we acquire brands (and their communities) directly through bazaar sponsorship.

#### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  BAZAAR SPONSORSHIP FLYWHEEL                                 │
│                                                              │
│  Sponsor Bazaar (Rp 1M)                                     │
│         ↓                                                   │
│  Brand joins LAKOO                                          │
│         ↓                                                   │
│  Brand posts content                                        │
│         ↓                                                   │
│  Brand's community discovers LAKOO                          │
│         ↓                                                   │
│  Users browse, save, follow, buy                            │
│         ↓                                                   │
│  More traffic attracts more brands                          │
│         ↓                                                   │
│  More brands = more content = more users                    │
│         ↓                                                   │
│  Repeat (network effect)                                    │
└─────────────────────────────────────────────────────────────┘
```

#### Monthly Targets (Bootstrap - 5 Founders)

> **Reality:** With 5 founders doing everything, we can realistically attend 4-6 bazaar events per month (weekends only).

| Month | Bazaar Events | Brands Onboarded | Total Brands | Monthly Spend |
|-------|--------------|------------------|--------------|---------------|
| 1 | 2 | 5 | 5 | Rp 5M |
| 2 | 4 | 10 | 15 | Rp 10M |
| 3 | 4 | 12 | 27 | Rp 12M |
| 4 | 5 | 15 | 42 | Rp 15M |
| 5 | 5 | 15 | 57 | Rp 15M |
| 6 | 6 | 18 | 75 | Rp 18M |

**6-Month Goal (Realistic):** 75 community brands on LAKOO
**12-Month Goal:** 150-200 community brands

#### Bazaar Team (Bootstrap)

**Staffing: Founders Only**
- CEO + Operations founder attend bazaar events (weekends)
- Design/Marketing founder handles social outreach
- CTO + Frontend founder handle onboarding (store setup, IG migration)

**Process:**
1. Scouts identify upcoming bazaars (Jakarta/Java focus)
2. Scouts attend and approach qualifying brands
3. Pitch LAKOO + Rp 1M sponsorship offer
4. If brand agrees, collect info and payment details
5. Onboarding team sets up store within 48 hours
6. Brand reviews and goes live

### 2. Content Marketing (Platform-Level)

#### Platform Social Media

**LAKOO's own Instagram/TikTok channels** promote the platform and featured brands.

**Content Types:**
- "Brand of the Week" spotlights
- User-generated content reposts (with permission)
- Styling tips and trends
- Behind-the-scenes of bazaar events
- Success stories from brands

**Goal:** Drive app downloads and brand awareness

#### User-Generated Content Incentives

**Encourage users to post reviews and content:**

1. **Post-Purchase Prompts**
   - "Love your new outfit? Share a photo review!"
   - Users who post reviews get Rp 10K wallet credit

2. **Weekly Styling Challenges**
   - "#LAKOOstyle of the week"
   - Best posts featured on homepage
   - Winner gets Rp 500K shopping credit

3. **Affiliate Program**
   - Users earn 2-5% on sales from their posts
   - Tracks which posts drive purchases
   - Paid monthly to user's wallet

### 3. Live Commerce (Phase 2)

**Deprioritized for MVP.** Focus on feed-based discovery first.

**Future Implementation:**
- Brand owners can go live from their own locations
- Featured live streams from LAKOO studio
- Community brands showcase products
- Lower production cost (brands do it themselves)

### 4. Influencer Strategy (Lean Approach)

Instead of paying influencers directly, leverage the affiliate program:

**Micro-Influencers (10K-100K followers):**
- Invite to join as creators on LAKOO
- They earn affiliate commission on sales
- No upfront cost to LAKOO
- Performance-based only

**Gifting Program:**
- Send free products to select influencers
- No posting requirement (but most will post)
- Cost: Product value only
- Target: 20-30 influencers/month

### 5. Word of Mouth / Community

**Leverage Indonesian community culture:**

**Referral Program:**
- Existing user invites friend
- Friend gets 10% off first order
- User gets Rp 25K credit when friend orders
- Track referral chains

**Community Events (Future):**
- LAKOO meetups at bazaars
- Creator gatherings
- Brand networking events

### Marketing Budget Allocation (Bootstrap Reality)

> **We have no marketing budget beyond bazaar sponsorships.** Founders do organic marketing.

```
┌─────────────────────────────────────────────────────────────┐
│  MONTHLY MARKETING BUDGET: Rp 10,000,000 (Bootstrap)        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Bazaar Sponsorships:     Rp 10,000,000  (100%)             │
│  └─ 10 brands × Rp 1M                                       │
│  └─ This IS our marketing - brands bring their audience     │
│                                                              │
│  Digital Ads:             Rp 0                              │
│  └─ No budget - rely on organic + brand communities         │
│                                                              │
│  Influencer:              Rp 0                              │
│  └─ Product gifting only (when we have house brand stock)   │
│                                                              │
│  UGC Incentives:          Rp 0                              │
│  └─ Built into platform (affiliate program, gamification)   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

**Post-Funding Marketing Budget (Future):**
When we raise seed/Series A, scale to Rp 50-100M/month:
- 60% Bazaar sponsorships (50-100 brands/month)
- 25% Digital ads (Instagram, TikTok)
- 10% Influencer partnerships
- 5% UGC incentives
```

### Why This Strategy Works

1. **Bazaar sponsorship is cheap CAC** - Rp 1M per brand (with community) vs. Rp 50K+ per individual user via ads

2. **Brands bring their own audience** - Each brand has engaged followers who become LAKOO users

3. **Content creates itself** - Brands post their own content, users post reviews

4. **Network effects** - More brands → more content → more users → more brands want to join

5. **Community trust** - Indonesian consumers trust community recommendations over ads

### Key Difference from Traditional Marketing

| Traditional E-commerce | LAKOO Social Commerce |
|----------------------|----------------------|
| Pay to acquire users | Pay to acquire brands (who bring users) |
| Create content ourselves | Brands and users create content |
| Push marketing | Pull discovery |
| Fight for attention | Build community |

### 5. Partnership Marketing (Future)
- Influencers get unique discount codes (10% off)
- Influencer earns 5% commission on sales
- No upfront payment

### 4. Quarterly Brand Competition

**"LAKOO Brand Star Challenge"**

**Frequency:** Every 3 months

**Who Can Enter:**
- New fashion brands (<2 years old)
- Indonesian designers
- Must have 10+ product SKUs

**Prizes:**

**Grand Prize (1 winner):**
- Becomes 16th official LAKOO brand
- Rp 500M investment
- 12-month contract
- Free photography, warehousing, fulfillment
- Dedicated brand manager
- Homepage placement for 3 months

**Runner-Up (2 winners):**
- Feature as third-party seller
- Rp 100M advertising credit
- Mentorship

**Top 10 Finalists:**
- Feature in LAKOO blog/social
- Rp 20M ad credit each

**Marketing Value:**
- 500+ brand submissions per quarter
- 50K+ social media engagements
- 100K+ live stream viewers (finals)
- National media coverage

### 5. Partnership Marketing

**Exclusive Releases with Established Brands:**

**Target Partners:**
- Global: Zara, Uniqlo, H&M
- Regional: Cotton On, Mango
- Local: Erigo, 3Second, This Is April

**Partnership Model:**
- Exclusive collection launch (only on LAKOO)
- Limited edition (1,000-5,000 units)
- 30-60 day exclusivity
- Co-branded campaign

**Value Proposition:**
- For Brand: Market testing, data insights, access to LAKOO customers
- For LAKOO: Borrowed credibility, traffic influx, PR coverage

**Example Deal:**
- Collection value: Rp 1B (retail)
- LAKOO offers: Rp 800M (20% discount)
- LAKOO pays partner: Rp 600M (includes Rp 100M subsidy)
- LAKOO margin: Rp 200M
- Real value: Customer acquisition (10,000 new customers)

**Frequency:** 4-5 major partnerships per quarter

---

## TECHNOLOGY STACK

### Frontend

**Web:**
- Framework: Next.js 14+ (React with SSR/ISR)
- State: Zustand or Redux
- Styling: Tailwind CSS + shadcn/ui components
- Real-time: Socket.io (live streaming, chat)

**Mobile:**
- Framework: React Native or Flutter
- State: Redux Toolkit (RN) or Riverpod (Flutter)
- Navigation: React Navigation or Flutter Navigator

### Backend

**Architecture:** Microservices

**Services:**
1. User/Auth Service - Authentication, user profiles
2. Brand Service - 15 brand management
3. Product Service - Product catalog (TypeScript → migrating to Go)
4. Warehouse Service - Inventory, grosir allocation
5. Order Service - Order management
6. Payment Service - Xendit integration, refunds
7. Logistics Service - Biteship integration, tracking
8. Seller Service - Third-party seller management
9. Advertising Service - Ad campaigns, tracking, billing
10. Notification Service - Email, SMS, push notifications
11. Live Streaming Service - Stream management, chat
12. Customer Service Service - Tickets, chat, refunds
13. Review Service - Product reviews, ratings
14. Analytics Service - Business intelligence, reports

**Language:** Node.js (TypeScript), Go (for performance-critical services)

**Framework:** Express.js (Node), Gin (Go)

**Database:** PostgreSQL (primary), Redis (caching, sessions)

**ORM:** Prisma (TypeScript), GORM (Go)

**API Gateway:** Kong or custom (routing, rate limiting, auth)

**Message Queue:** RabbitMQ or Kafka (async processing)

### Third-Party Integrations

**Payment:** Xendit (invoices, webhooks, disbursements)

**Logistics:** Biteship (rates, booking, tracking)

**Storage:** AWS S3 or Google Cloud Storage (images, videos)

**Email:** SendGrid or AWS SES (transactional, marketing)

**SMS:** Twilio or Infobip (OTP, notifications)

**Push Notifications:** Firebase Cloud Messaging

**WhatsApp:** Baileys or Twilio (factory POs, customer support)

**Live Streaming:** Agora, Mux, or AWS IVS (low-latency video)

**Search:** Elasticsearch or Algolia (product search)

**Analytics:** Google Analytics 4, Mixpanel (product analytics)

**Monitoring:** Sentry (errors), DataDog or New Relic (APM)

### Infrastructure

**Cloud:** AWS or Google Cloud Platform

**Containers:** Docker

**Orchestration:** Kubernetes (for scaling microservices)

**CI/CD:** GitHub Actions or GitLab CI

**CDN:** Cloudflare (fast global delivery of images/assets)

---

## TEAM STRUCTURE

### Current Reality: 5 Founders (Bootstrap Phase)

> **We are bootstrapping.** No employees, no salaries. 5 founders doing everything.

```
┌─────────────────────────────────────────────────────────────┐
│  FOUNDING TEAM (5 People)                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  👤 FOUNDER 1 - CEO / Product                               │
│     • Overall vision and strategy                           │
│     • Product decisions and roadmap                         │
│     • Investor relations (when needed)                      │
│     • Bazaar partnerships (face of the company)             │
│                                                              │
│  👤 FOUNDER 2 - CTO / Backend Lead                          │
│     • Backend architecture (18 microservices)               │
│     • Database design and DevOps                            │
│     • API development                                       │
│     • Infrastructure management                             │
│                                                              │
│  👤 FOUNDER 3 - Frontend / Mobile Lead                      │
│     • Web app (Next.js PWA)                                 │
│     • Mobile app (React Native)                             │
│     • UI implementation                                     │
│                                                              │
│  👤 FOUNDER 4 - Design / Marketing                          │
│     • UI/UX design                                          │
│     • Brand identity                                        │
│     • Social media content                                  │
│     • Bazaar scouting and outreach                         │
│                                                              │
│  👤 FOUNDER 5 - Operations / BD                             │
│     • Seller onboarding and support                         │
│     • Customer service (early stage)                        │
│     • Bazaar event attendance                               │
│     • Quality control / content moderation                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### External Support (Part-Time/Contract)

```
┌─────────────────────────────────────────────────────────────┐
│  CONTRACTORS / PART-TIME                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Accountant (Part-Time)                                  │
│     • Monthly bookkeeping                                   │
│     • Financial reporting                                   │
│     • Cost: ~Rp 1,500,000/month                            │
│                                                              │
│  📋 Tax Consultant (Quarterly)                              │
│     • Tax compliance                                        │
│     • Annual tax filing                                     │
│     • Cost: ~Rp 2,000,000/quarter                          │
│                                                              │
│  🎨 Freelance Designers (As Needed)                         │
│     • Marketing materials                                   │
│     • Bazaar booth design                                   │
│     • Cost: Project-based                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### TOTAL TEAM: 5 Founders + 2 Part-Time Contractors

---

### Future Hiring Plan (Post-Funding / Post-Traction)

> **Only hire when absolutely necessary.** Each hire should be justified by clear bottleneck.

**First Hires (When MAU > 10K or Post-Seed):**

| Priority | Role | Trigger | Est. Salary |
|----------|------|---------|-------------|
| 1 | Customer Service | >50 tickets/day | Rp 5-7M/mo |
| 2 | Content Moderator | >100 products/day pending | Rp 4-6M/mo |
| 3 | Bazaar Scout | >20 events/month target | Rp 5-7M/mo |

**Later Hires (Series A / Scaling):**
- Additional developers (backend/frontend)
- Marketing specialist
- Finance manager
- More CS agents

**Philosophy:** Stay lean. Founders do everything until it's physically impossible.

---

## SUCCESS METRICS

### North Star Metric (Phase 1: First 6 Months)

**TRAFFIC** - Monthly Active Users (MAU) and engagement

**Why Traffic First:**
- Traffic attracts brands ("we want to be where the users are")
- Traffic attracts investors ("show us your growth")
- Revenue follows traffic, not the other way around

**Target Month 6:** 10,000 MAU (realistic bootstrap target)

### North Star Metric (Phase 2: Month 7-12)

**GMV (Gross Merchandise Value):** Total value of all orders

**Target Year 1:** Rp 1-2 Billion GMV (realistic for 150 brands)

### Key Performance Indicators (KPIs) - Realistic Bootstrap Targets

#### Traffic & Engagement Metrics (PRIORITY)

**User Acquisition (Bootstrap Reality):**
| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| MAU | 1,000 | 10,000 | 50,000 |
| DAU | 100 | 1,500 | 10,000 |
| New users/month | 500 | 3,000 | 15,000 |

> These numbers assume organic growth from brand communities only, no paid ads.

**Engagement (Social Metrics):**
| Metric | Target |
|--------|--------|
| Avg. session duration | >3 minutes |
| Posts viewed per session | >10 |
| Likes per user per session | >3 |
| Saves per user per week | >5 |
| Comments per post (avg) | >1 |
| Follow rate (users following brands) | >20% |

**Content Metrics:**
| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Total posts on platform | 300 | 1,500 | 5,000 |
| Posts per day (new) | 5 | 15 | 30 |
| User-generated posts | 20 | 200 | 1,000 |
| Avg. engagement rate | >2% | >3% | >4% |

#### Brand Acquisition Metrics (Bootstrap)

**Community Brands:**
| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Total brands | 27 | 75 | 150 |
| New brands/month | 10 | 15 | 15 |
| Active brands (posting) | 60% | 65% | 70% |
| Brands with sales | 30% | 45% | 55% |

**Brand Performance:**
| Metric | Target |
|--------|--------|
| Avg. followers per brand | 100+ |
| Avg. products per brand | 10+ |
| Avg. posts per brand/month | 4+ |
| Brand retention (still active after 3 months) | >70% |

**Bazaar Sponsorship Efficiency (Founders Only):**
| Metric | Target |
|--------|--------|
| Bazaar events/month | 4-6 |
| Brands approached per event | 8-10 |
| Conversion rate | 40%+ |
| Cost per brand | Rp 1,000,000 |
| Community value per brand (followers brought) | 500+ |

#### Commerce Metrics (Phase 2 Focus)

**Conversion:**
| Metric | Target |
|--------|--------|
| Browse-to-purchase rate | 1-2% |
| Add-to-cart rate | 8-12% |
| Cart completion rate | 50%+ |
| Avg. order value (AOV) | Rp 180,000 |

**GMV Growth (Realistic):**
| Metric | Month 6 | Month 9 | Month 12 |
|--------|---------|---------|----------|
| Monthly GMV | Rp 50M | Rp 150M | Rp 300M |
| Orders/month | 250 | 800 | 1,500 |
| Repeat purchase rate | 10% | 15% | 25% |

#### Quality Metrics

**Draft Approval:**
| Metric | Target |
|--------|--------|
| Products submitted/day | 100-300 |
| Approval rate | 85%+ |
| Review turnaround | <48 hours |
| Rejection reasons tracked | Yes |

**Platform Trust:**
| Metric | Target |
|--------|--------|
| Order fulfillment rate | >95% |
| On-time delivery | >90% |
| Return/refund rate | <5% |
| Customer satisfaction (CSAT) | >85% |

#### Financial Metrics (Bootstrap Reality)

**Revenue (Realistic Year 1):**
| Source | Month 6 | Month 12 |
|--------|---------|----------|
| Commission (0.5% GMV) | Rp 250K | Rp 1.5M |
| Sponsored posts | Rp 0 | Rp 15M |
| House brand margins | Rp 0 | Rp 0 |
| **Total Revenue** | **Rp 250K** | **Rp 16.5M** |

> Year 1 total revenue: ~Rp 50-80M (mostly from Month 9-12)

**Costs (Bootstrap - 5 Founders, No Salaries):**
| Item | Monthly |
|------|---------|
| Infrastructure (EC2, DB, etc) | Rp 3.3M |
| Third-party APIs | Rp 1.5M |
| Accountant + Tax | Rp 2M |
| Bazaar sponsorships | Rp 10-15M |
| Operations (misc) | Rp 3M |
| **Total Monthly Burn** | **Rp 20-25M** |

**Runway Calculation:**
```
Initial capital needed:     Rp 200-300M
Monthly burn:               Rp 20-25M
Runway:                     9-12 months

Break-even requirement:     Not expected in Year 1
Focus:                      Traction metrics for fundraising
```

**Path to Sustainability:**
- Month 1-6: Build MVP, prove concept, onboard 75 brands
- Month 7-12: Early traction, prepare for seed round
- Year 2: Raise seed funding OR reach Rp 50M/month revenue

### Fail Criteria (When to Pivot)

**3-Month Check:**
- If MAU < 10,000 → Reassess acquisition strategy
- If brands onboarded < 50 → Reassess bazaar approach
- If engagement rate < 1% → Reassess product/UX

**6-Month Check:**
- If MAU < 50,000 → Major pivot needed
- If no investor interest → Reassess business model
- If brand churn > 50% → Reassess value proposition

---

## GLOSSARY

### Social Commerce Terms

**Social Commerce:** E-commerce integrated with social media features (content, discovery, engagement)

**Xiaohongshu (Little Red Book):** Chinese social commerce platform - our primary inspiration

**Discovery Feed:** Algorithm-driven content feed where users discover products through posts

**Sponsored Post:** Brand post boosted for additional reach (paid advertising)

**Draft Approval:** Quality control process where LAKOO reviews products before they go live

**Community Brand:** Independent brand onboarded through bazaar sponsorship program

**House Brand:** LAKOO-owned brand that fills product gaps only

**Bazaar Sponsorship:** Our acquisition strategy - pay Rp 1M to brands at bazaars to join LAKOO

**Content Creator:** User who posts reviews, styling content, and earns through affiliate program

**Affiliate Link:** Trackable link in user posts that earns commission on sales

### Platform Metrics

**MAU (Monthly Active Users):** Unique users who opened app in last 30 days

**DAU (Daily Active Users):** Unique users who opened app today

**Engagement Rate:** (Likes + Comments + Saves) / Impressions

**GMV (Gross Merchandise Value):** Total value of all transactions (before deductions)

### Advertising Terms

**CPC (Cost Per Click):** Advertising model where brand pays per ad click

**CPM (Cost Per Mille):** Advertising model where brand pays per 1000 impressions

### Business Metrics

**LTV (Lifetime Value):** Total revenue expected from a customer over their lifetime

**CAC (Customer Acquisition Cost):** Cost to acquire one new customer

**AOV (Average Order Value):** Average amount spent per order

### Legacy Terms (House Brands Only)

**Grosir:** Indonesian term for "wholesale" - buying in bulk from factories

**Bundle:** Fixed grouping of product variants that factories ship together

**Tolerance:** Maximum excess inventory allowed per variant before locking (house brands only)

---

## FREQUENTLY ASKED QUESTIONS

### General

**Q: What makes LAKOO different from Tokopedia/Shopee?**

A: LAKOO is a **social commerce platform** - think Pinterest meets Xiaohongshu with seamless checkout. Users discover fashion through a visual feed of content from brands and users, not through search results. We focus on discovery and inspiration, not just transactions.

**Q: What makes LAKOO different from Instagram/TikTok?**

A: Instagram and TikTok are content platforms with commerce bolted on (external links, friction). LAKOO is content + commerce fully integrated - tap any product in any post and buy instantly without leaving the app.

**Q: How do you make money?**

A: We earn from:
1. **0.5% commission** on all community brand transactions (lowest in market)
2. **Sponsored posts** - brands pay to boost their content in the feed
3. **House brand margins** - on gap-filler products only

**Q: What is Xiaohongshu and why are you copying it?**

A: Xiaohongshu (Little Red Book) is China's most successful social commerce platform - users discover products through authentic content, not ads. We're adapting this model for Indonesian fashion, with local brands and bazaar-based acquisition.

### For Users

**Q: How is browsing LAKOO different from Shopee?**

A: On Shopee, you search for what you already want. On LAKOO, you discover things you didn't know you wanted. It's like scrolling Pinterest or Instagram - you see beautiful outfits, styling ideas, and reviews, and you can tap to buy anything instantly.

**Q: Can I post content on LAKOO?**

A: Yes! After purchasing, you can post photo reviews. You can also post outfit photos and styling ideas. If you join our affiliate program, you earn commission when people buy through your posts.

**Q: Are the products real? No fakes?**

A: Yes. Every product goes through our draft approval process before listing. We verify photos are real (not stolen from internet), descriptions are accurate, and products are legitimate. "If it's on LAKOO, it's real."

**Q: Can I return items?**

A: Return policies vary by brand (shown on product page). Most brands offer 7-day returns for unworn items with tags.

### For Brands

**Q: How do I join LAKOO?**

A: Primary way: We approach brands at bazaars and offer Rp 1,000,000 sponsorship. We set up your store and migrate your Instagram content. Secondary way (coming soon): Apply online.

**Q: What's the commission?**

A: Only 0.5% - the lowest in Indonesia. Compare to Shopee (5-15%) and Tokopedia (5-10%). You keep 99.5% of sales (minus payment gateway fees).

**Q: Do I have to pay for visibility?**

A: No. Your organic posts appear in users' feeds based on relevance and engagement. Sponsored posts (paid) get additional reach, but are completely optional.

**Q: What content should I post?**

A: Product photos, styling ideas, behind-the-scenes, new arrivals, customer photos (with permission). Think Instagram-quality content. The better your content, the more users discover you.

**Q: Do I need to approve product listings?**

A: Yes. You upload product drafts, and our team reviews within 24-48 hours to ensure quality. This protects you and the platform from fake products.

### For Team Members

**Q: What's our main focus right now?**

A: **Traffic and brand acquisition.** Revenue comes later. In the first 6 months, we measure success by MAU (users) and number of brands onboarded, not GMV.

**Q: What's the bazaar sponsorship program?**

A: We attend physical bazaars, identify community-heavy brands, offer them Rp 1M cash to join LAKOO. We set up their store and migrate their content. This is our primary acquisition strategy.

**Q: Who handles what?**

A:
- Bazaar team: Find and onboard brands
- Onboarding team: Set up stores, migrate content
- Moderation team: Review product drafts
- Tech team: Build the platform
- Marketing team: Platform-level content and growth

**Q: Where can I see our metrics?**

A: Internal dashboard (link provided on Day 1). Focus metrics: MAU, DAU, brands onboarded, posts per day, engagement rate.

---

## QUICK REFERENCE

### Important Links

- Platform: https://lakoo.id (when launched)
- Internal Dashboard: [TBD]
- Warehouse System: [TBD]
- Slack: [TBD]
- GitHub: [TBD]
- Google Drive: [TBD]

### Key Contacts

- CEO: [Name, phone]
- CTO: [Name, phone]
- CMO: [Name, phone]
- COO: [Name, phone]
- HR: [Name, phone]
- IT Support: [Name, phone]

### Emergency Contacts

- Website Down: [On-call engineer rotation]
- Payment Issues: [Payment team lead]
- Warehouse Emergency: [Warehouse manager]
- Customer Crisis: [CS manager]

### Daily Standup

- Time: 10:00 AM (daily)
- Duration: 15 minutes
- Location: Main office / Zoom
- Format: What did you do yesterday? What will you do today? Any blockers?

### Company Values

1. **Customer First** - Every decision starts with "How does this help customers?"
2. **Quality Over Speed** - Ship when it's ready, not when it's rushed
3. **Transparency** - Share context, metrics, and decisions openly
4. **Ownership** - Take initiative, don't wait for permission
5. **Continuous Learning** - Experiment, measure, iterate, improve

---

## CHANGE LOG

**Version 2.1** (January 2026) - FEATURE CLARIFICATIONS
- Added TL;DR section for quick onboarding
- Added Fitting Room (Mix & Match) feature - frontend demo for MVP
- Added Store Page Builder (Taobao-style seller customization)
- Clarified: Reviews and Posts are SEPARATE (like Xiaohongshu)
- Clarified: Users can tag ANY product from any store
- Clarified: Sellers ARE users (sellers can post, comment, follow, buy from others)
- Updated target audience: Women 17-30, Jakarta focus
- Simplified language for new employee readability

**Version 2.0** (January 2026) - SOCIAL COMMERCE PIVOT
- **Major pivot** from e-commerce to social commerce model
- Added Pinterest-style discovery feed with algorithm
- Added content creation (brand posts, user reviews)
- Introduced bazaar sponsorship acquisition strategy (Rp 1M per brand)
- Changed commission from 0% to 0.5% (still lowest in market)
- Reduced 15 house brands to gap-filler role only
- Added sponsored posts (Instagram-style boosting)
- Added draft approval / quality control for all products
- Added social features (like, save, comment, follow)
- Added creator/affiliate program
- Updated success metrics to prioritize traffic over revenue
- New positioning: "Pinterest + Xiaohongshu + Dianping for Indonesian fashion"

**Version 1.0** (January 2026)
- Initial business model documentation
- Transition from group buying to multi-brand model complete
- 0% commission marketplace model finalized
- 15 brands defined
- Advertising system designed

---

**WELCOME TO LAKOO!**

We're building Indonesia's first social commerce platform for fashion discovery. Think Pinterest meets Xiaohongshu - where users discover beautiful fashion through content, not search.

**Our mission:** Help Indonesian women discover amazing local fashion brands they'd never find on Shopee.

**Our strategy:** Sponsor bazaars to onboard community-heavy brands, then let their communities discover LAKOO through their content.

Read this document thoroughly on your first day. If you have questions, ask your manager or post in #new-employees on Slack.

Your first week:
- Day 1: Read this document, download LAKOO app, explore as a user
- Day 2-3: Shadow a team member in your role
- Day 4-5: Take on first tasks with guidance

We're building something different. Glad you're here!
