const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const routes = require("./routes");
const swaggerSpec = require("./docs/swagger");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Theory:
// Helmet sets useful security headers. This follows Express security best-practice guidance.
app.use(helmet());

// Theory:
// CORS controls which browser clients may call the API.
// In production, keep the origin strict instead of allowing everything.
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Theory:
// JSON parser converts incoming JSON request bodies into req.body.
app.use(express.json({ limit: "1mb" }));

// Theory:
// Morgan logs HTTP requests. Logs are important for debugging and operations.
app.use(morgan("dev"));

// Theory:
// Swagger UI is a human-readable viewer for the OpenAPI contract.
// The spec itself is generated at boot from JSDoc comments in src/routes/*.js.
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Machine-readable OpenAPI JSON, useful for codegen and external tooling.
app.get("/openapi.json", (req, res) => res.json(swaggerSpec));

// All API routes load from one place.
app.use(routes);

// 404 and error middleware must come after routes.
app.use(notFound);
app.use(errorHandler);

module.exports = app;




