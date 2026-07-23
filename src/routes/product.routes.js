const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { createProduct } = require("../controllers/product.controller");

const router = express.Router();

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product (admin only)
 *     description: |
 *       Creates a new product. The body must contain only basic, trusted
 *       product facts (name, brand, category, price, features). The
 *       backend calls an LLM to generate SEO/marketing fields (slug,
 *       shortDescription, description, seoTitle, metaDescription,
 *       keywords, bulletPoints) and returns the saved product.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ProductCreateRequest"
 *           examples:
 *             default:
 *               summary: Sample request
 *               value:
 *                 name: "Logitech MX Master 3S"
 *                 brand: "Logitech"
 *                 category: "Computer Accessories"
 *                 price: 12500
 *                 features:
 *                   - "Wireless connectivity"
 *                   - "Ergonomic design"
 *                   - "Rechargeable battery"
 *     responses:
 *       201:
 *         description: Product created. AI-generated fields are included.
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
 *                         product:
 *                           $ref: "#/components/schemas/Product"
 *             examples:
 *               created:
 *                 value:
 *                   success: true
 *                   message: "Product created successfully"
 *                   data:
 *                     product:
 *                       _id: "66b1d3a2c9e44a1f0b123456"
 *                       name: "Logitech MX Master 3S"
 *                       brand: "Logitech"
 *                       category: "Computer Accessories"
 *                       price: 12500
 *                       features: ["Wireless connectivity", "Ergonomic design", "Rechargeable battery"]
 *                       slug: "logitech-mx-master-3s-wireless-mouse"
 *                       shortDescription: "A premium wireless ergonomic mouse built for productive hours."
 *                       description: "The Logitech MX Master 3S is a wireless ergonomic mouse designed for long working sessions."
 *                       seoTitle: "Logitech MX Master 3S - Wireless Ergonomic Mouse"
 *                       metaDescription: "Shop the Logitech MX Master 3S wireless mouse - ergonomic, rechargeable, with quiet clicks."
 *                       keywords: ["wireless mouse", "ergonomic mouse", "logitech mx master", "rechargeable mouse"]
 *                       bulletPoints:
 *                         - "Wireless connectivity for clutter-free desks."
 *                         - "Ergonomic shape for all-day comfort."
 *                         - "Rechargeable battery for daily use."
 *                       createdBy: "66a3e9b2f1c2a4b5c6d7e8f9"
 *                       createdAt: "2026-07-21T10:00:00.000Z"
 *                       updatedAt: "2026-07-21T10:00:00.000Z"
 *       400:
 *         description: Validation failed (bad body or invalid AI output).
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 *       401:
 *         description: Missing or invalid access token.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 *       403:
 *         description: Authenticated user is not an admin.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 *       409:
 *         description: Slug already exists.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 *       502:
 *         description: AI provider failed or returned invalid content.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 *       503:
 *         description: AI quota exceeded, rate-limited, or auth failed (upstream 401/429).
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorEnvelope" }
 */
router.post("/", protect, requireRole("admin"), createProduct);

module.exports = router;