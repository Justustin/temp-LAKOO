import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './error-handler';

/**
 * User info forwarded by API Gateway
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
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
  const apiKey = req.headers['x-internal-api-key'] as string;
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    console.warn('INTERNAL_API_KEY not configured');
    return next(new UnauthorizedError('Internal API key not configured'));
  }

  if (!apiKey || apiKey !== expectedKey) {
    return next(new UnauthorizedError('Invalid internal API key'));
  }

  next();
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
  const apiKey = req.headers['x-internal-api-key'] as string;
  const gatewayKey = req.headers['x-gateway-key'] as string;

  // Try internal API key first
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
    // For internal calls, user might be passed in header or body
    req.user = {
      id: (req.headers['x-user-id'] as string) || 'internal-service',
      role: 'service'
    };
    return next();
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
