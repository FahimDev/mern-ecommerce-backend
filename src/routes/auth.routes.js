const express = require("express");
const {
    register,
    login,
    me,
    refresh,
    logout,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/authMiddleware");

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

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email + password
 *     description: |
 *       Verifies credentials, mints a short-lived **access JWT** (returned in
 *       the response body) and a long-lived **refresh JWT** (sent as the
 *       `rt` HttpOnly cookie). A session record is stored in Redis keyed by
 *       the refresh token's `sid` claim for later revocation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email, example: "fahim@example.com" }
 *               password: { type: string, minLength: 6,  example: "secret123" }
 *           examples:
 *             default:
 *               value:
 *                 email: "fahim@example.com"
 *                 password: "secret123"
 *     responses:
 *       200:
 *         description: "Login succeeded. `Set-Cookie: rt=...; HttpOnly` is also returned."
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token cookie. HttpOnly, SameSite=Lax, 7-day expiry.
 *             schema: { type: string }
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
 *                         accessToken:
 *                           type: string
 *                           description: "Short-lived bearer token. Send as `Authorization: Bearer <token>` for protected routes."
 *                           example: "eyJhbGciOi..."
 *       400:
 *         description: Validation failed.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 *       401:
 *         description: Invalid email or password (same message regardless of which field was wrong).
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 */
router.post("/login", login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     description: |
 *       Returns the user profile attached to the **access JWT** in the
 *       `Authorization: Bearer …` header. The password hash is stripped.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current authenticated user.
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
 *       401:
 *         description: Missing, invalid, or expired access token.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 */
router.get("/me", protect, me);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh the access token using the refresh cookie
 *     description: |
 *       Reads the `rt` HttpOnly cookie, verifies it against the
 *       `REFRESH_TOKEN_SECRET`, looks up the session in Redis by the
 *       `sid` claim, then **rotates** the session (delete old key, save
 *       new key, issue a new refresh token) and mints a fresh access JWT.
 *     responses:
 *       200:
 *         description: New access token issued.
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
 *                         accessToken:
 *                           type: string
 *                           example: "eyJhbGciOi..."
 *       401:
 *         description: Missing, invalid, expired, or revoked refresh token.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 */
router.post("/refresh", refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out (clear refresh cookie + delete session)
 *     description: |
 *       Best-effort logout. If the `rt` cookie is present and its `sid`
 *       resolves to a live Redis session, the session is deleted and the
 *       cookie is cleared. The endpoint is idempotent: missing cookies
 *       still produce 200.
 *     responses:
 *       200:
 *         description: Logged out (or already logged out).
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessEnvelope" }
 */
router.post("/logout", logout);

module.exports = router;