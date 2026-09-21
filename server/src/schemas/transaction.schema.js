const { z } = require('zod');

const createTransactionSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  type: z.enum(['spend', 'earning'], { required_error: 'Type must be spend or earning' }),
  amount: z
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

const updateTransactionSchema = createTransactionSchema.partial();

const transactionQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z.enum(['spend', 'earning']).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['transactionDate', 'amount', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = { createTransactionSchema, updateTransactionSchema, transactionQuerySchema };
