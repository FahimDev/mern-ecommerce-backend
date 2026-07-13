const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "MERN Batch 15 E-commerce Backend API",
    version: "1.0.0",
    description: "Backend-only e-commerce API for teaching Express, MongoDB, Mongoose, Auth, Tasks/Orders and OpenAPI."
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Express server"
    }
  ],
  tags: [
    { name: "System", description: "Health and system routes" }
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Check API and database health",
        responses: {
          200: {
            description: "API is healthy"
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  }
};

module.exports = openApiDocument;