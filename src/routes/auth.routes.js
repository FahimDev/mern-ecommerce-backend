const express = require("express");
const { register } = require("../controllers/auth.controller");

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a customer account
 *     description: |
 *       Creates a new user with the `customer` role. Email must be unique
 *       (enforced by a DB-level unique index). The password is bcrypt-hashed
 *       before storage; the hash is never returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string, minLength: 2,  example: "Fahim Ahmed" }
 *               email:    { type: string, format: email, example: "fahim@example.com" }
 *               password: { type: string, minLength: 6,  example: "secret123",
 *                           description: "Minimum 6 characters. Hashed with bcrypt before storage." }
 *           examples:
 *             default:
 *               summary: Sample registration
 *               value:
 *                 name: "Fahim Ahmed"
 *                 email: "fahim@example.com"
 *                 password: "secret123"
 *     responses:
 *       201:
 *         description: User created.
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
 *                         user: { $ref: "#/components/schemas/User" }
 *             examples:
 *               created:
 *                 summary: Created user
 *                 value:
 *                   success: true
 *                   message: "User registered successfully"
 *                   data:
 *                     user:
 *                       _id: "66a3e9b2f1c2a4b5c6d7e8f9"
 *                       name: "Fahim Ahmed"
 *                       email: "fahim@example.com"
 *                       role: "customer"
 *                       emailVerified: false
 *                       createdAt: "2026-07-15T07:46:08.271Z"
 *                       updatedAt: "2026-07-15T07:46:08.271Z"
 *       400:
 *         description: Validation failed (bad name, email, or short password).
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 *       409:
 *         description: Email already exists.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 */
router.post("/register", register);

module.exports = router;