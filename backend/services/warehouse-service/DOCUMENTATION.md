# Warehouse Service Documentation (`backend/services/warehouse-service`)

## 1) Purpose
- Owns inventory state and reservation lifecycle for products/variants.
- Enforces grosir/bundle constraints and manages purchase orders + stock movements.
- Emits integration events via **`ServiceOutbox`**.

## 2) Architecture (layers & request flow)
- **Routes** (`src/routes/*.routes.ts`): endpoints + `express-validator` + `validateRequest`.
- **Controllers** (`src/controllers/*.controller.ts`): HTTP handlers.
- **Services** (`src/services/*.service.ts`): core business logic (reservations, POs, grosir checks) + outbox.
- **Repositories** (`src/repositories/*.repository.ts`): Prisma access + concurrency helpers (optimistic locking, advisory locks).
- **DB schema** (`prisma/schema.prisma`).

Typical request flow:
1. Route validates input.
2. Auth middleware sets `req.user`.
3. Controller calls service.
4. Service performs transactional domain updates + outbox writes (some flows).

## 3) Runtime contracts

### Environment variables
- **`PORT`**: listen port (defaults to `3012`).
- **`NODE_ENV`**: `development|test|production`.
- **`DATABASE_URL`**: Postgres connection string for Prisma.
- **`GATEWAY_SECRET_KEY`**: verifies gateway traffic (`x-gateway-key`).
- **`SERVICE_SECRET`**: verifies service-to-service HMAC (`x-service-auth` + `x-service-name`).
- **`ALLOWED_ORIGINS`**: CORS allowlist.
- **`RESERVATION_EXPIRY_HOURS`**: used when creating reservation expiry timestamps.

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
Public/user/internal (`/api/warehouse/*`):
- Auth: `gatewayOrInternalAuth`
- Examples:
  - `GET /api/warehouse/inventory/status` → `WarehouseController.getInventoryStatus` → `WarehouseService.getInventoryStatus`
  - `POST /api/warehouse/reserve-inventory` → `WarehouseService.reserveInventory` (transactional + concurrency-safe)
  - `POST /api/warehouse/release-reservation` → `WarehouseService.releaseReservation`
  - `POST /api/warehouse/confirm-reservation` → `WarehouseService.confirmReservation`

Admin (`/api/admin/*`):
- Auth: `gatewayOrInternalAuth` + `requireRole('admin', 'warehouse_admin', 'internal')`
- Inventory CRUD/adjustments, alerts, purchase orders, and reservation expiry processing.

## 5) Middleware
- **`src/middleware/auth.ts`**
  - `gatewayAuth`, `gatewayOrInternalAuth`, `internalAuth` (HMAC), `requireRole`.
- **`src/middleware/validation.ts`**
  - `express-validator` rules + `validateRequest`.
- **`src/middleware/error-handler.ts`**
  - `AppError` subclasses + centralized `errorHandler` + `asyncHandler`.

## 6) Database & Prisma
- Schema: `prisma/schema.prisma`
- Prisma client: `src/generated/prisma`
- Build copies Prisma client into `dist/generated/prisma` via `scripts/copy-generated-prisma.mjs`

Schema changes:
- MVP/local: `pnpm -C backend/services/warehouse-service db:push`
- Production-grade: prefer migrations (`db:migrate` + `db:migrate:prod`)

## 7) Outbox events
Writer: `src/services/outbox.service.ts`
Examples:
- Inventory: `inventory.reserved`, `inventory.released`, `inventory.confirmed`, `inventory.restocked`
- Purchase orders: `purchase_order.created`, `purchase_order.received`
- Stock alerts: `stock_alert.*` (some may be TODO depending on wiring)

## 8) Local development & scripts
- Install: `pnpm -C backend/services/warehouse-service install`
- Dev: `pnpm -C backend/services/warehouse-service dev`
- Build: `pnpm -C backend/services/warehouse-service build`
- Prisma: `db:generate`, `db:push`, `db:migrate`, `db:migrate:prod`, `db:studio`
- Quality: `lint`, `lint:fix`, `format`

## 9) Docker
- `Dockerfile`: multi-stage image.
- `docker-compose.yml`: app + db + one-shot `db push`.

Known caveat:
- This service has a **`pnpm-lock.yaml`**, but the `Dockerfile` currently uses **`npm ci`** (requires a `package-lock.json`). Consider switching Dockerfile to pnpm (like logistic-service).

## 10) Tests
- Unit tests exist for bundle calculation utilities.
- Smoke / DB-backed endpoint sweep: `node backend/smoke/run-neon-full.mjs`

## 11) Future-me problems / tech debt
- **Concurrency invariants**: reservation transitions must remain atomic/race-safe (confirm/release/expire).
- **Nullable-unique gotcha**: Postgres allows multiple NULLs in unique indexes; guard “no-variant inventory rows” carefully.
- **Outbox transactionality**: keep outbox writes inside the same DB transaction where correctness matters.

## 12) File-by-file
- `src/index.ts`: Express bootstrap; routes; swagger; error handler.
- `src/controllers/warehouse.controller.ts`: HTTP handlers.
- `src/services/warehouse.service.ts`: business logic (reservations, POs, grossir).
- `src/repositories/warehouse.repository.ts`: Prisma access + concurrency helpers.
- `src/services/outbox.service.ts`: outbox writer.
- `src/middleware/*`: auth/validation/error handler.
- `src/utils/*`: pure bundle calculation utilities (+ tests).
- `scripts/copy-generated-prisma.mjs`: copies Prisma client into `dist/`.

