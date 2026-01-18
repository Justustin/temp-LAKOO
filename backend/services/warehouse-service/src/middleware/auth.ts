import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './error-handler';

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
  const expectedInternalKey = process.env.INTERNAL_API_KEY;
  const gatewayKey = req.headers['x-gateway-key'] as string | undefined;
  const internalKey = req.headers['x-internal-api-key'] as string | undefined;

  // Development mode bypass
  if (process.env.NODE_ENV === 'development' && !expectedGatewayKey && !expectedInternalKey) {
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

  // Check internal API key
  if (internalKey && internalKey === expectedInternalKey) {
    req.user = {
      id: (req.headers['x-user-id'] as string) || 'internal-service',
      role: 'internal'
    };
    return next();
  }

  return next(new UnauthorizedError('Invalid authentication'));
};

/**
 * Internal-only authentication - for service-to-service calls only
 */
export const internalAuth = (req: Request, res: Response, next: NextFunction) => {
  const expectedInternalKey = process.env.INTERNAL_API_KEY;
  const internalKey = req.headers['x-internal-api-key'] as string | undefined;

  // Development mode bypass
  if (process.env.NODE_ENV === 'development' && !expectedInternalKey) {
    req.user = {
      id: (req.headers['x-user-id'] as string) || 'internal-service',
      role: 'internal'
    };
    return next();
  }

  // Verify internal key
  if (!internalKey || internalKey !== expectedInternalKey) {
    return next(new UnauthorizedError('Invalid internal API key'));
  }

  req.user = {
    id: (req.headers['x-user-id'] as string) || 'internal-service',
    role: 'internal'
  };
  next();
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
