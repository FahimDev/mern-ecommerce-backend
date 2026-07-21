const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const routes = require("./routes");
const swaggerSpec = require("./docs/swagger");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const redis = require("./config/redis");

const cookieParser = require("cookie-parser");

const app = express();

// Theory:
// Helmet sets useful security headers. This follows Express security best-practice guidance.
app.use(helmet());

// Theory:
// cookie-parser is required because we send the refresh token through an
// HttpOnly cookie. Without this, req.cookies is undefined.
//
// IMPORTANT: cookie-parser v1.4 exports a factory function — call it with
// `cookieParser()` (not bare `cookieParser`) so Express receives the actual
// middleware. Passing the factory directly makes Express treat it as the
// middleware and never call `next()`, hanging every request.
app.use(cookieParser());

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

// Theory:
// A dedicated Redis health endpoint keeps ops simple — load balancers and
// human eyes can both read it. PING returns "PONG" on success.
app.get("/api/health/redis", async (req, res) => {
    try {
        const pong = await redis.ping();
        const { successResponse } = require("./utils/apiResponse");
        return successResponse(res, 200, "Redis health check successful", {
            service: "redis",
            ping: pong,
        });
    } catch (err) {
        return res.status(503).json({
            success: false,
            message: "Redis unavailable",
            error: err.message,
        });
    }
});

// Theory:
// Browsers hitting `http://localhost:5000/` would otherwise get a flat
// "Cannot GET /" JSON response, which looks like the server is down.
// A tiny landing page confirms connectivity and links to the real entry
// points (health, Swagger UI, raw OpenAPI JSON).
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "E-commerce API is running",
        endpoints: {
            health: "/api/health",
            docs: "/api-docs",
            openapi: "/openapi.json",
            auth: "/api/auth",
        },
    });
});

// All API routes load from one place.
app.use(routes);

// 404 and error middleware must come after routes.
app.use(notFound);
app.use(errorHandler);

module.exports = app;




