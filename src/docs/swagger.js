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
        Product: {
          type: "object",
          description: "A product as stored in MongoDB and returned by the API.",
          properties: {
            _id:               { type: "string", example: "66b1d3a2c9e44a1f0b123456" },
            name:              { type: "string", example: "Logitech MX Master 3S" },
            brand:             { type: "string", example: "Logitech" },
            category:          { type: "string", example: "Computer Accessories" },
            price:             { type: "number", example: 12500 },
            features:          { type: "array", items: { type: "string" } },
            slug:              { type: "string", example: "logitech-mx-master-3s-wireless-mouse" },
            shortDescription:  { type: "string", example: "A premium wireless ergonomic mouse built for productive hours." },
            description:       { type: "string" },
            seoTitle:          { type: "string" },
            metaDescription:   { type: "string" },
            keywords:          { type: "array", items: { type: "string" } },
            bulletPoints:      { type: "array", items: { type: "string" } },
            createdBy:         { type: "string", example: "66a3e9b2f1c2a4b5c6d7e8f9" },
            createdAt:         { type: "string", format: "date-time" },
            updatedAt:         { type: "string", format: "date-time" }
          },
          required: ["_id", "name", "brand", "category", "price", "slug"]
        },
        ProductCreateRequest: {
          type: "object",
          description: "Trusted basic product facts sent by the admin. SEO fields are NOT included - the backend generates them.",
          required: ["name", "brand", "category", "price"],
          properties: {
            name:     { type: "string", minLength: 2,  maxLength: 200, example: "Logitech MX Master 3S" },
            brand:    { type: "string", minLength: 1,  maxLength: 120, example: "Logitech" },
            category: { type: "string", minLength: 1,  maxLength: 120, example: "Computer Accessories" },
            price:    { type: "number", minimum: 0,    example: 12500 },
            features: { type: "array", items: { type: "string", minLength: 2, maxLength: 200 }, maxItems: 10 }
          }
        }
      },
    },
  },
  apis: [
    // Pull every JSDoc block from the route files.
    path.join(__dirname, "..", "routes", "*.js"),
  ],
};

module.exports = swaggerJsdoc(options);