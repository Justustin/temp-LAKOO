import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { UnauthorizedError, ForbiddenError } from './error-handler';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
}

/**
 * Middleware to validate JWT token via Auth Service
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Validate token via Auth Service
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/validate`,
      { token },
      { timeout: 5000 }
    );

    if (!response.data.success || !response.data.data) {
      throw new UnauthorizedError('Invalid token');
    }

    req.user = response.data.data;
    next();
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }

    if (error.response?.status === 401) {
      return next(new UnauthorizedError('Token expired or invalid'));
    }

    console.error('Auth validation error:', error.message);
    return next(new UnauthorizedError('Authentication failed'));
  }
};

/**
 * Middleware to check user role
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Middleware to check specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!req.user.permissions?.includes(permission)) {
      return next(new ForbiddenError(`Missing permission: ${permission}`));
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];

    if (token) {
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/api/auth/validate`,
        { token },
        { timeout: 5000 }
      );

      if (response.data.success && response.data.data) {
        req.user = response.data.data;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    console.warn('Optional auth validation failed:', (error as Error).message);
  }

  next();
};

/**
 * API Key authentication for internal services
 */
export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.INTERNAL_API_KEY;

  if (!validApiKey) {
    console.warn('INTERNAL_API_KEY not configured');
    return next(new UnauthorizedError('API key authentication not configured'));
  }

  if (!apiKey || apiKey !== validApiKey) {
    return next(new UnauthorizedError('Invalid API key'));
  }

  next();
};

/**
 * Combined auth - accepts either JWT or API key
 */
export const authenticateAny = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  // Try API key first (for internal services)
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
    return next();
  }

  // Try JWT authentication
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }

  return next(new UnauthorizedError('Authentication required'));
};
