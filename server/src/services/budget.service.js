const prisma = require('../config/db');
const { ApiError } = require('../utils/helpers');

const getBudgets = async (userId) => {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: {
      category: { select: { name: true, icon: true, color: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate current usage for each budget
  const now = new Date();
  const enriched = await Promise.all(
    budgets.map(async (budget) => {
      let startDate, endDate;
      if (budget.period === 'monthly') {
        const m = budget.month || now.getMonth() + 1;
        startDate = new Date(budget.year, m - 1, 1);
        endDate = new Date(budget.year, m, 0);
      } else {
        startDate = new Date(budget.year, 0, 1);
        endDate = new Date(budget.year, 11, 31);
      }

      const spent = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'spend',
          transactionDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      });

      const currentSpend = Number(spent._sum.amount || 0);
      const limitAmount = Number(budget.limitAmount);
      const usagePercent = limitAmount > 0 ? (currentSpend / limitAmount) * 100 : 0;
      const isOverBudget = currentSpend > limitAmount;
      const isNearThreshold = usagePercent >= Number(budget.alertThreshold) * 100;

      return {
        ...budget,
        limitAmount,
        currentSpend: Number(currentSpend.toFixed(2)),
        remaining: Number((limitAmount - currentSpend).toFixed(2)),
        usagePercent: Number(usagePercent.toFixed(1)),
        isOverBudget,
        isNearThreshold,
      };
    })
  );

  return enriched;
};

const createBudget = async (userId, data) => {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId, type: 'spend' },
  });
  if (!category) throw new ApiError(404, 'Spend category not found');

  const budget = await prisma.budget.create({
    data: { userId, ...data },
    include: { category: { select: { name: true, icon: true, color: true } } },
  });
  return budget;
};

const updateBudget = async (userId, id, data) => {
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, 'Budget not found');

  const budget = await prisma.budget.update({
    where: { id },
    data,
    include: { category: { select: { name: true, icon: true, color: true } } },
  });
  return budget;
};

const deleteBudget = async (userId, id) => {
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, 'Budget not found');

  await prisma.budget.delete({ where: { id } });
  return { message: 'Budget deleted successfully' };
};

const getAlerts = async (userId) => {
  const budgets = await getBudgets(userId);
  return budgets.filter((b) => b.alertEnabled && (b.isNearThreshold || b.isOverBudget));
};

module.exports = { getBudgets, createBudget, updateBudget, deleteBudget, getAlerts };
