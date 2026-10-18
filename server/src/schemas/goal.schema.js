const { z } = require('zod');

const deadlineField = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid deadline date' })
  .optional()
  .nullable();

const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100),
  icon: z.string().max(10).default('🎯'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex code')
    .default('#6366f1'),
  targetAmount: z.coerce
    .number({ required_error: 'Target amount is required' })
    .positive('Target must be positive')
    .max(999999999999, 'Amount too large'),
  savedAmount: z.coerce.number().min(0, 'Saved amount cannot be negative').default(0),
  deadline: deadlineField,
});

const updateGoalSchema = createGoalSchema.partial();

const contributeGoalSchema = z.object({
  // Positive adds money to the goal, negative withdraws from it
  amount: z.coerce
    .number({ required_error: 'Amount is required' })
    .refine((val) => val !== 0, { message: 'Amount cannot be zero' }),
});

module.exports = { createGoalSchema, updateGoalSchema, contributeGoalSchema };
