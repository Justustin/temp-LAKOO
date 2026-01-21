import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Brand Service API',
      version: '1.0.0',
      description: 'API documentation for LAKOO Brand Management Service - Multi-Brand Marketplace',
      contact: {
        name: 'LAKOO Team'
      }
    },
    servers: [
      {
        url: 'http://localhost:3004',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Brands',
        description: 'Brand management endpoints'
      },
      {
        name: 'Brand Products',
        description: 'Brand product catalog endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);