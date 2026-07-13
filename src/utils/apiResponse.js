const successResponse = (res, statusCode, message, data = null, meta = null) => {
  // Theory:
  // A consistent response shape helps frontend, mobile, QA, and API consumers.
  // They can rely on success/message/data/meta everywhere.
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {})
  });
};

module.exports = { successResponse };