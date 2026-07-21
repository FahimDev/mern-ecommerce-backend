// src/middleware/authMiddleware.js
// Two responsibilities:
//   1) protect  → validate access JWT and attach req.user
//   2) requireRole → enforce role-based authorization
//
// Cookie authentication is intentionally NOT done here; refresh-token
// verification has its own Redis check and belongs in the refresh route.

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        const error = new Error("Authentication token missing");
        error.statusCode = 401;
        throw error;
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        // Specific codes make Swagger error responses more useful.
        const e = new Error(err.name === "TokenExpiredError" ? "Access token expired" : "Invalid access token");
        e.statusCode = 401;
        throw e;
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
        const error = new Error("User no longer exists");
        error.statusCode = 401;
        throw error;
    }

    req.user = user;
    next();
});

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            const error = new Error("You do not have permission to perform this action");
            error.statusCode = 403;
            return next(error);
        }
        next();
    };
};

module.exports = { protect, requireRole };