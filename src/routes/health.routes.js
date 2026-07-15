const express = require("express");
const mongoose = require("mongoose");
const {successResponse} = require("../utils/apiResponse");

const router = express.Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Check API and database health
 *     description: |
 *       Used by humans, load balancers, and deployment scripts.
 *       Returns the database readyState along with the API service name.
 *
 *       `readyState`: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting.
 *     responses:
 *       200:
 *         description: API is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessEnvelope"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         service:   { type: string,  example: "mern-ecommerce-backend" }
 *                         database:  { type: string,  enum: [connected, not-connected], example: "connected" }
 *                         timestamp: { type: string,  format: date-time, example: "2026-07-15T07:46:08.271Z" }
 *             examples:
 *               healthy:
 *                 summary: Healthy
 *                 value:
 *                   success: true
 *                   message: "API health check successful"
 *                   data:
 *                     service: "mern-ecommerce-backend"
 *                     database: "connected"
 *                     timestamp: "2026-07-15T07:46:08.271Z"
 */
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