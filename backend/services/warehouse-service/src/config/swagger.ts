import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Warehouse Service API',
      version: '1.0.0',
      description: `Warehouse inventory, grosir bundle management, stock reservations, and purchase orders.

**Base URL:** \`http://localhost:3012\``,
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3012',
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Warehouse', description: 'Inventory status, bundle checks, reservations (internal)' },
      { name: 'Warehouse - Internal', description: 'Internal service-to-service endpoints' },
      { name: 'Admin - Inventory', description: 'Admin inventory management' },
      { name: 'Admin - Reservations', description: 'Reservation expiry processing' },
      { name: 'Admin - Grosir', description: 'Grosir bundle configuration and tolerances' },
      { name: 'Admin - Alerts', description: 'Stock alert management' },
      { name: 'Admin - Purchase Orders', description: 'Purchase order management and receiving' },
      { name: 'Health', description: 'Service health check' }
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Check if the warehouse service is running',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'healthy' },
                      service: { type: 'string', example: 'warehouse-service' },
                      timestamp: { type: 'string', format: 'date-time' },
                      version: { type: 'string', example: '1.0.0' },
                      environment: { type: 'string', example: 'development' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  // Route files contain @swagger JSDoc blocks
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);

