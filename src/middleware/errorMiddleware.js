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
      message: "Email already exists"
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

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server error",
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {})
  });
};

module.exports = { notFound, errorHandler };