const asyncHandler = (fn) => {
  // Theory:
  // Express does not automatically catch rejected promises in async route handlers in older patterns.
  // This wrapper forwards async errors to the central error middleware.
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;