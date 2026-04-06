export function notFoundMiddleware(req, res) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found.'
    }
  });
}

export function errorMiddleware(error, req, res, _next) {
  const statusCode =
    Number.isInteger(error?.statusCode) && error.statusCode >= 400
      ? error.statusCode
      : 500;

  const code = error?.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  const message =
    statusCode === 500
      ? 'Unexpected server error.'
      : error?.message || 'Request failed.';

  const payload = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (error?.details) {
    payload.error.details = error.details;
  }

  if (statusCode === 500) {
    console.error(error);
  }

  return res.status(statusCode).json(payload);
}
