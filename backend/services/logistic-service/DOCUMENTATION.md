# Logistic Service Documentation (`backend/services/logistic-service`)

## 1) Purpose
- Owns shipment state (`Shipment`) and tracking events (`TrackingEvent`).
- Provides shipping rates and courier configuration; integrates with **Biteship**.
- Emits integration events via **`ServiceOutbox`**.

## 2) Architecture (layers & request flow)
- **Routes** (`src/routes/*.routes.ts`): endpoints + auth + validation wiring.
- **Controllers** (`src/controllers/*.controller.ts`): request handlers (class-based controllers).
- **Services** (`src/services/*.service.ts`): shipment lifecycle, Biteship calls, rate cache, outbox.
- **Repositories** (`src/repositories/*.repository.ts`): Prisma access for shipments, tracking, couriers, warehouses, rate cache.
- **DB schema** (`prisma/schema.prisma`).

Typical request flow:
1. Route applies auth (`authenticate` / `requireInternalAuth`) and validates body (Zod via `validate(schema)`).
2. Controller calls service/repo.
3. Service writes domain changes + outbox rows.

## 3) Runtime contracts

### Environment variables
- **`PORT`**: listen port (defaults to `3009`).
- **`NODE_ENV`**: `development|test|production`.
- **`LOGISTICS_DATABASE_URL`**: Postgres connection string for Prisma.
- **`GATEWAY_SECRET_KEY`**: verifies gateway traffic (`x-gateway-key`).
- **`SERVICE_SECRET`**: verifies service-to-service HMAC (`x-service-auth` + `x-service-name`).
- **`ALLOWED_ORIGINS`**: CORS allowlist.

External services:
- **`BITESHIP_BASE_URL`**, **`BITESHIP_API_KEY`**, **`BITESHIP_WEBHOOK_SECRET`**
- **`ORDER_SERVICE_URL`** (default `http://localhost:3006`)
- **`NOTIFICATION_SERVICE_URL`** (default `http://localhost:3008`)

Caching:
- **`RATE_CACHE_TTL_HOURS`**

### Authentication & authorization (gateway + service-to-service)
Gateway-trust:
- `x-gateway-key` must equal `GATEWAY_SECRET_KEY`
- `x-user-id` required
- `x-user-role` optional

Service-to-service HMAC:
- `x-service-auth`: `serviceName:timestamp:signature`
- `x-service-name`: `serviceName`
- Verified using `SERVICE_SECRET`
- Sets `req.user.role = 'internal'`

Role values:
- Use **`internal`** for internal calls.

### Response format
- Success: `{ success: true, data: ... }` (generally)
- Errors: `{ success: false, error: string, ...(details) }`

## 4) Endpoint map (route → controller → service/repo)
Public:
- `GET /api/shipments/track/:trackingNumber` → `shipmentController.trackShipment`

Gateway-authenticated:
- `/api/shipments/*` → `shipmentController.*` (create, user list, get by id, get by order id, tracking history, cancel)
- `/api/rates/*` → `rateController.*` (rates, couriers, estimate)
- `/api/admin/*` → `adminController.*` (admin shipment/courier/warehouse config)

Internal:
- `/api/internal/*` requires `requireInternalAuth` (service-to-service HMAC)

Webhooks:
- `POST /api/webhooks/biteship` → `webhookController.handleBiteshipWebhook`
  - Requires raw body capture for signature verification (`req.rawBody`)

## 5) Middleware
- **`src/middleware/auth.ts`**
  - `authenticate` (gateway trust)
  - `requireInternalAuth` (service-to-service HMAC)
  - `gatewayOrInternalAuth` (either)
  - `requireAdmin` / `requireRole(...)`
- **`src/middleware/validation.ts`**
  - Zod schemas + `validate(schema)` middleware (primary)
  - Also includes `validateRequest` for `express-validator` results (secondary; avoid split-brain long-term)
- **`src/middleware/error-handler.ts`**
  - `AppError` subclasses + centralized `errorHandler`
  - `asyncHandler` wrapper

## 6) Database & Prisma
- Schema: `prisma/schema.prisma`
- Prisma client: `src/generated/prisma`
- Build copies Prisma client into `dist/generated/prisma` via `scripts/copy-generated-prisma.mjs`

Schema changes:
- MVP/local: `pnpm -C backend/services/logistic-service db:push`
- Production-grade: prefer migrations (`db:migrate` + `db:migrate:prod`)

## 7) Outbox events
Writer: `src/services/outbox.service.ts`
Examples:
- Shipment lifecycle: `shipment.created`, `shipment.cancelled`, `shipment.delivered`, etc.
- Tracking: `tracking.updated`

## 8) Local development & scripts
- Install: `pnpm -C backend/services/logistic-service install`
- Dev: `pnpm -C backend/services/logistic-service dev`
- Build: `pnpm -C backend/services/logistic-service build`
- Prisma: `db:generate`, `db:push`, `db:migrate`, `db:migrate:prod`, `db:studio`
- Quality: `lint`, `lint:fix`, `format`

## 9) Docker
- `Dockerfile`: uses **pnpm** (corepack) and `pnpm-lock.yaml` (good).
- `docker-compose.yml`: app + db + one-shot `db push`.

## 10) Tests
- Smoke / DB-backed endpoint sweep: `node backend/smoke/run-neon-full.mjs`

## 11) Future-me problems / tech debt
- **Webhook verification must keep raw body capture** (`req.rawBody`) or signatures break.
- **Validation split-brain**: Zod + `express-validator` in the same service is maintenance-heavy; pick one long-term.
- **Outbox transactionality**: keep outbox inserts in the same transaction as domain writes when correctness matters.

## 12) File-by-file
- `src/index.ts`: Express bootstrap; raw-body capture; swagger; routes; error handler.
- `src/middleware/*`: auth/validation/error handling.
- `src/routes/*`: route wiring.
- `src/controllers/*`: class-based controllers.
- `src/services/*`: business logic + outbox.
- `src/repositories/*`: Prisma access.
- `src/config/biteship.ts`: Biteship client.
- `scripts/copy-generated-prisma.mjs`: copies Prisma client into `dist/`.

