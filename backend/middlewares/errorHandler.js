function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;

  console.error('[ORDER_MANAGEMENT_API_ERROR]', {
    message: err.message,
    statusCode,
    sqlMessage: err.sqlMessage || null,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    sqlMessage: err.sqlMessage || null,
  });
}

module.exports = { errorHandler };
