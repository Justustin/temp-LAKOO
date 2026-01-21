# Payment Service Documentation (`backend/services/payment-service`)

## 1) Purpose
- Owns payment + refund state (`Payment`, `Refund`, `PaymentGatewayLog`, settlement summaries) and exposes payment/refund APIs.
- Integrates with **Xendit** for invoice creation and (some) refunds.
- Emits integration events via **`ServiceOutbox`** (transactional outbox pattern).
- Does **not** own orders or user identities (reads via `ORDER_SERVICE_URL` / `AUTH_SERVICE_URL` when needed).

## 2) Architecture (layers & request flow)
- **Routes** (`src/routes/*.routes.ts`): endpoints + `express-validator` rules + `validateRequest`.
- **Controllers** (`src/controllers/*.controller.ts`): HTTP handlers (should be thin).
- **Services** (`src/services/*.service.ts`): business logic + external calls + outbox.
- **Repositories** (`src/repositories/*.repository.ts`): Prisma reads/writes.
- **DB schema** (`prisma/schema.prisma`): data model + outbox table.

Typical request flow:
1. Route validates input → `validateRequest`.
2. Auth middleware sets `req.user`.
3. Controller calls service method.
4. Service uses repositories + external clients, returns result (errors bubble to `errorHandler`).

## 3) Runtime contracts

### Environment variables
- **`PORT`**: listen port (code default is `3006`; Docker / common usage is `3007`).
- **`NODE_ENV`**: `development|test|production` (affects logging + dev auth bypass).
- **`DATABASE_URL`**: Postgres connection string for Prisma.
- **`GATEWAY_SECRET_KEY`**: verifies gateway traffic (`x-gateway-key`).
- **`SERVICE_SECRET`**: verifies service-to-service HMAC tokens (`x-service-auth` + `x-service-name`).
- **`XENDIT_SECRET_KEY`**: Xendit API key.
- **`XENDIT_WEBHOOK_VERIFICATION_TOKEN`**: Xendit callback token (matches `x-callback-token`).
- **`AUTH_SERVICE_URL`**, **`ORDER_SERVICE_URL`**, **`NOTIFICATION_SERVICE_URL`**: upstream service base URLs.
- **`PAYMENT_SUCCESS_URL`**, **`PAYMENT_FAILURE_URL`**: Xendit redirect URLs.
- **`ENABLE_EXPIRATION_CRON`**, **`EXPIRATION_CRON_SCHEDULE`**: expire-payment scheduler controls.
- **`ALLOWED_ORIGINS`**: CORS allowlist (if enabled in `src/index.ts`).

### Authentication & authorization (gateway + service-to-service)
Gateway-trust (external client traffic via API Gateway):
- Gateway must inject:
  - `x-gateway-key` (must equal `GATEWAY_SECRET_KEY`)
  - `x-user-id` (required)
  - `x-user-role` (optional; `admin`, `user`, etc.)

Service-to-service (internal traffic, no gateway):
- Caller must send:
  - `x-service-auth`: `serviceName:timestamp:signature`
  - `x-service-name`: `serviceName`
- Service verifies token using **`SERVICE_SECRET`** and sets:
  - `req.user = { id: <serviceName>, role: 'internal' }`

Role values:
- Use **`internal`** consistently for internal calls (service-to-service).

### Response format
- Most success responses: `200/201` with `{ success: true, data: ... }`
- Some delete/void actions may respond `204` with no body (depends on controller).
- Errors are formatted by `src/middleware/error-handler.ts`:
  - `{ success: false, error: string, ...(details) }`

## 4) Endpoint map (route → controller → service/repo)
Base routes:
- **`/api/payments`** → `src/routes/payment.routes.ts`
- **`/api/admin`** → `src/routes/admin.routes.ts`
- **`/api/transactions`** → `src/routes/transaction.routes.ts`
- **`/api/webhooks`** → `src/routes/webhook.routes.ts`

Payments & refunds (`/api/payments/*`):
- Auth: `gatewayOrInternalAuth`
- Examples:
  - `POST /api/payments` → `PaymentController.createPayment` → `PaymentService.createPayment` → `PaymentRepository.*`
  - `GET /api/payments/order/:orderId` → `PaymentController.getPaymentByOrder` → `PaymentService.getPaymentByOrderId`
  - Refund routes: `PaymentController.*` → `RefundService.*` → `RefundRepository.*`
  - Admin-only payment analytics routes use `requireRole('admin', 'internal')`

Admin (`/api/admin/*`):
- Auth: `gatewayAuth` + `requireRole('admin')`
- Note: some handlers use Prisma directly (tech debt item: move to services).

Webhooks (`/api/webhooks/xendit/invoice`):
- Validates `x-callback-token` using `CryptoUtils.verifyXenditWebhook(...)`
- Performs idempotency using `PaymentGatewayLog`
- Calls `PaymentService.handlePaidCallback(...)` for `PAID` events

## 5) Middleware
Files under `src/middleware/`.

- **`auth.ts`**
  - `gatewayAuth`: verifies gateway headers; sets `req.user`.
  - `gatewayOrInternalAuth`: accepts gateway OR service-to-service HMAC; sets `req.user`.
  - `internalServiceAuth`: service-to-service only (HMAC).
  - `requireRole(...roles)`: checks `req.user.role`.
- **`validation.ts`**
  - `validateRequest`: checks `express-validator` results and returns `400` on failure.
- **`error-handler.ts`**
  - `AppError` subclasses + global `errorHandler`.
  - `asyncHandler` wrapper for async controllers (preferred).

## 6) Database & Prisma
- Schema: `prisma/schema.prisma`
- Prisma client is generated into `src/generated/prisma`.
- Build copies it into `dist/generated/prisma` using `scripts/copy-generated-prisma.mjs` so `node dist/index.js` works.

Schema changes:
- MVP/local: `pnpm -C backend/services/payment-service db:push`
- Production-grade: prefer migrations (`db:migrate` → generate migration files, `db:migrate:prod` → apply)

## 7) Outbox events
- Table: `ServiceOutbox` (in Prisma schema).
- Writer: `src/services/outbox.service.ts`.
- Typical emitted events (high-signal):
  - `payment.created`, `payment.paid`, `payment.expired`
  - `refund.requested`, `refund.completed`, `refund.failed`, `refund.approved`, `refund.rejected`
  - `settlement.completed` (weekly settlement job)

## 8) Local development & scripts
From repo root:
- Install: `pnpm -C backend/services/payment-service install`
- Dev: `pnpm -C backend/services/payment-service dev`
- Build: `pnpm -C backend/services/payment-service build`
- Start built: `pnpm -C backend/services/payment-service start`
- Prisma:
  - `db:generate`, `db:push`, `db:migrate`, `db:migrate:prod`, `db:studio`
- Quality:
  - `lint`, `lint:fix`, `format`

## 9) Docker
- `Dockerfile`: multi-stage image.
- `docker-compose.yml`: app + db + one-shot db init container (uses `prisma db push`).

Known caveat:
- This service has a **`pnpm-lock.yaml`**, but the `Dockerfile` currently uses **`npm ci`**. `npm ci` requires a `package-lock.json`. Either:
  - switch Dockerfile to pnpm (like logistic-service), or
  - add and maintain `package-lock.json`.

## 10) Tests
- Unit tests exist for some utils (Jest).
- DB-backed endpoint sweep (Neon or local DB): `node backend/smoke/run-neon-full.mjs`

## 11) Future-me problems / tech debt
- **Port default mismatch**: `PORT` defaults to `3006` in code; set it explicitly (especially in Docker).
- **Admin routes bypass layering**: some admin handlers hit Prisma directly; migrate to services for consistency.
- **Outbox transactionality**: ideally write domain updates + outbox rows in the same Prisma transaction.
- **Webhook semantics**: ensure webhook handlers are strictly idempotent and “fail closed” on auth/signature misconfig.

## 12) File-by-file
- `src/index.ts`: Express bootstrap, routes, health, swagger, error handler, shutdown.
- `src/lib/prisma.ts`: Prisma singleton client.
- `src/middleware/*`: auth/validation/error-handler.
- `src/routes/*`: HTTP routes + validators.
- `src/controllers/*`: request handlers.
- `src/services/*`: business logic + outbox publishing.
- `src/repositories/*`: Prisma access layer.
- `src/utils/*`: shared helpers (incl. `CryptoUtils.verifyXenditWebhook` token compare).
- `scripts/copy-generated-prisma.mjs`: copies generated Prisma client into `dist/`.

