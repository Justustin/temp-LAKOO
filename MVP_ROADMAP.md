# 🚀 LAKOO Social Commerce - MVP Roadmap

**Created:** 2026-01-27  
**Target:** Production-Ready MVP  
**Platform:** Social Commerce (Xiaohongshu/Pinterest style)

---

## 📊 Executive Summary

This roadmap outlines all remaining work to achieve a **deployable MVP** for LAKOO's social commerce platform.

**Current Progress:** ~70% complete  
**Estimated Remaining:** 2-3 weeks  
**Core Features:** Product catalog, social posts, product tagging, feeds, payments

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (nginx)                          │
│                    Authentication & Rate Limiting                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  auth-service │         │ user-service  │         │seller-service │
│   (3001)      │         │   (3004)      │         │   (3015)      │
│   🔄 PULL     │         │   🔄 PULL     │         │   ⏳ TODO     │
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│product-service│         │content-service│         │ feed-service  │
│   (3002)      │         │   (3017)      │         │   (3018)      │
│   ✅ DONE     │         │   ✅ DONE     │         │   ✅ DONE     │
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ cart-service  │         │ order-service │         │payment-service│
│   (3003)      │         │   (3006)      │         │   (3007)      │
│   🔄 PULL     │         │   🔄 PULL     │         │   ✅ DONE     │
└───────────────┘         └───────────────┘         └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│warehouse-svc  │         │logistic-svc   │         │address-service│
│   (3012)      │         │   (3009)      │         │   (3010)      │
│   ✅ DONE     │         │   ✅ DONE     │         │   ✅ DONE     │
└───────────────┘         └───────────────┘         └───────────────┘
```

---

## 📋 Service Status Matrix

### ✅ Completed Services (Ready for MVP)

| Service | Port | Database | Status | Tests |
|---------|------|----------|--------|-------|
| payment-service | 3007 | payment_db | ✅ Complete | ⏳ Pending |
| product-service | 3002 | product_db | ✅ Complete | ✅ Passed |
| content-service | 3017 | content_db | ✅ Complete | ✅ Passed |
| feed-service | 3018 | feed_db | ✅ Complete | ✅ Passed |
| warehouse-service | 3012 | warehouse_db | ✅ Complete | ✅ Passed |
| address-service | 3010 | address_db | ✅ Complete | ⏳ Pending |
| logistic-service | 3009 | logistic_db | ✅ Complete | ⏳ Pending |
| brand-service | 3005 | brand_db | ✅ Complete | ⏳ Pending |
| review-service | 3016 | review_db | ✅ Complete | ⏳ Pending |

### 🔄 Services to Pull (User will provide)

| Service | Port | Database | Notes |
|---------|------|----------|-------|
| auth-service | 3001 | auth_db | User authentication, JWT |
| user-service | 3004 | user_db | User profiles |
| order-service | 3006 | order_db | Order management |
| cart-service | 3003 | cart_db | Shopping cart |

### ⏳ Services to Create (After Pull)

| Service | Port | Database | Priority |
|---------|------|----------|----------|
| seller-service | 3015 | seller_db | HIGH |
| notification-service | 3008 | notification_db | MEDIUM |
| wallet-service | 3011 | wallet_db | LOW (MVP optional) |
| advertisement-service | 3013 | ad_db | LOW (Post-MVP) |
| support-service | 3014 | support_db | LOW (Post-MVP) |

---

## 🎯 MVP Feature Scope

### Core Features (MUST HAVE)

| Feature | Services Involved | Status |
|---------|-------------------|--------|
| User Registration/Login | auth-service | 🔄 Pull |
| User Profiles | user-service | 🔄 Pull |
| Browse Products | product-service | ✅ Done |
| Product Categories | product-service | ✅ Done |
| Create Posts | content-service | ✅ Done |
| Tag Products in Posts | content-service + product-service | ✅ Done |
| Like/Comment on Posts | content-service | ✅ Done |
| Follow Users | feed-service | ✅ Done |
| Personalized Feed | feed-service | ✅ Done |
| Add to Cart | cart-service | 🔄 Pull |
| Checkout | order-service + payment-service | 🔄 Pull |
| Order Tracking | order-service | 🔄 Pull |
| Shipping Calculation | logistic-service | ✅ Done |
| Address Management | address-service | ✅ Done |

### Nice-to-Have (MVP+)

| Feature | Services Involved | Status |
|---------|-------------------|--------|
| Seller Registration | seller-service | ⏳ Todo |
| Seller Product Drafts | seller-service + product-service | ⏳ Todo |
| Push Notifications | notification-service | ⏳ Todo |
| Wallet/Balance | wallet-service | ⏳ Todo |
| Sponsored Posts | advertisement-service | ⏳ Post-MVP |
| Customer Support | support-service | ⏳ Post-MVP |

---

## 📅 Implementation Phases

### Phase 1: Service Integration (Week 1) 🔄

**Goal:** Integrate pulled services with existing infrastructure

#### 1.1 Pull and Setup Services
```bash
# After pulling auth-service, user-service, order-service, cart-service
# For each service:
cd backend/services/<service-name>
pnpm install
npx prisma generate
npx prisma db push
npm run build
```

#### 1.2 Schema Standardization
- [ ] Verify all pulled services use snake_case database columns
- [ ] Add `@map` directives if missing
- [ ] Push schemas to Neon

#### 1.3 Integration Points to Verify

| From | To | Endpoint | Purpose |
|------|-----|----------|---------|
| API Gateway | auth-service | POST /api/auth/login | User login |
| API Gateway | auth-service | POST /api/auth/register | User registration |
| All services | auth-service | GET /api/auth/verify | Token verification |
| content-service | user-service | GET /api/users/:id | Get user profile |
| cart-service | product-service | GET /api/products/:id | Product details |
| cart-service | warehouse-service | POST /api/inventory/check | Stock check |
| order-service | cart-service | GET /api/cart/:userId | Get cart items |
| order-service | payment-service | POST /api/payments | Create payment |
| order-service | warehouse-service | POST /api/inventory/reserve | Reserve stock |

---

### Phase 2: Seller Service (Week 1-2) ⏳

**Goal:** Enable seller product listings

#### 2.1 Create seller-service
- [ ] Create `AGENT_PROMPT_SELLER_SERVICE.md`
- [ ] Implement seller registration
- [ ] Implement seller verification workflow
- [ ] Implement seller inventory management
- [ ] Connect to product-service drafts

#### 2.2 Key Features
```
seller-service/
├── Seller registration
├── Seller verification (manual approval)
├── Seller profiles
├── Seller inventory (SellerInventory table)
├── Seller payouts
└── Connect to product drafts
```

#### 2.3 Integration Points
| From | To | Purpose |
|------|-----|---------|
| seller-service | auth-service | Verify seller identity |
| seller-service | product-service | Create product drafts |
| product-service | seller-service | Update seller stats |
| order-service | seller-service | Notify seller of orders |
| payment-service | seller-service | Process seller payouts |

---

### Phase 3: Event-Driven Integration (Week 2) 🔄

**Goal:** Enable real-time updates across services

#### 3.1 Event Bus Setup
Options:
- **Option A:** Redis Pub/Sub (Simple, good for MVP)
- **Option B:** Kafka (Scalable, production-ready)
- **Option C:** Polling with Outbox (Current pattern)

#### 3.2 Critical Event Flows

```
POST CREATED:
content-service → feed-service
  ├── Fan-out to followers' feeds
  └── Update trending scores

ORDER PAID:
payment-service → order-service
  ├── Update order status
  └── Confirm inventory reservation

payment-service → warehouse-service
  └── Confirm reservation

payment-service → notification-service
  └── Send payment confirmation

ORDER SHIPPED:
order-service → notification-service
  └── Send shipping notification

PRODUCT APPROVED:
product-service → content-service
  └── Product now taggable

product-service → seller-service
  └── Update seller product count
```

#### 3.3 Implementation Tasks
- [ ] Choose event bus technology
- [ ] Implement event publishers in all services
- [ ] Implement event consumers
- [ ] Add retry logic for failed events
- [ ] Add dead letter queue for unprocessable events

---

### Phase 4: Notification Service (Week 2) ⏳

**Goal:** Enable push notifications

#### 4.1 Notification Types
| Type | Trigger | Recipients |
|------|---------|------------|
| order_placed | Order created | Buyer |
| order_paid | Payment confirmed | Buyer, Seller |
| order_shipped | Order shipped | Buyer |
| order_delivered | Order delivered | Buyer |
| new_follower | User followed | Followee |
| post_liked | Post liked | Post author |
| post_commented | Comment added | Post author |
| product_approved | Draft approved | Seller |
| product_rejected | Draft rejected | Seller |

#### 4.2 Channels
- [ ] Push notifications (Firebase/OneSignal)
- [ ] Email (SendGrid/SES)
- [ ] SMS (Twilio/local provider)
- [ ] In-app notifications

---

### Phase 5: End-to-End Testing (Week 3) 🧪

**Goal:** Verify complete user journeys

#### 5.1 Critical User Flows

**Flow 1: Buyer Journey**
```
1. Register → Login
2. Browse feed → See posts with product tags
3. Click product tag → View product details
4. Add to cart → View cart
5. Checkout → Enter shipping address
6. Pay → Receive confirmation
7. Track order → Receive delivery
8. Leave review
```

**Flow 2: Seller Journey**
```
1. Register as seller → Verify account
2. Create product draft → Submit for approval
3. Product approved → Live on platform
4. Receive order → Process order
5. Ship order → Update tracking
6. Receive payout
```

**Flow 3: Social Journey**
```
1. Create post → Tag products
2. Add hashtags → Post published
3. Post appears in followers' feeds
4. Users like/comment
5. Post trends → Appears in explore
```

#### 5.2 Integration Test Checklist
- [ ] User registration and login
- [ ] User profile management
- [ ] Product browsing and search
- [ ] Post creation with product tags
- [ ] Feed generation (following, for-you, explore)
- [ ] Cart management
- [ ] Checkout flow
- [ ] Payment processing
- [ ] Order tracking
- [ ] Seller product submission
- [ ] Seller order fulfillment

---

### Phase 6: Deployment Preparation (Week 3) 🚀

**Goal:** Production-ready deployment

#### 6.1 Infrastructure Setup
- [ ] Docker Compose for local development
- [ ] Kubernetes manifests OR Docker Swarm
- [ ] Environment variable management
- [ ] Secrets management (Vault or K8s secrets)
- [ ] SSL certificates

#### 6.2 Database Setup
- [ ] Neon PostgreSQL production databases
- [ ] Connection pooling (PgBouncer or Neon pooler)
- [ ] Backup strategy
- [ ] Migration scripts

#### 6.3 Monitoring & Logging
- [ ] Centralized logging (ELK or CloudWatch)
- [ ] Health check endpoints (all services have /health)
- [ ] Metrics collection (Prometheus)
- [ ] Alerting (PagerDuty or similar)
- [ ] Error tracking (Sentry)

#### 6.4 Security Checklist
- [ ] API Gateway authentication
- [ ] Service-to-service auth (HMAC)
- [ ] Rate limiting
- [ ] Input validation (all services)
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS prevention
- [ ] CORS configuration
- [ ] Helmet.js for HTTP headers

#### 6.5 Performance
- [ ] Database indexes verified
- [ ] Query optimization
- [ ] Caching strategy (Redis)
- [ ] CDN for static assets
- [ ] Image optimization

---

## 🔧 Technical Debt to Address

### Before MVP
| Issue | Service | Priority |
|-------|---------|----------|
| Event consumers not implemented | feed-service | HIGH |
| Feed syndication missing | content-service → feed-service | HIGH |
| Legacy @repo/database imports | product-service (some files) | MEDIUM |

### Post-MVP
| Issue | Service | Priority |
|-------|---------|----------|
| Automated test suite | All | MEDIUM |
| CI/CD pipeline | All | MEDIUM |
| API documentation (Swagger) | All | LOW |
| Performance optimization | All | LOW |

---

## 📊 MVP Success Metrics

### Launch Criteria
- [ ] All 13+ services deployed and healthy
- [ ] End-to-end buyer flow working
- [ ] End-to-end seller flow working (if seller-service done)
- [ ] Payment processing working (test mode)
- [ ] No critical bugs in production

### KPIs to Track
- User registration rate
- Post creation rate
- Product tag clicks
- Conversion rate (view → cart → purchase)
- Order completion rate
- Seller onboarding rate

---

## 🗓️ Timeline Summary

```
Week 1:
├── Day 1-2: Pull and integrate auth, user, cart, order services
├── Day 3-4: Verify integrations, fix issues
└── Day 5: Start seller-service

Week 2:
├── Day 1-3: Complete seller-service
├── Day 4-5: Event bus setup
└── Day 5: Notification service (basic)

Week 3:
├── Day 1-2: End-to-end testing
├── Day 3-4: Bug fixes and polish
└── Day 5: Deployment preparation

Week 4 (Buffer):
├── Final testing
├── Soft launch
└── Monitor and fix
```

---

## 📞 Service Ports Reference

```
auth-service          : 3001 🔄
product-service       : 3002 ✅
cart-service          : 3003 🔄
user-service          : 3004 🔄
brand-service         : 3005 ✅
order-service         : 3006 🔄
payment-service       : 3007 ✅
notification-service  : 3008 ⏳
logistic-service      : 3009 ✅
address-service       : 3010 ✅
wallet-service        : 3011 ⏳
warehouse-service     : 3012 ✅
advertisement-service : 3013 ⏳
support-service       : 3014 ⏳
seller-service        : 3015 ⏳
review-service        : 3016 ✅
content-service       : 3017 ✅
feed-service          : 3018 ✅
```

---

## 🚦 Go-Live Checklist

### Pre-Launch
- [ ] All services deployed
- [ ] Database migrations complete
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] DNS configured
- [ ] Monitoring active
- [ ] Backup systems tested

### Launch Day
- [ ] Health checks passing
- [ ] Smoke tests passing
- [ ] Team on standby
- [ ] Rollback plan ready

### Post-Launch
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] User feedback collection
- [ ] Bug triage process

---

## 📝 Next Immediate Actions

1. **Pull the 4 services** (auth, user, cart, order)
2. **Verify schema standardization** (snake_case)
3. **Test service integrations**
4. **Create seller-service prompt** (if needed)
5. **Set up event bus** (for feed syndication)

---

**Document Status:** ✅ COMPLETE  
**Last Updated:** 2026-01-27  
**Maintained By:** Orchestrator Agent

---

*This roadmap will be updated as progress is made.*
