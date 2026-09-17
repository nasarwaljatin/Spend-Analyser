const { z } = require('zod');

const createBudgetSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  limitAmount: z.number().positive('Limit must be positive'),
  period: z.enum(['monthly', 'yearly']),
  month: z.number().int().min(1).max(12).optional().nullable(),
  year: z.number().int().min(2000).max(2100),
  alertEnabled: z.boolean().default(true),
  alertThreshold: z.number().min(0).max(1).default(0.8),
});

const updateBudgetSchema = z.object({
  limitAmount: z.number().positive().optional(),
  alertEnabled: z.boolean().optional(),
  alertThreshold: z.number().min(0).max(1).optional(),
});

module.exports = { createBudgetSchema, updateBudgetSchema };
