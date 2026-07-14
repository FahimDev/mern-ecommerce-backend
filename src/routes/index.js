const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");

const router = express.Router();

// Theory:
// A central route loader keeps app.js clean and makes API modules easier to discover.
// Each feature module keeps its own sub-paths (e.g. /api/auth/*, /api/health)
// so URLs match the OpenAPI contract in src/docs/openapi.js.
router.use("/api", healthRoutes);
router.use("/api/auth", authRoutes);

module.exports = router;