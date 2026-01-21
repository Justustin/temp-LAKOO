import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './error-handler';
import { verifyServiceToken } from '../utils/serviceAuth';

/**
 * User info forwarded by API Gateway
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

const SERVICE_AUTH_HEADER = 'x-service-auth';
const SERVICE_NAME_HEADER = 'x-service-name';

function tryServiceAuth(req: AuthenticatedRequest): boolean {
  const tokenHeader = req.headers[SERVICE_AUTH_HEADER];
  const serviceNameHeader = req.headers[SERVICE_NAME_HEADER];

  if (!tokenHeader || !serviceNameHeader) return false;
  if (Array.isArray(tokenHeader) || Array.isArray(serviceNameHeader)) {
    throw new UnauthorizedError('Invalid service auth header format');
  }

  const serviceSecret = process.env.SERVICE_SECRET;

  if (process.env.NODE_ENV === 'development' && !serviceSecret) {
    req.user = { id: serviceNameHeader, role: 'internal' };
    return true;
  }

  if (!serviceSecret) {
    throw new UnauthorizedError('SERVICE_SECRET not configured');
  }

  // Source-of-truth verification logic synced from backend/shared/typescript/utils/serviceAuth.ts
  verifyServiceToken(tokenHeader, serviceSecret);
  req.user = { id: serviceNameHeader, role: 'internal' };
  return true;
}

/**
 * Gateway Trust Middleware
 *
 * Trusts that authentication was handled by the API Gateway.
 * The gateway forwards user info via headers after validating JWT.
 *
 * Required headers from gateway:
 * - x-gateway-key: Shared secret to verify request came from gateway
 * - x-user-id: Authenticated user's ID
 * - x-user-role: User's role (optional)
 */
export const gatewayAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const gatewayKey = req.headers['x-gateway-key'] as string;
  const expectedKey = process.env.GATEWAY_SECRET_KEY;

  // In development, allow requests without gateway key
  if (process.env.NODE_ENV === 'development' && !expectedKey) {
    req.user = {
      id: (req.headers['x-user-id'] as string) || 'dev-user',
      role: (req.headers['x-user-role'] as string) || 'user'
    };
    return next();
  }

  // Verify gateway key
  if (!expectedKey) {
    console.warn('GATEWAY_SECRET_KEY not configured');
    return next(new UnauthorizedError('Gateway authentication not configured'));
  }

  if (!gatewayKey || gatewayKey !== expectedKey) {
    return next(new UnauthorizedError('Invalid gateway key'));
  }

  // Extract user info from gateway headers
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    return next(new UnauthorizedError('Missing user ID from gateway'));
  }

  req.user = {
    id: userId,
    role: req.headers['x-user-role'] as string
  };

  next();
};

/**
 * Optional gateway auth - doesn't fail if no gateway headers
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export const optionalGatewayAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const gatewayKey = req.headers['x-gateway-key'] as string;
  const expectedKey = process.env.GATEWAY_SECRET_KEY;

  // If gateway key matches, extract user info
  if (gatewayKey && expectedKey && gatewayKey === expectedKey) {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      req.user = {
        id: userId,
        role: req.headers['x-user-role'] as string
      };
    }
  }

  next();
};

/**
 * Role check middleware - requires gatewayAuth to run first
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Internal service authentication using API key
 * For service-to-service communication
 */
export const internalServiceAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ok = tryServiceAuth(req as AuthenticatedRequest);
    if (!ok) {
      return next(new UnauthorizedError('Service authentication required'));
    }
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Combined auth - accepts gateway auth OR internal API key
 * Useful for endpoints called by both users (via gateway) and other services
 */
export const gatewayOrInternalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const gatewayKey = req.headers['x-gateway-key'] as string;

  // Try internal service auth first
  try {
    if (tryServiceAuth(req)) {
      return next();
    }
  } catch (err) {
    return next(err);
  }

  // Try gateway auth
  if (gatewayKey && gatewayKey === process.env.GATEWAY_SECRET_KEY) {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
      req.user = {
        id: userId,
        role: req.headers['x-user-role'] as string
      };
      return next();
    }
  }

  // Development mode fallback
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      id: (req.headers['x-user-id'] as string) || 'dev-user',
      role: 'user'
    };
    return next();
  }

  return next(new UnauthorizedError('Authentication required'));
};

/**
 * Backwards-compatible aliases used by routes/controllers.
 * Keep these at the bottom so referenced consts are initialized.
 */
export const authenticate = gatewayAuth;
export const requireAdmin = requireRole('admin');
export const requireInternalAuth = internalServiceAuth;