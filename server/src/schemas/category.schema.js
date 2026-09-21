const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  type: z.enum(['spend', 'earning'], { required_error: 'Type must be spend or earning' }),
  icon: z.string().max(10).default('💰'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color')
    .default('#6366f1'),
  isHidden: z.boolean().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['spend', 'earning']).optional(),
  icon: z.string().max(10).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color')
    .optional(),
  isHidden: z.boolean().optional(),
});

module.exports = { createCategorySchema, updateCategorySchema };
