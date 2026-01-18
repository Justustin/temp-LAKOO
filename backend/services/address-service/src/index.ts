import dotenv from 'dotenv';
// Load env vars before config validation
dotenv.config();

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { swaggerSpec } from './config/swagger';
import addressRoutes from './routes/address.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'address-service',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/addresses', addressRoutes);

// Centralized error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

app.listen(config.port, () => {
  console.log(`Address Service running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Swagger docs: http://localhost:${config.port}/api-docs`);
});
