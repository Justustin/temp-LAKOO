# Review Service Documentation (`backend/services/review-service`)

## 1) Purpose
- Owns product reviews, ratings, images, votes, reports, replies, review requests, and moderation state.
- Maintains review summaries (average rating, rating distribution) per product.
- Emits integration events via **`ServiceOutbox`** (transactional outbox pattern).
- Does **not** own orders, products, or user identities (consumes events from ORDER_SERVICE, PRODUCT_SERVICE, AUTH_SERVICE when needed).

## 2) Architecture (layers & request flow)
- **Routes** (`src/routes/*.routes.ts`): endpoints + `express-validator` rules + `validateRequest`.
- **Controllers** (`src/controllers/*.controller.ts`): HTTP handlers (should be thin).
- **Services** (`src/services/*.service.ts`): business logic + outbox.
- **Repositories** (`src/repositories/*.repository.ts`): Prisma reads/writes.
- **DB schema** (`prisma/schema.prisma`): data model + outbox table.

Typical request flow:
1. Route validates input → `validateRequest`.
2. Auth middleware sets `req.user`.
3. Controller calls service method.
4. Service uses repositories, returns result (errors bubble to `errorHandler`).

## 3) Runtime contracts

### Environment variables
- **`PORT`**: listen port (default `3015`).
- **`NODE_ENV`**: `development|test|production` (affects logging + dev auth bypass).
- **`DATABASE_URL`**: Postgres connection string for Prisma.
- **`GATEWAY_SECRET_KEY`**: verifies gateway traffic (`x-gateway-key`).
- **`SERVICE_SECRET`**: verifies service-to-service HMAC tokens (`x-service-auth` + `x-service-name`).
- **`ORDER_SERVICE_URL`**, **`PRODUCT_SERVICE_URL`**, **`NOTIFICATION_SERVICE_URL`**: upstream service base URLs.
- **`ALLOWED_ORIGINS`**: CORS allowlist.

### Authentication & authorization (gateway + service-to-service)
Gateway-trust (external client traffic via API Gateway):
- Gateway must inject:
  - `x-gateway-key` (must equal `GATEWAY_SECRET_KEY`)
  - `x-user-id` (required)
  - `x-user-role` (optional; `admin`, `user`, `seller`, `brand_owner`)

Service-to-service (internal traffic, no gateway):
- Caller must send:
  - `x-service-auth`: `serviceName:timestamp:signature`
  - `x-service-name`: `serviceName`
- Service verifies token using **`SERVICE_SECRET`** and validates `x-service-name` matches token's serviceName.
- Sets `req.user = { id: <serviceName>, role: 'internal' }`

Role values:
- Use **`internal`** consistently for internal calls (service-to-service).

### Response format
- Most success responses: `200/201` with `{ success: true, data: ... }`
- Delete/remove actions respond `204` with no body.
- Errors are formatted by `src/middleware/error-handler.ts`:
  - `{ success: false, error: string, details?: any }`

## 4) Endpoint map (route → controller → service/repo)
Base route: **`/api/reviews`** → `src/routes/review.routes.ts`

**Reviews (CRUD)**:
- `POST /` → `createReview` (gatewayAuth, user only)
- `GET /:id` → `getReviewById` (gatewayOrInternalAuth)
- `GET /products/:productId` → `getReviewsByProduct` (gatewayOrInternalAuth)
- `GET /user/:userId` → `getReviewsByUser` (gatewayAuth)
- `PATCH /:id` → `updateReview` (gatewayAuth, owner only)
- `DELETE /:id` → `deleteReview` (gatewayAuth, owner or admin)

**Images**:
- `POST /:id/images` → `addImage` (gatewayAuth, owner only)
- `DELETE /:id/images/:imageId` → `deleteImage` (gatewayAuth, owner only)

**Votes**:
- `POST /:id/vote` → `voteReview` (gatewayAuth)
- `DELETE /:id/vote` → `removeVote` (gatewayAuth)

**Reports**:
- `POST /:id/report` → `reportReview` (gatewayAuth)

**Replies** (seller/brand/admin):
- `POST /:id/replies` → `createReply` (gatewayAuth, seller/brand_owner/admin)
- `PATCH /:id/replies/:replyId` → `updateReply` (gatewayAuth, owner)
- `DELETE /:id/replies/:replyId` → `deleteReply` (gatewayAuth, owner or admin)

**Review Requests** (internal):
- `POST /internal/review-requests` → `createReviewRequest` (internalAuth)
- `GET /review-requests` → `getReviewRequests` (gatewayAuth)
- `POST /review-requests/:id/skip` → `skipReviewRequest` (gatewayAuth)

**Moderation** (admin only):
- `GET /moderation/queue` → `getModerationQueue` (gatewayAuth + admin)
- `POST /moderation/:id/approve` → `approveReview` (gatewayAuth + admin)
- `POST /moderation/:id/reject` → `rejectReview` (gatewayAuth + admin)

**Summary**:
- `GET /products/:productId/summary` → `getReviewSummary` (gatewayOrInternalAuth)

## 5) Middleware
Files under `src/middleware/`.

- **`auth.ts`**
  - `gatewayAuth`: verifies gateway headers; sets `req.user`.
  - `gatewayOrInternalAuth`: accepts gateway OR service-to-service HMAC; sets `req.user`.
  - `internalAuth`: service-to-service only (HMAC), validates serviceName matches token.
  - `requireRole(...roles)`: checks `req.user.role`.
  - `requireOwnership(fn)`: checks if user owns the resource (bypassed for admin/internal).
- **`validation.ts`**
  - `validateRequest`: checks `express-validator` results and returns `400` on failure.
  - Validators for reviews, images, votes, reports, replies, moderation.
- **`error-handler.ts`**
  - `AppError` subclasses (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`).
  - Global `errorHandler` middleware.
  - `asyncHandler` wrapper for async controllers.

## 6) Database & Prisma
- Schema: `prisma/schema.prisma`
- Prisma client is generated into `src/generated/prisma`.
- Build copies it into `dist/generated/prisma` using `scripts/copy-generated-prisma.mjs` so `node dist/index.js` works.

Tables:
- `product_reviews`: main review data (rating, title, body, status, verified purchase)
- `review_images`: photos attached to reviews (max 10 per review)
- `review_votes`: helpful/unhelpful votes
- `review_reports`: abuse reports
- `review_replies`: seller/brand/admin responses
- `review_requests`: post-delivery prompts for customers
- `moderation_queue`: items pending admin review
- `product_review_summaries`: cached aggregates per product
- `ServiceOutbox`: integration events

Schema changes:
- MVP/local: `pnpm -C backend/services/review-service db:push`
- Production-grade: prefer migrations (`db:migrate` → generate migration files, `db:migrate:prod` → apply)

## 7) Outbox events
- Table: `ServiceOutbox` (in Prisma schema).
- Writer: `src/services/outbox.service.ts`.
- Emitted events:
  - `review.created` - new review submitted
  - `review.updated` - review edited
  - `review.deleted` - review removed
  - `review.approved` - moderation approved
  - `review.rejected` - moderation rejected
  - `review.reported` - review flagged for abuse
  - `review.voted` - helpful/unhelpful vote cast
  - `review.reply.created` - seller/brand replied
  - `review.request.created` - prompt sent to customer
  - `review.summary.updated` - product rating recalculated

## 8) Local development & scripts
From repo root:
- Install: `pnpm -C backend/services/review-service install`
- Dev: `pnpm -C backend/services/review-service dev`
- Build: `pnpm -C backend/services/review-service build`
- Start built: `pnpm -C backend/services/review-service start`
- Prisma:
  - `db:generate`, `db:push`, `db:migrate`, `db:migrate:prod`, `db:studio`, `db:reset`
- Quality:
  - `lint`, `lint:fix`, `format`

## 9) Docker
- `Dockerfile`: multi-stage image (build + production).
- `docker-compose.yml`: app + db + redis + one-shot db init container (uses `prisma db push`).

Known caveat:
- This service has a **`pnpm-lock.yaml`**, but the `Dockerfile` currently uses **`npm ci`**. `npm ci` requires a `package-lock.json`. Either:
  - switch Dockerfile to pnpm, or
  - add and maintain `package-lock.json`.

## 10) Tests
- Unit tests exist for services (Jest).
- Run: `pnpm -C backend/services/review-service test`
- Coverage: `pnpm -C backend/services/review-service test:coverage`

## 11) Future-me problems / tech debt
- **Verified purchase check**: currently trusts client; should verify against ORDER_SERVICE on review creation.
- **Image upload**: currently stores URLs only; consider integrating with storage service for actual file uploads.
- **Rate limiting**: no per-user rate limits on voting/reporting; could be abused.
- **Summary recalculation**: done synchronously; consider async job for high-volume products.
- **Outbox transactionality**: ideally write domain updates + outbox rows in the same Prisma transaction.

## 12) File-by-file
- `src/index.ts`: Express bootstrap, routes, health, swagger, error handler, shutdown.
- `src/lib/prisma.ts`: Prisma singleton client.
- `src/middleware/*`: auth/validation/error-handler.
- `src/routes/*`: HTTP routes + validators.
- `src/controllers/*`: request handlers.
- `src/services/*`: business logic + outbox publishing.
- `src/repositories/*`: Prisma access layer.
- `src/types/*`: DTOs and interfaces.
- `src/utils/*`: shared helpers (serviceAuth).
- `src/config/swagger.ts`: OpenAPI configuration.
- `scripts/copy-generated-prisma.mjs`: copies generated Prisma client into `dist/`.
