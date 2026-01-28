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

### 🔴 Critical (Must Fix Before Production)

#### **Commission Integration with Order Service**
- [ ] **Order service must call commission endpoints** when:
  - Order is paid → `POST /api/commissions` (record commission)
  - Order is delivered → `PUT /api/commissions/order/:orderId/complete` (mark collectible)
  - Order is refunded → `PUT /api/commissions/order/:orderId/refund` (void commission)
- [ ] **Add error handling**: What happens if commission recording fails? Should order creation fail or succeed?
- [ ] **Idempotency**: Ensure order-service retries don't create duplicate commissions (already handled, but test it)

#### **Settlement Job Implementation**
- [ ] **Create weekly settlement cron job** that:
  - Runs every Monday at 9 AM
  - For each seller with collectible commissions:
    - Calls `POST /api/commissions/seller/:sellerId/collect`
    - Calculates net payout (gross earnings - commission)
    - Creates payout record in wallet-service or transfers to bank
    - Publishes `settlement.completed` event
- [ ] **Handle settlement failures**: Rollback mechanism if payout fails mid-process
- [ ] **Settlement notifications**: Email/WhatsApp to seller with breakdown
- [ ] **Settlement reports**: Generate PDF invoice with commission breakdown

#### **Xendit Webhook Enhancements**
- [ ] **Add commission recording to payment webhook**: When `payment.paid` webhook arrives, automatically record commission
- [ ] **Handle edge cases**: What if order-service hasn't called commission endpoint yet when webhook arrives?
- [ ] **Webhook retry logic**: Xendit retries failed webhooks, ensure we handle duplicates gracefully

---

### 🟡 High Priority (Needed for Social Commerce Launch)

#### **Commission Analytics & Reporting**
- [ ] **Admin dashboard endpoints**:
  - Total commissions collected (daily/weekly/monthly)
  - Commission breakdown by seller
  - Average commission rate
  - Commission waived vs collected ratio
- [ ] **Seller dashboard integration**: Expose commission data to seller-service
- [ ] **Export functionality**: CSV/Excel export of commission records for accounting

#### **Variable Commission Rates**
- [ ] **Commission rate configuration**: Currently hardcoded to 0.5%, should be configurable
  - Per seller (VIP sellers get lower rate)
  - Per product category (premium categories get higher rate)
  - Promotional periods (0% commission for new sellers)
- [ ] **Commission rate history**: Track when rates change for compliance

#### **Commission Dispute Handling**
- [ ] **Dispute workflow**: Seller can dispute commission amount
  - Freeze commission from collection
  - Admin review process
  - Approve/reject with reason
- [ ] **Manual adjustments**: Admin can manually adjust commission amounts with audit trail

#### **Sponsored Post Payment Integration**
- [ ] **Track sponsored post payments**: When advertisement-service creates sponsored post, record payment here
- [ ] **Ad spend ledger**: Separate tracking for ad spend vs transaction commissions
- [ ] **Ad budget management**: Deduct from seller's ad balance, track remaining budget
- [ ] **Ad refunds**: Handle refunds for unused ad spend

---

### 🟢 Medium Priority (Post-Launch Improvements)

#### **Payment Method Enhancements**
- [ ] **Installment support**: Kredivo, Akulaku integration
  - Record installment schedule
  - Track installment payments
  - Handle failed installment payments
- [ ] **Multiple payment methods**: Allow split payment (wallet + credit card)
- [ ] **Saved payment methods**: Implement tokenization for repeat customers

#### **Refund Improvements**
- [ ] **Partial refunds**: Currently all-or-nothing, support partial amounts
- [ ] **Refund reasons taxonomy**: Standardize refund reasons for analytics
- [ ] **Automatic refund approval**: For trusted sellers/small amounts
- [ ] **Refund SLA tracking**: Alert if refunds taking too long

#### **Performance & Scalability**
- [ ] **Database indexes review**: As data grows, check slow queries
- [ ] **Outbox publisher job**: Separate service to publish events from outbox table to Kafka
- [ ] **Payment archival**: Move old payments (>1 year) to cold storage
- [ ] **Commission aggregation**: Pre-compute seller commission totals for performance

#### **Security & Compliance**
- [ ] **PCI compliance**: If storing card details, ensure PCI DSS compliance
- [ ] **GDPR/data privacy**: Ability to export/delete user payment data
- [ ] **Fraud detection**: Integrate with fraud detection service
  - Unusual payment patterns
  - High-risk transactions
  - Velocity checks (too many payments from same user)
- [ ] **Audit logging**: Enhanced logging for all financial transactions

---

### 🔵 Low Priority (Nice to Have)

#### **Payment Experience**
- [ ] **Payment links**: Generate shareable payment links (for offline sales)
- [ ] **QR code payments**: Generate QR codes for in-person payments
- [ ] **Recurring payments**: Subscription support for future features
- [ ] **Payment reminders**: Notify users of pending payments before expiration

#### **Analytics & Business Intelligence**
- [ ] **Payment success rate**: Track by method, amount, time of day
- [ ] **Conversion funnel**: Payment creation → successful payment
- [ ] **Revenue forecasting**: Predict monthly revenue based on trends
- [ ] **Commission revenue tracking**: Separate P&L for commission vs house brands

#### **Developer Experience**
- [ ] **Payment test mode**: Sandbox environment for testing
- [ ] **Payment simulation API**: Create test payments without Xendit
- [ ] **Better error messages**: More actionable error messages for failed payments
- [ ] **Webhook replay**: Admin can replay webhooks for debugging

#### **Operational Excellence**
- [ ] **Health check enhancement**: Check Xendit API connectivity
- [ ] **Circuit breaker**: Prevent cascading failures when Xendit is down
- [ ] **Rate limiting**: Protect against abuse on payment creation
- [ ] **Monitoring dashboards**: Grafana/DataDog dashboards for payment metrics

---

### 🛠️ Technical Debt (Clean Up When Possible)

#### **Code Quality**
- [ ] **Port default mismatch**: `PORT` defaults to `3006` in code; should be `3007`. Set explicitly in Docker.
- [ ] **Admin routes bypass layering**: Some admin handlers hit Prisma directly; migrate to services for consistency
- [ ] **Transaction management**: Ensure all commission operations use Prisma transactions
- [ ] **Error handling standardization**: Consistent error responses across all endpoints

#### **Testing**
- [ ] **Unit tests**: Add tests for commission service, repository
- [ ] **Integration tests**: Test full payment flow with commission recording
- [ ] **Webhook tests**: Mock Xendit webhooks and test handling
- [ ] **Load testing**: Ensure service can handle Black Friday volumes

#### **Documentation**
- [ ] **API documentation**: Complete Swagger/OpenAPI docs for commission endpoints
- [ ] **Runbook**: Operations guide for common issues (payment stuck, refund failed, etc.)
- [ ] **Sequence diagrams**: Document payment flow with order/commission services
- [ ] **Architecture decision records**: Document why 0.5% commission, why weekly settlements, etc.

#### **Infrastructure**
- [ ] **Dockerfile pnpm support**: Currently uses `npm ci` but has `pnpm-lock.yaml`. Switch to pnpm consistently.
- [ ] **Database connection pooling**: Optimize Prisma connection settings for production
- [ ] **Secrets management**: Use proper secrets manager (AWS Secrets Manager, Vault)
- [ ] **Multi-region support**: Prepare for expansion beyond Jakarta

---

### 📋 Commission-Specific Items (Recently Added - Jan 2026)

#### **Immediate Next Steps**
- [ ] **Test commission flow end-to-end**:
  - Create order → Check commission recorded (status: pending)
  - Complete order → Check commission collectible
  - Run settlement → Check commission collected
  - Verify seller receives net payout (gross - commission)
- [ ] **Create settlement job** (see Critical section above)
- [ ] **Update order-service** to call commission endpoints
- [ ] **Seller dashboard** to show commission breakdown

#### **Commission Edge Cases to Handle**
- [ ] **Order cancellation after completion**: Should collected commission be reversed?
- [ ] **Partial order fulfillment**: What if only some items are delivered?
- [ ] **Multi-seller orders**: Cart with items from different sellers (each gets separate commission record)
- [ ] **House brand orders**: LAKOO house brands don't pay commission (add check)
- [ ] **Promo campaigns**: Track which commissions were waived for promos vs partnerships

#### **Commission Compliance**
- [ ] **Tax reporting**: Generate reports for tax authorities (commission is revenue)
- [ ] **Seller agreements**: Ensure commission terms are in seller ToS
- [ ] **Rate change communication**: Notify sellers 30 days before commission rate changes
- [ ] **Commission invoice**: Provide invoice/receipt to sellers for their accounting

---

### 🔍 Monitoring & Alerts (Set These Up!)

#### **Payment Monitoring**
- [ ] Alert: Payment success rate < 90%
- [ ] Alert: Xendit webhook failures > 5 in 1 hour
- [ ] Alert: Average payment processing time > 30 seconds
- [ ] Alert: Refund approval time > 48 hours

#### **Commission Monitoring**
- [ ] Alert: Commission recording failures (order paid but no commission)
- [ ] Alert: Commission collection failures during settlement
- [ ] Alert: Mismatch between order amounts and commission totals
- [ ] Alert: Unusual commission waiver patterns (fraud detection)

#### **Business Metrics**
- [ ] Dashboard: Daily GMV (Gross Merchandise Value)
- [ ] Dashboard: Commission revenue (daily/weekly/monthly)
- [ ] Dashboard: Average commission per order
- [ ] Dashboard: Top sellers by commission paid
- [ ] Dashboard: Commission waived vs collected ratio

---

### 💡 Future Features (Brainstorming)

#### **Dynamic Commission Models**
- [ ] **Tiered commission**: Lower rate for high-volume sellers
- [ ] **Category-based commission**: Different rates for different product categories
- [ ] **Performance-based commission**: Lower commission for sellers with good ratings
- [ ] **Promotional commission**: 0% commission for first 30 days for new sellers

#### **Advanced Settlement**
- [ ] **Instant payouts**: Sellers can request instant payout for a fee
- [ ] **Flexible settlement schedule**: Weekly, bi-weekly, or monthly options
- [ ] **Split settlements**: Auto-split commission to multiple bank accounts
- [ ] **Settlement holds**: Hold payouts for sellers under review

#### **Financial Products**
- [ ] **Seller financing**: Advance payouts based on future sales
- [ ] **Working capital loans**: Partner with fintech for seller loans
- [ ] **Insurance products**: Payment protection insurance for buyers

---

**Last Updated**: January 27, 2026  
**Commission Implementation**: ✅ Complete  
**Next Milestone**: Settlement Job + Order Service Integration

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

