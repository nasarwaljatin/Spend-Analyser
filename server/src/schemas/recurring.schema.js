const { z } = require('zod');

const createRecurringSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  type: z.enum(['spend', 'earning']),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('INR'),
  description: z.string().max(500).optional().nullable().default(''),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date',
  }),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' })
    .optional()
    .nullable(),
});

const updateRecurringSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  description: z.string().max(500).optional().nullable(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date' })
    .optional()
    .nullable(),
});

module.exports = { createRecurringSchema, updateRecurringSchema };
