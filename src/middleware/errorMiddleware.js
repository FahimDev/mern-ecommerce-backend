const notFound = (req, res, next) => {
    const error = new Error(`Route not found: ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

const errorHandler = (err, req, res, next) => {
    // Theory:
    // Central error handling prevents every controller from manually formatting errors.
    // In production, do not expose stack traces to clients.
    const statusCode = err.statusCode || 500;

    // Mongoose duplicate-key error → 409 Conflict with a friendly message.
    if (err && err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: "Resource already exists"
        });
    }

    // Mongoose ObjectId cast error (e.g. /api/products/notanid) → 400.
    if (err && err.name === "CastError" && err.kind === "ObjectId") {
        return res.status(400).json({
            success: false,
            message: "Invalid identifier",
        });
    }

    // Zod validation errors → 400 with a list of issues.
    if (err && err.name === "ZodError") {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: err.issues
        });
    }

    // Redis errors → 503 so callers can retry with backoff.
    if (err && (err.code === "ECONNREFUSED" || /Redis|ECONNRESET/.test(err.name || ""))) {
        return res.status(503).json({
            success: false,
            message: "Temporary cache unavailable",
        });
    }

    res.status(statusCode).json({
        success: false,
        message: err.message || "Server error",
        ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {})
    });
};

module.exports = { notFound, errorHandler };