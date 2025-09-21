const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cocktail Ordering System API',
      version: '1.0.0',
      description: 'A complete backend API for a cocktail ordering system with Express.js, Node.js, and MongoDB. Features JWT authentication, Paystack payment integration, and comprehensive admin management.',
      contact: {
        name: 'Clyp AI',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Validation error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Success status'
            },
            message: {
              type: 'string',
              description: 'Success message'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Items per page'
            },
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Admin user authentication endpoints'
      },
      {
        name: 'Catalog',
        description: 'Cocktail catalog management. Public endpoints for browsing, admin endpoints for CRUD operations.'
      },
      {
        name: 'Orders',
        description: 'Order management. Public endpoints for creating orders, admin endpoints for management.'
      },
      {
        name: 'Payments',
        description: 'Payment processing with Paystack integration. Public endpoints for payment flow, admin endpoints for monitoring.'
      },
      {
        name: 'Admin',
        description: 'Admin dashboard and management endpoints. Requires authentication.'
      },
      {
        name: 'Order Tracking',
        description: 'Order tracking endpoints for customers to monitor their orders. Public endpoints.'
      },
      {
        name: 'Email Validation',
        description: 'Email validation using Gmail SMTP with OTP verification. Public endpoints.'
      },
      {
        name: 'Inventory Management',
        description: 'Inventory management with low stock alerts and email notifications. Admin only.'
      }
    ],
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check endpoint',
          description: 'Check if the API is running and healthy',
          responses: {
            200: {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'OK'
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time'
                      },
                      service: {
                        type: 'string',
                        example: 'Cocktail Ordering System'
                      }
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
  apis: ['./routes/*.js', './server.js'] // Paths to files containing OpenAPI definitions
};

const specs = swaggerJSDoc(options);

module.exports = specs;
