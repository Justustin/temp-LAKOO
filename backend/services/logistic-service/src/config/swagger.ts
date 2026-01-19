import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Logistics Service API',
      version: '1.0.0',
      description: 'Microservice for shipment management, tracking, courier integrations, and shipping rates',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3009}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        gatewayAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-gateway-secret'
        },
        internalAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-internal-api-key'
        }
      }
    },
    tags: [
      { name: 'Shipments', description: 'Shipment management endpoints' },
      { name: 'Rates', description: 'Shipping rate endpoints' },
      { name: 'Webhooks', description: 'Courier webhook endpoints' },
      { name: 'Admin - Shipments', description: 'Admin shipment management' },
      { name: 'Admin - Couriers', description: 'Admin courier management' },
      { name: 'Admin - Warehouses', description: 'Admin warehouse management' },
      { name: 'Internal', description: 'Internal service-to-service endpoints' }
    ]
  },
  apis: ['./src/controllers/*.ts', './src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
