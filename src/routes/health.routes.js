const express = require("express");
const mongoose = require("mongoose");
const {successResponse} = require("../utils/apiResponse");

const router = express.Router();

router.get("/health", (req, res) => {
  // Theory:
  // Health routes are used by humans, load balancers, deployment scripts, and monitoring tools.
  // readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting.
    const dbState = mongoose.connection.readyState;

    successResponse(res, 200, "API health check successful", {
        service: "mern-ecommerce-backend",
        database: dbState === 1 ? "connected" : "not-connected",
        timestamp: new Date().toISOString()
    });

});

module.exports = router;