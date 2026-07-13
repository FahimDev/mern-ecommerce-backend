const express = require("express");
const healthRoutes = require("./health.routes");

const router = express.Router();

// Theory:
// A central route loader keeps app.js clean and makes API modules easier to discover.
router.use(healthRoutes);

module.exports = router;