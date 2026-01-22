import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Review Service API',
      version: '1.0.0',
      description: 'API documentation for LAKOO Review Service - Product reviews, ratings, votes, and moderation',
      contact: {
        name: 'LAKOO Team'
      }
    },
    servers: [
      {
        url: 'http://localhost:3016',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Reviews',
        description: 'Product review management'
      },
      {
        name: 'Votes',
        description: 'Review voting (helpful/unhelpful)'
      },
      {
        name: 'Reports',
        description: 'Report inappropriate reviews'
      },
      {
        name: 'Replies',
        description: 'Seller/brand responses to reviews'
      },
      {
        name: 'Review Requests',
        description: 'Review request management'
      },
      {
        name: 'Moderation',
        description: 'Admin moderation endpoints'
      },
      {
        name: 'Summary',
        description: 'Product review summaries'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
