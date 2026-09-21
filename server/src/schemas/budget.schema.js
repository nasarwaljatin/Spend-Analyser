const { z } = require('zod');

const createBudgetSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  limitAmount: z.coerce.number().positive('Limit must be positive'),
  period: z.enum(['monthly', 'yearly']),
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  year: z.coerce.number().int().min(2000).max(2100),
  alertEnabled: z.boolean().default(true),
  alertThreshold: z.coerce.number().min(0).max(1).default(0.8),
});

const updateBudgetSchema = z.object({
  limitAmount: z.coerce.number().positive().optional(),
  alertEnabled: z.boolean().optional(),
  alertThreshold: z.coerce.number().min(0).max(1).optional(),
});

module.exports = { createBudgetSchema, updateBudgetSchema };
