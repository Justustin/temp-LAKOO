import { Request, Response, NextFunction } from 'express';
import { verifyServiceToken } from '../utils/serviceAuth';

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
  const tokenHeader = req.headers['x-service-auth'];
  const serviceNameHeader = req.headers['x-service-name'];
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

  // Check internal service auth (HMAC token)
  if (tokenHeader && serviceNameHeader) {
    if (Array.isArray(tokenHeader) || Array.isArray(serviceNameHeader)) {
      return next(new UnauthorizedError('Invalid service auth header format'));
    }

    // Dev fallback
    if (process.env.NODE_ENV === 'development' && !serviceSecret) {
      req.user = { id: serviceNameHeader, role: 'internal' };
      return next();
    }

    if (!serviceSecret) {
      return next(new UnauthorizedError('SERVICE_SECRET not configured'));
    }

    try {
      // Source-of-truth verification logic synced from backend/shared/typescript/utils/serviceAuth.ts
      verifyServiceToken(tokenHeader, serviceSecret);
      req.user = { id: serviceNameHeader, role: 'internal' };
      return next();
    } catch (err) {
      return next(new UnauthorizedError(err instanceof Error ? err.message : 'Invalid service token'));
    }
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

/**
 * Internal-only middleware - only allows internal service calls
 */
export const internalOnly = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Not authenticated'));
  }

  if (req.user.role !== 'internal') {
    return next(new ForbiddenError('Internal service access only'));
  }

  next();
};
