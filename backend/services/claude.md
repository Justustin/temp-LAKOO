# Service Standardization Guide (LAKOO)

This document is the **source-of-truth** for how each Node/TypeScript microservice should be structured in this repo.
If a service drifts, use the checklists here to bring it back to the standard.

## Overview (what must be uniform)

1. **Bootstrap (`src/index.ts`)**: helmet + morgan, strict CORS via `ALLOWED_ORIGINS`, swagger, `/health`, consistent 404 + error handler, graceful shutdown, `x-powered-by` disabled.
2. **Prisma (`src/lib/prisma.ts`)**: per-service Prisma client singleton (generated client), consistent logging, `beforeExit` disconnect.
3. **Auth (`src/middleware/auth.ts`)**:
   - **Gateway trust** for user traffic (`x-gateway-key`, `x-user-id`, `x-user-role`)
   - **Service-to-service token auth** for internal traffic (`X-Service-Auth`, `X-Service-Name`, `SERVICE_SECRET`)
4. **Validation (`src/middleware/validation.ts`)**: `express-validator` + `validateRequest` always wired after validators.
5. **Outbox (`src/services/outbox.service.ts`)**: domain events written to `ServiceOutbox` (transactional when possible).
6. **Errors (`src/middleware/error-handler.ts`)**: centralized handler with `AppError` + Prisma error mapping + safe defaults.

---

## 1. Local Prisma Client

### Problem
Services import from `@repo/database` which causes "Cannot find module '.prisma/client/default'" errors.

### Solution
Each service should have its own Prisma client at `src/lib/prisma.ts` (using the service's generated client):

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '../generated/prisma';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

### Migration Steps
1. Create `src/lib/prisma.ts` if it doesn't exist
2. Find all files importing from `@repo/database`:
   ```bash
   grep -r "@repo/database" src/
   ```
3. Replace imports:
   ```typescript
   // Before
   import { prisma } from '@repo/database';
   import { SomeType } from '@repo/database';

   // After
   import { prisma } from '../lib/prisma';
   // Define types locally or import from @prisma/client
   ```
4. Run `npx prisma generate` to generate the local client

---

## 2. Gateway Trust Authentication

### Architecture
- API Gateway (Kong/nginx) handles JWT validation at the edge
- Services trust requests that come through the gateway
- Gateway forwards user info via headers: `x-user-id`, `x-user-role`
- Internal service-to-service calls are **direct** (do not go through the gateway) and use:
  - `X-Service-Auth`: `serviceName:timestamp:signature`
  - `X-Service-Name`: `serviceName`
  - `SERVICE_SECRET`: shared secret used to verify HMAC tokens

### Implementation

Create/update `src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Gateway authentication - trusts that API Gateway has validated the JWT
 * and forwarded user info via headers.
 */
export const gatewayAuth = (req: Request, res: Response, next: NextFunction) => {
  const expectedKey = process.env.GATEWAY_SECRET_KEY;
  const gatewayKey = req.headers['x-gateway-key'] as string | undefined;

  // In development without gateway key configured, allow requests through
  if (process.env.NODE_ENV === 'development' && !expectedKey) {
    req.user = {
      id: (req.headers['x-user-id'] as string) || 'dev-user',
      role: (req.headers['x-user-role'] as string) || 'user'
    };
    return next();
  }

  // Verify gateway key
  if (!gatewayKey || gatewayKey !== expectedKey) {
    return next(new UnauthorizedError('Invalid gateway key'));
  }

  // Extract user info from headers (set by API Gateway after JWT validation)
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;

  if (!userId) {
    return next(new UnauthorizedError('Missing user identification'));
  }

  req.user = { id: userId, role: userRole || 'user' };
  next();
};

/**
 * For endpoints that can be called by gateway OR internal services
 */
export const gatewayOrInternalAuth = (req: Request, res: Response, next: NextFunction) => {
  const expectedGatewayKey = process.env.GATEWAY_SECRET_KEY;
  const gatewayKey = req.headers['x-gateway-key'] as string | undefined;
  const token = req.headers['x-service-auth'] as string | undefined;
  const serviceName = req.headers['x-service-name'] as string | undefined;
  const serviceSecret = process.env.SERVICE_SECRET;

  // Development mode bypass
  if (process.env.NODE_ENV === 'development' && !expectedGatewayKey && !serviceSecret) {
    req.user = {
      id: (req.headers['x-user-id'] as string) || 'dev-user',
      role: (req.headers['x-user-role'] as string) || 'user'
    };
    return next();
  }

  // Check gateway key first
  if (gatewayKey && gatewayKey === expectedGatewayKey) {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return next(new UnauthorizedError('Missing user identification'));
    }
    req.user = { id: userId, role: (req.headers['x-user-role'] as string) || 'user' };
    return next();
  }

  // Check internal service token
  if (token && serviceName && serviceSecret) {
    // verifyServiceToken(token, serviceSecret)  // see src/utils/serviceAuth.ts for the canonical implementation
    req.user = { id: serviceName, role: 'internal' };
    return next();
  }

  return next(new UnauthorizedError('Invalid authentication'));
};

/**
 * Role-based access control - use after gatewayAuth
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`));
    }

    next();
  };
};
```

### Route Protection Patterns

```typescript
// Public routes (webhooks) - no auth, use signature verification
router.post('/webhook/xendit', webhookController.handleXendit);

// User routes - gateway auth
router.use(gatewayOrInternalAuth);
router.post('/', createPaymentValidators, validateRequest, controller.create);

// Admin routes - gateway auth + admin role
router.use(gatewayAuth);
router.use(requireRole('admin'));
router.get('/all', controller.getAll);
```

---

## 3. Validation Middleware

### Problem
express-validator checks are defined but `validationResult()` is never called, so validation errors are ignored.

### Solution

Create `validateRequest` middleware in `src/middleware/validation.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware to check express-validator results and return 400 if validation failed.
 * Use AFTER validator arrays in route definitions.
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Export your validators from this file too
export const createPaymentValidators = [
  body('orderId').isString().notEmpty(),
  body('amount').isNumeric().custom(v => v > 0),
  // ... etc
];
```

### Usage in Routes

```typescript
import { createPaymentValidators, validateRequest } from '../middleware/validation';

// CORRECT: validators -> validateRequest -> controller
router.post('/', createPaymentValidators, validateRequest, controller.create);

// WRONG: validators without validateRequest (errors ignored!)
router.post('/', createPaymentValidators, controller.create);
```

---

## 4. Outbox Events (Event-Driven Architecture)

### Purpose
Publish domain events to `ServiceOutbox` table for eventual delivery to Kafka/message broker. This enables loose coupling between services.

### Implementation

Create `src/services/outbox.service.ts`:

```typescript
import { prisma } from '../lib/prisma';

export type EventType =
  | 'entity.created'
  | 'entity.updated'
  | 'entity.deleted';
  // Add your domain events

interface EventPayload {
  [key: string]: any;
}

export class OutboxService {
  async publish(
    aggregateType: string,
    aggregateId: string,
    eventType: EventType,
    payload: EventPayload,
    metadata?: Record<string, any>
  ): Promise<void> {
    await prisma.serviceOutbox.create({
      data: {
        aggregateType,
        aggregateId,
        eventType,
        payload,
        // NOTE: For Prisma JSON fields, prefer "omit" over raw null unless you intentionally store JsonNull/DbNull.
        ...(metadata !== undefined ? { metadata } : {})
      }
    });
  }

  // Add typed helper methods for each event
  async entityCreated(entity: { id: string; /* ... */ }): Promise<void> {
    await this.publish('Entity', entity.id, 'entity.created', {
      entityId: entity.id,
      // ... map fields
      createdAt: new Date().toISOString()
    });
  }
}

export const outboxService = new OutboxService();
```

### When to Publish Events

Publish events after successful database operations:

```typescript
// In your service
async createEntity(data: CreateEntityDto) {
  const entity = await this.repository.create(data);

  // Publish event AFTER successful creation
  await outboxService.entityCreated(entity);

  return entity;
}
```

### Recommended Events by Service

**order-service:**
- `order.created` - When order is placed
- `order.confirmed` - When order is confirmed
- `order.shipped` - When order ships
- `order.delivered` - When order is delivered
- `order.cancelled` - When order is cancelled

**product-service:**
- `product.created`
- `product.updated`
- `product.stock_updated` - Inventory changes
- `product.price_updated`

**user-service:**
- `user.registered`
- `user.verified`
- `user.profile_updated`

---

## 5. Error Handling

### asyncHandler Pattern

Wrap async route handlers to catch errors:

```typescript
// src/utils/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

### Centralized Error Handler (standard)

Create `src/middleware/error-handler.ts` and mount it as the last middleware.
This is the standard pattern used across services (AppError + Prisma error mapping + safe defaults).

### Usage

```typescript
// In app.ts
app.use(errorHandler);

// In controllers
export const createEntity = asyncHandler(async (req, res) => {
  // Errors automatically caught and passed to errorHandler
  const entity = await service.create(req.body);
  res.status(201).json({ success: true, data: entity });
});
```

---

## 6. Environment Variables

Each service should have these in `.env.example`:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

# Authentication (Gateway Trust Model)
GATEWAY_SECRET_KEY=your-gateway-secret

# Internal service-to-service auth (HMAC token)
SERVICE_SECRET=your-service-secret
SERVICE_NAME=your-service-name  # optional, defaults to "<service>-service" in code

# Service-specific
# ... add service-specific vars
```

---

## Checklist for Each Service

- [ ] Create/verify `src/lib/prisma.ts` exists
- [ ] Replace all `@repo/database` imports with local prisma
- [ ] Run `npx prisma generate`
- [ ] Update `src/middleware/auth.ts` with gateway trust model
- [ ] Ensure service-to-service auth uses `X-Service-Auth` + `X-Service-Name` and `SERVICE_SECRET` (no `x-internal-api-key`)
- [ ] Ensure outgoing service-to-service calls attach the headers (use a helper like `src/utils/serviceAuth.ts`)
- [ ] Create `validateRequest` in `src/middleware/validation.ts`
- [ ] Wire up auth middleware to routes (`router.use(gatewayOrInternalAuth)`)
- [ ] Add `validateRequest` after validators on each route
- [ ] Create `src/services/outbox.service.ts` with domain events
- [ ] Add outbox events to service methods
- [ ] Verify error handling with asyncHandler
- [ ] Update `.env.example` with correct variables
- [ ] Verify `src/index.ts` matches the standard bootstrap template (helmet, morgan, strict CORS, swagger, health, 404, error handler, graceful shutdown)
- [ ] Test the service: `pnpm run dev` / `pnpm run build`

---

## File Structure Reference

```
src/
├── controllers/
│   └── *.controller.ts
├── lib/
│   └── prisma.ts              # Local Prisma client
├── middleware/
│   ├── auth.ts                # Gateway trust auth
│   ├── validation.ts          # Validators + validateRequest
│   └── error-handler.ts       # Centralized error handling (AppError + Prisma mapping)
├── repositories/
│   └── *.repository.ts
├── routes/
│   └── *.routes.ts            # Wire up auth + validation
├── services/
│   ├── outbox.service.ts      # Domain events
│   └── *.service.ts
└── utils/
    ├── asyncHandler.ts
    └── serviceAuth.ts          # HMAC token generator/verifier + getServiceAuthHeaders()
```

---

## Reference Implementation

See `payment-service` for a complete reference implementation of all these patterns.
