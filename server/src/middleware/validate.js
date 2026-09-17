/**
 * Creates a middleware that validates request body/query/params against a Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Where to look for data
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    req[source] = result.data;
    next();
  };
};

module.exports = validate;
