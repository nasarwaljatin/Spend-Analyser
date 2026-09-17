const prisma = require('../config/db');
const { ApiError } = require('../utils/helpers');

const getCategories = async (userId, type) => {
  const where = { userId };
  if (type) where.type = type;

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { transactions: true } },
    },
  });

  return categories;
};

const createCategory = async (userId, data) => {
  const category = await prisma.category.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      icon: data.icon || '💰',
      color: data.color || '#6366f1',
      isDefault: false,
    },
  });
  return category;
};

const updateCategory = async (userId, id, data) => {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, 'Category not found');

  const category = await prisma.category.update({
    where: { id },
    data,
  });
  return category;
};

const deleteCategory = async (userId, id) => {
  const existing = await prisma.category.findFirst({
    where: { id, userId },
    include: { _count: { select: { transactions: true } } },
  });
  if (!existing) throw new ApiError(404, 'Category not found');

  if (existing._count.transactions > 0) {
    throw new ApiError(
      400,
      `Cannot delete category with ${existing._count.transactions} existing transaction(s). Please reassign them first.`
    );
  }

  await prisma.category.delete({ where: { id } });
  return { message: 'Category deleted successfully' };
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
