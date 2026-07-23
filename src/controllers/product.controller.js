const { z } = require("zod");

const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const productService = require("../services/product.service");

/*
 * Request schema — only trusted basic product facts.
 * SEO/marketing fields are intentionally absent; the backend generates them.
 */
const createProductSchema = z.object({
    name: z.string().min(2).max(200).trim(),
    brand: z.string().min(1).max(120).trim(),
    category: z.string().min(1).max(120).trim(),
    // Zod 4: .nonnegative() rejects NaN and -Infinity.
    price: z.number().nonnegative("Price cannot be negative"),
    features: z.array(z.string().min(2).max(200)).max(10).default([]),
});


const createProduct = asyncHandler(async (req, res) => {
    // `protect` middleware attaches req.user; `requireRole("admin")` runs first.
    if (!req.user || !req.user._id) {
        const err = new Error("Authenticated admin user is required");
        err.statusCode = 401;
        throw err;
    }
    const input = createProductSchema.parse(req.body);
    const product = await productService.createProduct(input, req.user._id);
    return successResponse(res, 201, "Product created successfully", {product})
});

module.exports = { createProduct };