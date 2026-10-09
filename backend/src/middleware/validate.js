import { AppError } from '../utils/AppError.js';

/**
 * validate({ body, query, params }) — parsed (and coerced) values replace the originals,
 * so handlers only ever see clean data.
 */
export const validate = (schemas) => (req, _res, next) => {
  const details = {};

  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) {
      // req.query is a getter in Express 5; define it so this stays portable
      Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
    } else {
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || part;
        (details[key] ??= []).push(issue.message);
      }
    }
  }

  if (Object.keys(details).length) return next(AppError.validation('Please fix the highlighted fields', details));
  next();
};
