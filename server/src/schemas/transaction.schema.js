const { z } = require('zod');

const baseTransactionSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  type: z.enum(['spend', 'earning'], { required_error: 'Type must be spend or earning' }),
  amount: z.coerce
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be positive')
    .max(999999999999, 'Amount too large'),
  currency: z.string().length(3).default('INR'),
  description: z.string().max(500).optional().nullable().default(''),
  transactionDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  notes: z.string().max(1000).optional().nullable(),
});

const recurrenceSchema = z
  .object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' })
      .optional()
      .nullable(),
  })
  .optional()
  .nullable();

const createTransactionSchema = baseTransactionSchema.extend({ recurrence: recurrenceSchema });

const updateTransactionSchema = baseTransactionSchema.partial();

const transactionQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z.enum(['spend', 'earning']).optional(),
  categoryId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['transactionDate', 'amount', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  groupBy: z.enum(['day', 'month', 'year']).optional(),
  tzOffset: z.string().regex(/^-?\d{1,4}$/).optional(),
});

const bulkDeleteTransactionsSchema = z.object({
  ids: z.array(z.string().min(1, 'Invalid transaction ID')).min(1, 'At least one transaction ID is required'),
});

const bulkUpdateCategorySchema = z.object({
  ids: z.array(z.string().min(1, 'Invalid transaction ID')).min(1, 'At least one transaction ID is required'),
  categoryId: z.string().min(1, 'Target category is required'),
});

const importTransactionsSchema = z.object({
  rows: z
    .array(
      z.object({
        type: z.enum(['spend', 'earning']),
        amount: z.coerce.number().positive('Amount must be positive').max(999999999999),
        transactionDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
          message: 'Invalid date format',
        }),
        description: z.string().max(500).optional().nullable(),
        category: z.string().max(100).optional().nullable(),
        notes: z.string().max(1000).optional().nullable(),
      })
    )
    .min(1, 'Nothing to import')
    .max(5000, 'You can import at most 5000 rows at once'),
  createMissingCategories: z.boolean().default(true),
});

module.exports = {
  importTransactionsSchema,
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  bulkDeleteTransactionsSchema,
  bulkUpdateCategorySchema,
};
