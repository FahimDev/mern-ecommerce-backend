// Theory:
// OpenAPI is generated from Zod schemas. To add a new endpoint, define
// the schema in your controller, call `routeDocument()` in a
// `src/docs/routes/<feature>.routes.docs.js` module, then add it to the
// require list below. The generator takes care of components, request
// bodies, and responses.
//
// To list registered operations for debugging:
//   curl http://localhost:5000/openapi.json | jq '.paths | keys'

const { z } = require("zod");
const {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
} = require("@asteasolutions/zod-to-openapi");

// Pulling schemas here ensures their `.openapi()` registrations happen
// before the generator runs, so `components.schemas` is fully populated.
const { bearerAuth } = require("./schemas");
require("./schemas");
require("../controllers/auth.controller");

// Side-effect imports: each route doc file calls routeDocument() at
// module load, which writes into the shared OpenAPIRegistry. So all we
// need to do here is require them.
require("./routes/health.routes.docs");
require("./routes/auth.routes.docs");

// Once you add a new <feature>.routes.docs.js, append it here:
//   require("./routes/<feature>.routes.docs");

const { registry } = require("./routeDocument");

extendZodWithOpenApi(z);

// Register non-Zod OpenAPI components (security schemes, raw responses).
// Plain JS objects cannot be inferred from `.openapi()` calls.
registry.registerComponent("securitySchemes", "bearerAuth", bearerAuth);

const openApiDocument = new OpenApiGeneratorV3(
  registry.definitions
).generateDocument({
  openapi: "3.0.3",
  info: {
    title: "MERN Batch 15 E-commerce Backend API",
    version: "1.0.0",
    description:
      "Backend-only e-commerce API. Validation, types, and OpenAPI are all " +
      "derived from the same Zod schemas — see src/controllers/ and " +
      "src/docs/ for the source of truth.",
  },
  servers: [
    { url: "http://localhost:5000", description: "Local Express server" },
  ],
  tags: [
    { name: "System", description: "Health and system routes" },
    { name: "Auth", description: "Authentication and account routes" },
  ],
});

module.exports = openApiDocument;
