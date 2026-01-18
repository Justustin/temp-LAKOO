import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import warehouseRoutes from './routes/warehouse.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error-handler';

dotenv.config();

// Keep the default environment as development (similar to payment-service bootstrap)
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
const PORT = process.env.PORT || 3012;

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Security middleware
app.use(helmet());

// CORS (kept permissive for development; tighten for production when ready)
// const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
// app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cors());

// Logging (keep morgan + add a simple duration log like payment-service)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redirect root to API docs (similar to payment-service)
app.get('/', (_req, res) => {
  res.redirect('/api-docs');
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'warehouse-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global Error Handler (handles AppError, Prisma, etc.)
app.use(errorHandler);

const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server gracefully...');

  server.close(() => {
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

const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('Warehouse Service');
  console.log(`Running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});

export default app;
