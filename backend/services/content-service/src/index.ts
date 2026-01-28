import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error-handler';
import postRoutes from './routes/post.routes';
import commentRoutes from './routes/comment.routes';
import moderationRoutes from './routes/moderation.routes';
import hashtagRoutes from './routes/hashtag.routes';
import collectionRoutes from './routes/collection.routes';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3017;

// =============================================================================
// Security & Middleware
// =============================================================================

// Helmet for security headers
app.use(helmet());
app.disable('x-powered-by');

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// =============================================================================
// Health Check
// =============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'content-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// API Routes
// =============================================================================

app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/collections', collectionRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'content-service',
    version: '1.0.0',
    description: 'Social commerce content service - posts, comments, and engagement',
    endpoints: {
      health: '/health',
      posts: '/api/posts',
      comments: '/api/comments',
      moderation: '/api/moderation',
      hashtags: '/api/hashtags',
      collections: '/api/collections'
    }
  });
});

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// =============================================================================
// Server Startup
// =============================================================================

const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Content Service`);
  console.log('='.repeat(50));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
  console.log('✓ Server is ready');
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('✓ HTTP server closed');
    
    // Disconnect Prisma
    try {
      const { prisma } = await import('./lib/prisma.js');
      await prisma.$disconnect();
      console.log('✓ Database connection closed');
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
    
    console.log('✓ Graceful shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Exit immediately for uncaught exceptions
  process.exit(1);
});

export default app;
