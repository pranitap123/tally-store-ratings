import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

export const notFoundHandler = (req, _res, next) =>
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  // body-parser: malformed JSON / payload too large
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
  }

  // last line of defence if a unique constraint slips past the service checks
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'That value is already in use' } });
  }

  (req.log ?? logger).error({ err }, 'unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side' } });
};
