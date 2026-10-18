const prisma = require('../config/db');
const { ApiError } = require('../utils/helpers');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Adds derived progress fields: percent, remaining, days left and the
 * monthly saving required to hit the target by the deadline.
 */
const enrichGoal = (goal) => {
  const targetAmount = Number(goal.targetAmount);
  const savedAmount = Number(goal.savedAmount);
  const remaining = Math.max(0, targetAmount - savedAmount);
  const progressPercent = targetAmount > 0 ? Math.min(100, (savedAmount / targetAmount) * 100) : 0;

  let daysLeft = null;
  let monthlyRequired = null;
  if (goal.deadline) {
    daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / MS_PER_DAY);
    if (remaining > 0) {
      const monthsLeft = Math.max(1, daysLeft / 30.44);
      monthlyRequired = daysLeft > 0 ? remaining / monthsLeft : remaining;
    }
  }

  return {
    ...goal,
    targetAmount,
    savedAmount,
    remaining: Number(remaining.toFixed(2)),
    progressPercent: Number(progressPercent.toFixed(1)),
    daysLeft,
    monthlyRequired: monthlyRequired !== null ? Number(monthlyRequired.toFixed(2)) : null,
    isOverdue: daysLeft !== null && daysLeft < 0 && remaining > 0,
  };
};

const getGoals = async (userId) => {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
  });
  return goals.map(enrichGoal);
};

const findOwnedGoal = async (userId, id) => {
  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) throw new ApiError(404, 'Savings goal not found');
  return goal;
};

const createGoal = async (userId, data) => {
  const savedAmount = data.savedAmount || 0;
  const goal = await prisma.savingsGoal.create({
    data: {
      userId,
      name: data.name.trim(),
      icon: data.icon,
      color: data.color,
      targetAmount: data.targetAmount,
      savedAmount,
      deadline: data.deadline ? new Date(data.deadline) : null,
      isCompleted: savedAmount >= data.targetAmount,
    },
  });
  return enrichGoal(goal);
};

const updateGoal = async (userId, id, data) => {
  const existing = await findOwnedGoal(userId, id);

  const updateData = { ...data };
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;

  const target = data.targetAmount ?? Number(existing.targetAmount);
  const saved = data.savedAmount ?? Number(existing.savedAmount);
  updateData.isCompleted = saved >= target;

  const goal = await prisma.savingsGoal.update({ where: { id }, data: updateData });
  return enrichGoal(goal);
};

const contributeToGoal = async (userId, id, amount) => {
  const existing = await findOwnedGoal(userId, id);
  const saved = Number(existing.savedAmount) + amount;
  if (saved < 0) throw new ApiError(400, 'Cannot withdraw more than the saved amount');

  const goal = await prisma.savingsGoal.update({
    where: { id },
    data: {
      savedAmount: Number(saved.toFixed(2)),
      isCompleted: saved >= Number(existing.targetAmount),
    },
  });
  return enrichGoal(goal);
};

const deleteGoal = async (userId, id) => {
  await findOwnedGoal(userId, id);
  await prisma.savingsGoal.delete({ where: { id } });
  return { message: 'Savings goal deleted successfully' };
};

module.exports = { getGoals, createGoal, updateGoal, contributeToGoal, deleteGoal };
