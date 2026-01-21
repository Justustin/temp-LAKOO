# Brand Service

Multi-brand marketplace management service for LAKOO. Handles brand creation, configuration, and product curation across 15 official LAKOO brands.

## Architecture

This service follows the standardized service patterns:

- **Local Prisma Client**: `src/lib/prisma.ts` - Service-specific database connection
- **Gateway Trust Auth**: `src/middleware/auth.ts` - Authentication via API Gateway headers
- **Validation Middleware**: `src/middleware/validation.ts` - Request validation with express-validator
- **Error Handling**: `src/middleware/error-handler.ts` - Centralized error handling with asyncHandler
- **Outbox Events**: `src/services/outbox.service.ts` - Domain events for eventual consistency
- **Service Auth**: `src/utils/serviceAuth.ts` - Service-to-service HMAC authentication

## API Endpoints

### Brands

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/brands` | Public | List all brands with pagination |
| GET | `/api/brands/:id` | Public | Get brand by ID |
| GET | `/api/brands/slug/:slug` | Public | Get brand by slug |
| POST | `/api/brands` | Required | Create a new brand |
| PATCH | `/api/brands/:id` | Required | Update a brand |
| DELETE | `/api/brands/:id` | Required | Soft delete a brand |

### Brand Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/brands/:brandId/products` | Public | List brand products |
| GET | `/api/brands/:brandId/products/featured` | Public | Get featured products |
| GET | `/api/brands/:brandId/products/bestsellers` | Public | Get bestsellers |
| GET | `/api/brands/:brandId/products/new-arrivals` | Public | Get new arrivals |
| GET | `/api/brands/:brandId/products/:productId` | Public | Get specific brand product |
| POST | `/api/brands/:brandId/products` | Required | Add product to brand |
| PATCH | `/api/brands/:brandId/products/:productId` | Required | Update brand product |
| DELETE | `/api/brands/:brandId/products/:productId` | Required | Remove product from brand |

## Authentication

### Gateway Authentication
Protected routes require the API Gateway to forward:
- `x-gateway-key`: Shared secret verifying request came from gateway
- `x-user-id`: Authenticated user's ID
- `x-user-role`: User's role (optional)

### Service-to-Service Authentication
Internal services use HMAC-based authentication:
- `x-service-auth`: `serviceName:timestamp:signature`
- `x-service-name`: Calling service name

## Domain Events

Events published to the outbox for other services:

### Brand Events
- `brand.created` - New brand created
- `brand.updated` - Brand details updated
- `brand.deleted` - Brand soft deleted
- `brand.status_changed` - Brand status changed (active/inactive/draft)

### Brand Product Events
- `brand_product.added` - Product added to brand
- `brand_product.updated` - Brand product details updated
- `brand_product.removed` - Product removed from brand
- `brand_product.price_changed` - Brand product price changed

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3004 |
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
pnpm prisma:generate

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
│   └── brand.controller.ts # Request handlers
├── lib/
│   └── prisma.ts           # Local Prisma client singleton
├── middleware/
│   ├── auth.ts             # Gateway trust & service auth
│   ├── error-handler.ts    # Error classes & handler
│   └── validation.ts       # Request validators
├── repositories/
│   └── brand.repository.ts # Database operations
├── routes/
│   └── brand.routes.ts     # Route definitions
├── services/
│   ├── brand.service.ts    # Business logic
│   └── outbox.service.ts   # Domain event publishing
├── types/
│   └── index.ts            # TypeScript interfaces
├── utils/
│   └── serviceAuth.ts      # Service auth utilities
└── index.ts                # Application entry point
```

## LAKOO Brands

This service manages the 15 official LAKOO brands:

1. **LAKOO Elite** - Premium luxury fashion
2. **LAKOO Street** - Urban streetwear
3. **LAKOO Classic** - Timeless essentials
4. **LAKOO Active** - Sportswear & athleisure
5. **LAKOO Kids** - Children's fashion
6. **LAKOO Modest** - Modest fashion line
7. **LAKOO Curve** - Plus-size fashion
8. **LAKOO Luxe** - Designer collaborations
9. **LAKOO Casual** - Everyday wear
10. **LAKOO Party** - Evening & occasion wear
11. **LAKOO Bohemian** - Boho-chic styles
12. **LAKOO Minimalist** - Clean, simple designs
13. **LAKOO Vintage** - Retro-inspired fashion
14. **LAKOO Sustainable** - Eco-friendly fashion
15. **LAKOO X** - Limited edition collaborations

Each brand has:
- Dedicated brand manager
- Own social media accounts
- Unique storefront page
- Distinct visual identity
- Curated product selection
- Independent pricing strategy
- Own marketing campaigns
