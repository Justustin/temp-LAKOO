import { Request, Response, NextFunction, RequestHandler } from 'express';

// =============================================================================
// Error Classes
// =============================================================================

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  details: any[];

  constructor(message = 'Validation failed', details: any[] = []) {
    super(message, 400);
    this.details = details;
  }
}

// =============================================================================
// Async Handler
// =============================================================================

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// =============================================================================
// Prisma Error Mapping
// =============================================================================

interface PrismaError extends Error {
  code?: string;
  meta?: { target?: string[] };
}

const handlePrismaError = (error: PrismaError): AppError => {
  switch (error.code) {
    case 'P2002': {
      const target = error.meta?.target?.join(', ') || 'field';
      return new ConflictError(`Duplicate value for: ${target}`);
    }
    case 'P2025':
      return new NotFoundError('Record not found');
    case 'P2003':
      return new BadRequestError('Foreign key constraint failed');
    case 'P2014':
      return new BadRequestError('Invalid relation');
    default:
      return new AppError('Database error', 500);
  }
};

// =============================================================================
// Error Handler Middleware
// =============================================================================

export const errorHandler = (
  err: Error & { statusCode?: number; code?: string; details?: any[] },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Handle Prisma errors
  if (err.code?.startsWith('P')) {
    const prismaError = handlePrismaError(err as PrismaError);
    res.status(prismaError.statusCode).json({
      success: false,
      error: prismaError.message
    });
    return;
  }

  // Handle known errors
  if (err.statusCode) {
    const response: any = {
      success: false,
      error: err.message
    };

    if (err.details) {
      response.details = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message
  });
};
