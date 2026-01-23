import { Request, Response, NextFunction } from 'express';
import { verifyServiceToken } from '../utils/serviceAuth';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
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
export const gatewayAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
export const gatewayOrInternalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    try {
      const { serviceName: tokenServiceName } = verifyServiceToken(token, serviceSecret);
      // Validate that x-service-name header matches the serviceName in the token
      if (tokenServiceName !== serviceName) {
        return next(new UnauthorizedError('Service name mismatch'));
      }
      req.user = { id: serviceName, role: 'internal' };
      return next();
    } catch {
      return next(new UnauthorizedError('Invalid service token'));
    }
  }

  return next(new UnauthorizedError('Invalid authentication'));
};

/**
 * Internal service authentication only
 */
export const internalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers['x-service-auth'] as string | undefined;
  const serviceName = req.headers['x-service-name'] as string | undefined;
  const serviceSecret = process.env.SERVICE_SECRET;

  // Development mode bypass
  if (process.env.NODE_ENV === 'development' && !serviceSecret) {
    req.user = {
      id: serviceName || 'dev-service',
      role: 'internal'
    };
    return next();
  }

  if (!token || !serviceName || !serviceSecret) {
    return next(new UnauthorizedError('Missing service authentication'));
  }

  try {
    const { serviceName: tokenServiceName } = verifyServiceToken(token, serviceSecret);
    // Validate that x-service-name header matches the serviceName in the token
    if (tokenServiceName !== serviceName) {
      return next(new UnauthorizedError('Service name mismatch'));
    }
    req.user = { id: serviceName, role: 'internal' };
    next();
  } catch {
    next(new UnauthorizedError('Invalid service token'));
  }
};

/**
 * Role-based access control - use after gatewayAuth
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
 * Check if user owns the resource
 */
export const requireOwnership = (getOwnerId: (req: AuthenticatedRequest) => string | Promise<string>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    // Admin and internal services can access any resource
    if (req.user.role === 'admin' || req.user.role === 'internal') {
      return next();
    }

    try {
      const ownerId = await getOwnerId(req);
      if (req.user.id !== ownerId) {
        return next(new ForbiddenError('You do not own this resource'));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
