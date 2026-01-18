import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Address Service API',
      version: '2.0.0',
      description: 'User address management service for LAKOO e-commerce platform',
    },
    servers: [
      {
        url: 'http://localhost:3010',
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Addresses', description: 'Address management endpoints' },
      { name: 'Locations', description: 'Indonesian location data endpoints' }
    ],
    components: {
      securitySchemes: {
        gatewayAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-gateway-key',
          description: 'Gateway authentication key'
        },
        internalAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-internal-api-key',
          description: 'Internal service authentication key'
        }
      },
      schemas: {
        Address: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Address ID' },
            userId: { type: 'string', format: 'uuid', description: 'User ID' },
            label: { type: 'string', description: 'Address label (e.g., Home, Office)', example: 'Home' },
            recipientName: { type: 'string', description: 'Recipient name', example: 'John Doe' },
            phoneNumber: { type: 'string', description: 'Phone number', example: '081234567890' },
            alternatePhone: { type: 'string', description: 'Alternate phone number' },
            streetAddress: { type: 'string', description: 'Street address', example: 'Jl. Sudirman No. 123' },
            addressLine2: { type: 'string', description: 'Apartment, suite, unit, etc.' },
            rt: { type: 'string', description: 'Indonesian RT' },
            rw: { type: 'string', description: 'Indonesian RW' },
            villageId: { type: 'string', format: 'uuid', description: 'Village ID' },
            villageName: { type: 'string', description: 'Village/Kelurahan name' },
            districtId: { type: 'string', format: 'uuid', description: 'District ID' },
            districtName: { type: 'string', description: 'District/Kecamatan name', example: 'Menteng' },
            cityId: { type: 'string', format: 'uuid', description: 'City ID' },
            cityName: { type: 'string', description: 'City/Kabupaten name', example: 'Jakarta Pusat' },
            provinceId: { type: 'string', format: 'uuid', description: 'Province ID' },
            provinceName: { type: 'string', description: 'Province name', example: 'DKI Jakarta' },
            postalCode: { type: 'string', description: 'Postal code', example: '10310' },
            country: { type: 'string', description: 'Country', example: 'Indonesia' },
            countryCode: { type: 'string', description: 'Country code', example: 'ID' },
            latitude: { type: 'number', description: 'Latitude coordinate' },
            longitude: { type: 'number', description: 'Longitude coordinate' },
            geoAccuracy: { type: 'string', description: 'Geo accuracy (exact, approximate, postal_code)' },
            biteshipAreaId: { type: 'string', description: 'Biteship area ID for shipping' },
            jneAreaCode: { type: 'string', description: 'JNE area code' },
            jntAreaCode: { type: 'string', description: 'J&T area code' },
            isDefault: { type: 'boolean', description: 'Is default address', example: true },
            isValidated: { type: 'boolean', description: 'Is address validated' },
            validatedAt: { type: 'string', format: 'date-time', description: 'Validation timestamp' },
            deliveryNotes: { type: 'string', description: 'Delivery instructions' },
            landmark: { type: 'string', description: 'Nearby landmark', example: 'Near the mall' },
            lastUsedAt: { type: 'string', format: 'date-time', description: 'Last used timestamp' },
            useCount: { type: 'integer', description: 'Number of times address was used' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        CreateAddress: {
          type: 'object',
          required: ['recipientName', 'phoneNumber', 'streetAddress', 'cityName', 'provinceName', 'postalCode'],
          properties: {
            label: { type: 'string', description: 'Address label', example: 'Home' },
            recipientName: { type: 'string', description: 'Recipient name', example: 'John Doe' },
            phoneNumber: { type: 'string', description: 'Phone number', example: '081234567890' },
            alternatePhone: { type: 'string', description: 'Alternate phone number' },
            streetAddress: { type: 'string', description: 'Street address', example: 'Jl. Sudirman No. 123' },
            addressLine2: { type: 'string', description: 'Apartment, suite, unit, etc.' },
            rt: { type: 'string', description: 'Indonesian RT' },
            rw: { type: 'string', description: 'Indonesian RW' },
            villageId: { type: 'string', format: 'uuid' },
            villageName: { type: 'string' },
            districtId: { type: 'string', format: 'uuid' },
            districtName: { type: 'string', example: 'Menteng' },
            cityId: { type: 'string', format: 'uuid' },
            cityName: { type: 'string', example: 'Jakarta Pusat' },
            provinceId: { type: 'string', format: 'uuid' },
            provinceName: { type: 'string', example: 'DKI Jakarta' },
            postalCode: { type: 'string', example: '10310' },
            country: { type: 'string', example: 'Indonesia' },
            countryCode: { type: 'string', example: 'ID' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            geoAccuracy: { type: 'string' },
            biteshipAreaId: { type: 'string' },
            jneAreaCode: { type: 'string' },
            jntAreaCode: { type: 'string' },
            isDefault: { type: 'boolean', example: true },
            deliveryNotes: { type: 'string' },
            landmark: { type: 'string', example: 'Near the mall' }
          }
        },
        UpdateAddress: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            recipientName: { type: 'string' },
            phoneNumber: { type: 'string' },
            alternatePhone: { type: 'string' },
            streetAddress: { type: 'string' },
            addressLine2: { type: 'string' },
            rt: { type: 'string' },
            rw: { type: 'string' },
            villageId: { type: 'string', format: 'uuid' },
            villageName: { type: 'string' },
            districtId: { type: 'string', format: 'uuid' },
            districtName: { type: 'string' },
            cityId: { type: 'string', format: 'uuid' },
            cityName: { type: 'string' },
            provinceId: { type: 'string', format: 'uuid' },
            provinceName: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            countryCode: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            geoAccuracy: { type: 'string' },
            biteshipAreaId: { type: 'string' },
            jneAreaCode: { type: 'string' },
            jntAreaCode: { type: 'string' },
            isDefault: { type: 'boolean' },
            deliveryNotes: { type: 'string' },
            landmark: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
