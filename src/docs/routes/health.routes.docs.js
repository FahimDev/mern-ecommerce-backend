const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");
const { routeDocument } = require("../routeDocument");
const { SuccessEnvelope } = require("../schemas");

extendZodWithOpenApi(z);

// Health data shape: { service, database, timestamp }
const HealthData = z
  .object({
    service: z.string().openapi({ example: "mern-ecommerce-backend" }),
    database: z
      .enum(["connected", "not-connected"])
      .openapi({ example: "connected" }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: "2026-07-14T07:46:08.271Z" }),
  })
  .openapi("HealthData", { description: "Snapshot of API and database state." });

const healthResponseSchema = SuccessEnvelope(HealthData, "HealthResponse");

const health = routeDocument({
  tag: "System",
  method: "get",
  path: "/api/health",
  summary: "Check API and database health",
  description:
    "Used by humans, load balancers, and deployment scripts. " +
    "Returns the database readyState along with the API service name.",
  responses: {
    200: {
      description: "API is healthy",
      schema: healthResponseSchema,
      examples: {
        default: {
          summary: "Healthy",
          value: {
            success: true,
            message: "API health check successful",
            data: {
              service: "mern-ecommerce-backend",
              database: "connected",
              timestamp: "2026-07-14T07:46:08.271Z",
            },
          },
        },
      },
    },
  },
});

module.exports = [health];