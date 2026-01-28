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
        url: 'http://localhost:3015',
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
        GatewayAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-gateway-key',
          description: 'Gateway secret key for external requests via API Gateway'
        },
        ServiceAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-service-auth',
          description: 'Service-to-service HMAC token (format: serviceName:timestamp:signature)'
        },
        ServiceName: {
          type: 'apiKey',
          in: 'header',
          name: 'x-service-name',
          description: 'Calling service name (must match serviceName in x-service-auth token)'
        }
      },
      parameters: {
        XUserId: {
          name: 'x-user-id',
          in: 'header',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'User ID forwarded by API Gateway'
        },
        XUserRole: {
          name: 'x-user-role',
          in: 'header',
          required: false,
          schema: { type: 'string', enum: ['user', 'seller', 'brand_owner', 'admin'] },
          description: 'User role forwarded by API Gateway'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
