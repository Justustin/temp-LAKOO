import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import feedRoutes from './routes/feed.routes';
import followRoutes from './routes/follow.routes';
import trendingRoutes from './routes/trending.routes';
import { errorHandler } from './middleware/error-handler';
import { startTrendingJobs } from './jobs/trending.job';
import { startCleanupJobs } from './jobs/cleanup.job';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3018;

app.disable('x-powered-by');

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'feed-service',
    version: '1.0.0',
    description: 'Feed discovery engine - social graph, feeds, interests, and trending',
    endpoints: {
      health: '/health',
      feed: '/api/feed',
      follow: '/api/follow',
      trending: '/api/trending'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'feed-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/feed', feedRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/trending', trendingRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global Error Handler
app.use(errorHandler);

// Graceful shutdown
let server: ReturnType<typeof app.listen> | undefined;
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server gracefully...');
  
  server?.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start background jobs
const enableJobs = process.env.ENABLE_BACKGROUND_JOBS !== 'false';
if (enableJobs) {
  console.log('[Jobs] Starting background jobs...');
  startTrendingJobs();
  startCleanupJobs();
  console.log('[Jobs] Background jobs started successfully');
}

// Start server
server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Feed Service`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Background Jobs: ${enableJobs ? 'Enabled' : 'Disabled'}`);
  console.log('');
  console.log('   Endpoints:');
  console.log(`   - Feed:      http://localhost:${PORT}/api/feed`);
  console.log(`   - Follow:    http://localhost:${PORT}/api/follow`);
  console.log(`   - Trending:  http://localhost:${PORT}/api/trending`);
  console.log(`   - Health:    http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
});
