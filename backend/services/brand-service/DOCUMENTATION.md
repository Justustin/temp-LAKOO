# Brand Service Documentation (`backend/services/brand-service`)

## 1) Purpose
- Owns brand state (`Brand`, `BrandProduct`, brand configuration) and exposes brand/product curation APIs.
- Manages the 15 official LAKOO brands plus third-party brand partnerships.
- Emits integration events via **`ServiceOutbox`** (transactional outbox pattern).
- Does **not** own products directly (references via `product_id`), user identities, or orders.

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
- **`PORT`**: listen port (default `3004`).
- **`NODE_ENV`**: `development|test|production` (affects logging + dev auth bypass).
- **`DATABASE_URL`**: Postgres connection string for Prisma.
- **`GATEWAY_SECRET_KEY`**: verifies gateway traffic (`x-gateway-key`).
- **`SERVICE_SECRET`**: verifies service-to-service HMAC tokens (`x-service-auth` + `x-service-name`).
- **`PRODUCT_SERVICE_URL`**: upstream Product Service base URL.
- **`ALLOWED_ORIGINS`**: CORS allowlist.

### Authentication & authorization (gateway + service-to-service)
Gateway-trust (external client traffic via API Gateway):
- Gateway must inject:
  - `x-gateway-key` (must equal `GATEWAY_SECRET_KEY`)
  - `x-user-id` (required)
  - `x-user-role` (optional; `admin`, `user`, `brand_owner`)

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
- Delete actions respond `204` with no body.
- Errors are formatted by `src/middleware/error-handler.ts`:
  - `{ success: false, error: string, details?: any }`

## 4) Endpoint map (route → controller → service/repo)
Base route: **`/api/brands`** → `src/routes/brand.routes.ts`

**Brands (CRUD)**:
- `GET /` → `getBrands` (public, paginated)
- `GET /:id` → `getBrandById` (public)
- `GET /slug/:slug` → `getBrandBySlug` (public)
- `POST /` → `createBrand` (gatewayAuth, admin/brand_owner)
- `PATCH /:id` → `updateBrand` (gatewayAuth, admin/brand_owner)
- `DELETE /:id` → `deleteBrand` (gatewayAuth, admin only)

**Brand Products**:
- `GET /:brandId/products` → `getBrandProducts` (public, paginated)
- `GET /:brandId/products/featured` → `getFeaturedProducts` (public)
- `GET /:brandId/products/bestsellers` → `getBestsellers` (public)
- `GET /:brandId/products/new-arrivals` → `getNewArrivals` (public)
- `GET /:brandId/products/:productId` → `getBrandProduct` (public)
- `POST /:brandId/products` → `addBrandProduct` (gatewayAuth, admin/brand_owner)
- `PATCH /:brandId/products/:productId` → `updateBrandProduct` (gatewayAuth)
- `DELETE /:brandId/products/:productId` → `removeBrandProduct` (gatewayAuth)

## 5) Middleware
Files under `src/middleware/`.

- **`auth.ts`**
  - `gatewayAuth`: verifies gateway headers; sets `req.user`.
  - `gatewayOrInternalAuth`: accepts gateway OR service-to-service HMAC; sets `req.user`.
  - `internalServiceAuth`: service-to-service only (HMAC), validates serviceName matches token.
  - `optionalGatewayAuth`: doesn't fail if no gateway headers.
  - `requireRole(...roles)`: checks `req.user.role`.
- **`validation.ts`**
  - `validateRequest`: checks `express-validator` results and returns `400` on failure.
  - Validators for brands, brand products.
- **`error-handler.ts`**
  - `AppError` subclasses (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`).
  - Global `errorHandler` middleware.
  - `asyncHandler` wrapper for async controllers.

## 6) Database & Prisma
- Schema: `prisma/schema.prisma`
- Prisma client is generated into `src/generated/prisma`.
- Build copies it into `dist/generated/prisma` using `scripts/copy-generated-prisma.mjs` so `node dist/index.js` works.

Tables:
- `brands`: brand entity (name, slug, description, logo, status, metadata)
- `brand_products`: products curated for a brand (pricing overrides, featured flags)
- `ServiceOutbox`: integration events

Schema changes:
- MVP/local: `pnpm -C backend/services/brand-service db:push`
- Production-grade: prefer migrations (`db:migrate` → generate migration files, `db:migrate:prod` → apply)

## 7) Outbox events
- Table: `ServiceOutbox` (in Prisma schema).
- Writer: `src/services/outbox.service.ts`.
- Emitted events:
  - `brand.created` - new brand created
  - `brand.updated` - brand details updated
  - `brand.deleted` - brand soft deleted
  - `brand.status_changed` - brand status changed (active/inactive/draft)
  - `brand_product.added` - product added to brand
  - `brand_product.updated` - brand product details updated
  - `brand_product.removed` - product removed from brand
  - `brand_product.price_changed` - brand product price changed

## 8) Local development & scripts
From repo root:
- Install: `pnpm -C backend/services/brand-service install`
- Dev: `pnpm -C backend/services/brand-service dev`
- Build: `pnpm -C backend/services/brand-service build`
- Start built: `pnpm -C backend/services/brand-service start`
- Prisma:
  - `db:generate`, `db:push`, `db:migrate`, `db:migrate:prod`, `db:studio`, `db:reset`
- Quality:
  - `lint`, `lint:fix`, `format`

## 9) Docker
- `Dockerfile`: multi-stage image (build + production) using pnpm.
- `docker-compose.yml`: app + db + one-shot db init container (uses `prisma db push`).

## 10) Tests
- Unit tests exist for services (Jest).
- Run: `pnpm -C backend/services/brand-service test`
- Coverage: `pnpm -C backend/services/brand-service test:coverage`

## 11) Future-me problems / tech debt
- **Product sync**: currently stores `product_id` only; consider caching product details for performance.
- **Brand analytics**: no analytics tracking yet; consider integrating with analytics service.
- **Image upload**: currently stores URLs only; consider integrating with storage service for brand logos.
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

