# Review Service

Product review and rating service for LAKOO e-commerce platform. Handles customer reviews, ratings, images, votes, reports, seller/brand replies, review requests, and moderation.

## Architecture

This service follows the standardized service patterns:

- **Local Prisma Client**: `src/lib/prisma.ts` - Service-specific database connection
- **Gateway Trust Auth**: `src/middleware/auth.ts` - Authentication via API Gateway headers
- **Validation Middleware**: `src/middleware/validation.ts` - Request validation with express-validator
- **Error Handling**: `src/middleware/error-handler.ts` - Centralized error handling with asyncHandler
- **Outbox Events**: `src/services/outbox.service.ts` - Domain events for eventual consistency
- **Service Auth**: `src/utils/serviceAuth.ts` - Service-to-service HMAC authentication

## API Endpoints

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews/:id` | Public | Get review by ID |
| GET | `/api/reviews/products/:productId` | Public | Get reviews for a product |
| GET | `/api/reviews/products/:productId/summary` | Public | Get review summary |
| POST | `/api/reviews` | User | Create a new review |
| PATCH | `/api/reviews/:id` | Owner | Update a review |
| DELETE | `/api/reviews/:id` | Owner/Admin | Delete a review |
| GET | `/api/reviews/users/:userId` | User | Get user's reviews |

### Review Images

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reviews/:id/images` | Owner | Add image to review |
| DELETE | `/api/reviews/:id/images/:imageId` | Owner | Remove image |

### Votes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reviews/:id/vote` | User | Vote helpful/unhelpful |
| DELETE | `/api/reviews/:id/vote` | User | Remove vote |

### Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reviews/:id/report` | User | Report a review |

### Replies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reviews/:id/replies` | Seller/Brand/Admin | Reply to review |
| PATCH | `/api/reviews/:id/replies/:replyId` | Owner | Update reply |
| DELETE | `/api/reviews/:id/replies/:replyId` | Owner/Admin | Delete reply |

### Review Requests

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews/review-requests` | User | Get pending review requests |
| POST | `/api/reviews/review-requests/:id/skip` | User | Skip a review request |
| POST | `/api/reviews/internal/review-requests` | Internal | Create review request (from Order Service) |

### Moderation (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews/admin/moderation/queue` | Admin | Get moderation queue |
| POST | `/api/reviews/admin/reviews/:id/approve` | Admin | Approve a review |
| POST | `/api/reviews/admin/reviews/:id/reject` | Admin | Reject a review |

## Authentication

### Gateway Authentication
Protected routes require the API Gateway to forward:
- `x-gateway-key`: Shared secret verifying request came from gateway
- `x-user-id`: Authenticated user's ID
- `x-user-role`: User's role (user/seller/brand_manager/admin)

### Service-to-Service Authentication
Internal services use HMAC-based authentication:
- `x-service-auth`: `serviceName:timestamp:signature`
- `x-service-name`: Calling service name

## Domain Events

Events published to the outbox for other services:

### Review Events
| Event | Description | Consumers |
|-------|-------------|-----------|
| `review.created` | New review submitted | Product, Seller, Brand, Notification |
| `review.updated` | Review edited | Product |
| `review.approved` | Review passed moderation | Product |
| `review.rejected` | Review failed moderation | Notification |
| `review.deleted` | Review removed | Product |
| `review.voted` | User voted helpful/unhelpful | Analytics |
| `review.reported` | Review flagged | Moderation |
| `review.replied` | Seller/brand responded | Notification |

### Review Request Events
| Event | Description | Consumers |
|-------|-------------|-----------|
| `review_request.created` | Request created after delivery | Notification |
| `review_request.sent` | Request sent to user | Analytics |
| `review_request.completed` | User submitted review | Analytics |

## Events Consumed

| Event | Source | Action |
|-------|--------|--------|
| `order.delivered` | Order Service | Create review request |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3016 |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NODE_ENV` | Environment mode | development |
| `GATEWAY_SECRET_KEY` | Gateway authentication key | None (dev bypass) |
| `SERVICE_SECRET` | Service-to-service auth secret | None (dev bypass) |
| `ALLOWED_ORIGINS` | CORS allowed origins | http://localhost:3000 |

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run production
pnpm start
```

## File Structure

```
src/
├── config/
│   └── swagger.ts          # Swagger/OpenAPI configuration
├── controllers/
│   └── review.controller.ts # Request handlers
├── lib/
│   └── prisma.ts           # Local Prisma client singleton
├── middleware/
│   ├── auth.ts             # Gateway trust & service auth
│   ├── error-handler.ts    # Error classes & handler
│   └── validation.ts       # Request validators
├── repositories/
│   └── review.repository.ts # Database operations
├── routes/
│   └── review.routes.ts    # Route definitions
├── services/
│   ├── review.service.ts   # Business logic
│   └── outbox.service.ts   # Domain event publishing
├── types/
│   └── index.ts            # TypeScript interfaces
├── utils/
│   └── serviceAuth.ts      # Service auth utilities
└── index.ts                # Application entry point
```

## Database Models

### product_reviews
Main review table with rating, text, verification status, moderation status, and engagement metrics.

### review_images
Images attached to reviews (max 10 per review).

### review_votes
User votes (helpful/unhelpful) on reviews.

### review_reports
Reports for inappropriate reviews.

### review_replies
Seller/brand/admin responses to reviews.

### review_requests
Prompts sent to customers after delivery to leave a review.

### moderation_queue
Queue for admin review moderation.

### product_review_summaries
Aggregated review statistics per product for fast retrieval.

## Integration with Other Services

```
┌─────────────────────────────────────────────────────────────────────┐
│                     REVIEW SERVICE INTEGRATIONS                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CONSUMES FROM:                    PUBLISHES TO:                    │
│  ─────────────                     ─────────────                    │
│  • Order Service                   • Product Service                │
│    └─ order.delivered →              └─ review.approved →           │
│       Create review request            Update product rating        │
│                                                                     │
│  QUERIES:                          • Notification Service           │
│  ────────                            └─ review_request.created →    │
│  • Product Service →                   Send review reminder         │
│    Product details                                                  │
│  • Brand Service →                 • Seller Service                 │
│    Brand details                     └─ review.created →            │
│  • Seller Service →                    Notify seller                │
│    Seller details                                                   │
│                                    • Analytics Service              │
│                                      └─ review.voted →              │
│                                         Track engagement            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Review Lifecycle

1. **Customer purchases product** → Order Service
2. **Order delivered** → Order Service publishes `order.delivered`
3. **Review request created** → Review Service creates request
4. **Notification sent** → Notification Service sends email/push
5. **Customer submits review** → Review Service creates review
6. **Auto-moderation** → Review added to moderation queue
7. **Admin approves** → Review visible on product page
8. **Product rating updated** → Product Service recalculates rating
