// Theory:
// One small file owns the OpenAPI definition for the whole app.
// The endpoints themselves are documented via JSDoc `@openapi`
// blocks placed directly above each `router.<method>(...)` call
// in `src/routes/*.js`. swagger-jsdoc gathers those comments and
// feeds them to swagger-ui-express at /api-docs.

const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "MERN E-commerce Backend API",
      version: "1.0.0",
      description:
        "Backend-only e-commerce API. Endpoints are documented " +
        "inline in src/routes/*.js using JSDoc @openapi blocks.",
    },
    servers: [
      { url: "http://localhost:5000", description: "Local Express server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT issued by an auth endpoint (coming soon).",
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "OK" },
            data: { type: "object" },
          },
          required: ["success", "message"],
        },
        ErrorEnvelope: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation failed" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: {
                    type: "array",
                    items: {
                      anyOf: [{ type: "string" }, { type: "number" }],
                    },
                  },
                  message: { type: "string" },
                },
              },
            },
          },
          required: ["success", "message"],
        },
        User: {
          type: "object",
          description: "Public user object. Never includes the password hash.",
          properties: {
            _id:           { type: "string",  example: "66a3e9b2f1c2a4b5c6d7e8f9" },
            name:          { type: "string",  example: "Fahim Ahmed" },
            email:         { type: "string",  format: "email", example: "fahim@example.com" },
            role:          { type: "string",  enum: ["customer", "admin", "vendor"], example: "customer" },
            emailVerified: { type: "boolean", example: false },
            createdAt:     { type: "string",  format: "date-time", example: "2026-07-15T07:46:08.271Z" },
            updatedAt:     { type: "string",  format: "date-time", example: "2026-07-15T07:46:08.271Z" },
          },
          required: ["_id", "name", "email", "role"],
        },
      },
    },
  },
  apis: [
    // Pull every JSDoc block from the route files.
    path.join(__dirname, "..", "routes", "*.js"),
  ],
};

module.exports = swaggerJsdoc(options);