# Address Service Documentation (`backend/services/address-service`)

## 1) Purpose
- Owns user address data (`Address`) including default-address rules and soft deletes.
- Provides internal-only “mark used” endpoint for order-placement analytics.
- Emits integration events via **`ServiceOutbox`**.

## 2) Architecture (layers & request flow)
- **Routes** (`src/routes/*.routes.ts`): endpoints + `express-validator` + `validateRequest`.
- **Controllers** (`src/controllers/*.controller.ts`): HTTP handlers + ownership checks.
- **Services** (`src/services/*.service.ts`): business rules (default switching, cannot delete last address) + outbox.
- **Repositories** (`src/repositories/*.repository.ts`): Prisma transactions + advisory lock for default-address concurrency.
- **DB schema** (`prisma/schema.prisma`).

Typical request flow:
1. Route validates input.
2. Auth middleware sets `req.user`.
3. Controller enforces “user can only access their own addresses” unless `internal`.
4. Service executes logic (often in a Prisma transaction) and writes outbox events.

## 3) Runtime contracts

### Environment variables
- **`PORT`**: listen port (defaults to `3010` via `src/config/env.ts`).
- **`NODE_ENV`**: `development|test|production`.
- **`ADDRESS_DATABASE_URL`**: Postgres connection string for Prisma.
- **`GATEWAY_SECRET_KEY`**: verifies gateway traffic (`x-gateway-key`).
- **`SERVICE_SECRET`**: verifies service-to-service HMAC (`x-service-auth` + `x-service-name`).
- **`ALLOWED_ORIGINS`**: CORS allowlist (if configured).

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
- Success: usually `{ success: true, data: ... }` (200/201)
- Delete: `204` (no body)
- Errors: `{ success: false, error: string, ...(details) }`

## 4) Endpoint map (route → controller → service/repo)
Base: `/api/addresses` (`src/routes/address.routes.ts`)
- Auth: `gatewayOrInternalAuth`

Key endpoints:
- `POST /api/addresses`
  - Controller: `AddressController.createAddress` (uses `req.user.id` as `userId`)
  - Service: `AddressService.createAddress` → Repo: `AddressRepository.create`
  - Outbox: `address.created`
- `GET /api/addresses/user/:userId`
  - Service: `AddressService.getUserAddresses`
- `GET /api/addresses/user/:userId/default`
  - Service: `AddressService.getDefaultAddress`
- `PATCH /api/addresses/:id`
  - Service: `AddressService.updateAddress` (handles default switching)
  - Outbox: `address.updated` (+ `address.set_default` when applicable)
- `POST /api/addresses/:id/set-default`
  - Service: `AddressService.setDefaultAddress`
  - Outbox: `address.set_default` + `address.updated`
- `DELETE /api/addresses/:id`
  - Service: `AddressService.deleteAddress`
  - Business rule: cannot delete the only address
  - Outbox: `address.deleted`
- `POST /api/addresses/:id/mark-used` (internal-only)
  - Middleware: `internalOnly`
  - Service: `AddressService.markAddressAsUsed`

## 5) Middleware
- **`src/middleware/auth.ts`**
  - `gatewayOrInternalAuth`: gateway headers OR service-to-service HMAC.
  - `internalOnly`: requires `req.user.role === 'internal'`.
- **`src/middleware/validation.ts`**
  - `validateRequest`: consistent `400` response for validator failures.
- **`src/middleware/error-handler.ts`**
  - Centralized error formatting (`AppError` subclasses).

## 6) Database & Prisma
- Schema: `prisma/schema.prisma`
- Prisma client: `src/generated/prisma`
- Build copies Prisma client into `dist/generated/prisma` via `scripts/copy-generated-prisma.mjs`

Schema changes:
- MVP/local: `pnpm -C backend/services/address-service db:push`
- Production-grade: prefer migrations (`db:migrate` + `db:migrate:prod`)

## 7) Outbox events
Writer: `src/services/outbox.service.ts`
- `address.created`
- `address.updated`
- `address.deleted`
- `address.set_default`

## 8) Local development & scripts
- Install: `pnpm -C backend/services/address-service install`
- Dev: `pnpm -C backend/services/address-service dev`
- Build: `pnpm -C backend/services/address-service build`
- Prisma: `db:generate`, `db:push`, `db:migrate`, `db:migrate:prod`, `db:studio`
- Quality: `lint`, `lint:fix`, `format`

## 9) Docker
- `Dockerfile`: multi-stage image.
- `docker-compose.yml`: app + db + one-shot `db push`.

Known caveat:
- This service has a **`pnpm-lock.yaml`**, but the `Dockerfile` currently uses **`npm ci`** (requires a `package-lock.json`). Consider switching Dockerfile to pnpm (like logistic-service).

## 10) Tests
- Smoke / DB-backed endpoint sweep: `node backend/smoke/run-neon-full.mjs`

## 11) Future-me problems / tech debt
- **Default-address concurrency**: solved with per-user Postgres advisory lock; keep it if you refactor.
- **Transactional outbox**: if you need strict guarantees, write outbox rows in the same transaction as address mutations.
- **Internal endpoint safety**: keep `mark-used` internal-only; never expose service secrets to browsers.

## 12) File-by-file
- `src/index.ts`: Express bootstrap, routes, swagger, error handler.
- `src/config/env.ts`: env validation / fail-fast.
- `src/config/swagger.ts`: OpenAPI config (includes service-to-service auth headers).
- `src/lib/prisma.ts`: Prisma singleton.
- `src/middleware/*`: auth/validation/error handler.
- `src/routes/address.routes.ts`: endpoints + validators + swagger JSDoc.
- `src/controllers/address.controller.ts`: ownership checks + handler glue.
- `src/services/address.service.ts`: business rules + outbox emission.
- `src/repositories/address.repository.ts`: Prisma transactions + advisory lock.
- `scripts/copy-generated-prisma.mjs`: copies Prisma client into `dist/`.

