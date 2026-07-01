function validateRequest(validator) {
  return (req, _res, next) => {
    const result = validator(req.body, req);
    if (result === true || result?.valid === true) return next();

    const message = result?.message || 'Invalid request payload.';
    const error = Object.assign(new Error(message), {
      statusCode: 400,
      errors: result?.errors || [],
    });
    return next(error);
  };
}

module.exports = { validateRequest };
