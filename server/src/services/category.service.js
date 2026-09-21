const prisma = require('../config/db');
const { ApiError } = require('../utils/helpers');

const getCategories = async (userId, type, includeHidden = false) => {
  const where = { userId };
  if (type) where.type = type;
  if (!includeHidden) where.isHidden = false;

  const categories = await prisma.category.findMany({
    where,
    include: {
      _count: { select: { transactions: true } },
    },
  });

  // Sort by number of times chosen (transaction usage count) descending, then alphabetically by name
  categories.sort((a, b) => {
    const countA = a._count?.transactions || 0;
    const countB = b._count?.transactions || 0;
    if (countB !== countA) return countB - countA;
    return a.name.localeCompare(b.name);
  });

  return categories;
};

const createCategory = async (userId, data) => {
  const category = await prisma.category.create({
    data: {
      userId,
      name: data.name.trim(),
      type: data.type,
      icon: data.icon || '💰',
      color: data.color || '#6366f1',
      isDefault: false,
      isHidden: data.isHidden || false,
    },
    include: {
      _count: { select: { transactions: true } },
    },
  });
  return category;
};

const updateCategory = async (userId, id, data) => {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, 'Category not found');

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.type !== undefined) updateData.type = data.type;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.isHidden !== undefined) updateData.isHidden = data.isHidden;

  const category = await prisma.category.update({
    where: { id },
    data: updateData,
    include: {
      _count: { select: { transactions: true } },
    },
  });
  return category;
};

const deleteCategory = async (userId, id, reassignCategoryId) => {
  const existing = await prisma.category.findFirst({
    where: { id, userId },
    include: { _count: { select: { transactions: true } } },
  });
  if (!existing) throw new ApiError(404, 'Category not found');

  if (existing._count.transactions > 0) {
    if (reassignCategoryId && reassignCategoryId !== id) {
      const targetCat = await prisma.category.findFirst({
        where: { id: reassignCategoryId, userId },
      });
      if (!targetCat) throw new ApiError(404, 'Target category for reassignment not found');

      // Reassign transactions to target category
      await prisma.transaction.updateMany({
        where: { categoryId: id, userId },
        data: { categoryId: reassignCategoryId },
      });

      // Reassign recurring rules
      await prisma.recurringTransaction.updateMany({
        where: { categoryId: id, userId },
        data: { categoryId: reassignCategoryId },
      });

      // Remove related budgets
      await prisma.budget.deleteMany({
        where: { categoryId: id, userId },
      });
    } else {
      throw new ApiError(
        400,
        `Cannot delete category with ${existing._count.transactions} existing transaction(s). You can hide it instead, or choose a category to reassign its transactions.`
      );
    }
  } else {
    // Delete associated budgets and recurring rules if any
    await prisma.budget.deleteMany({ where: { categoryId: id, userId } });
    await prisma.recurringTransaction.deleteMany({ where: { categoryId: id, userId } });
  }

  await prisma.category.delete({ where: { id } });
  return { message: 'Category deleted successfully' };
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
