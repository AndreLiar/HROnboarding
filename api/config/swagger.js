const swaggerJsdoc = require('swagger-jsdoc');

const PORT = process.env.PORT || 3001;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HR Onboarding API',
      version: '1.0.0',
      description: 'API pour la génération et le partage de checklists d\'intégration RH en France',
      contact: {
        name: 'HR Onboarding Support',
        email: 'support@hronboarding.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://hr-onboarding-dev-r2x0-api.azurewebsites.net'
          : `http://localhost:${PORT}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      schemas: {
        ChecklistItem: {
          type: 'object',
          properties: {
            étape: {
              type: 'string',
              description: 'Description de l\'étape d\'intégration'
            }
          },
          required: ['étape']
        },
        GenerateRequest: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Rôle du nouvel employé',
              example: 'Développeur Senior'
            },
            department: {
              type: 'string',
              description: 'Département du nouvel employé',
              example: 'Informatique'
            }
          },
          required: ['role', 'department']
        },
        GenerateResponse: {
          type: 'object',
          properties: {
            checklist: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ChecklistItem'
              }
            },
            role: {
              type: 'string'
            },
            department: {
              type: 'string'
            }
          }
        },
        ShareRequest: {
          type: 'object',
          properties: {
            checklist: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ChecklistItem'
              }
            },
            role: {
              type: 'string'
            },
            department: {
              type: 'string'
            }
          },
          required: ['checklist']
        },
        ShareResponse: {
          type: 'object',
          properties: {
            slug: {
              type: 'string',
              description: 'Identifiant unique pour partager la checklist'
            }
          }
        },
        SharedChecklist: {
          type: 'object',
          properties: {
            checklist: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ChecklistItem'
              }
            },
            role: {
              type: 'string'
            },
            department: {
              type: 'string'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        HealthResponse: {
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
            version: {
              type: 'string',
              example: '1.0.0'
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  enum: ['Connected', 'Disconnected', 'Unknown']
                },
                openai: {
                  type: 'string',
                  enum: ['Available', 'Not configured']
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string'
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './controllers/*.js']
};

const specs = swaggerJsdoc(swaggerOptions);

module.exports = specs;