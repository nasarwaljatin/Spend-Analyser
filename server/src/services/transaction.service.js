const prisma = require('../config/db');
const { ApiError, parsePagination, paginatedResponse } = require('../utils/helpers');

const createTransaction = async (userId, data) => {
  // Verify category belongs to user
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) throw new ApiError(404, 'Category not found');

  const desc = (data.description && data.description.trim()) || category.name || 'Transaction';

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      currency: data.currency || 'INR',
      description: desc,
      transactionDate: new Date(data.transactionDate),
      notes: data.notes || null,
    },
    include: { category: { select: { name: true, icon: true, color: true } } },
  });

  return transaction;
};

const getTransactions = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);

  const where = { userId };

  if (query.type) where.type = query.type;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.startDate || query.endDate) {
    where.transactionDate = {};
    if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
    if (query.endDate) where.transactionDate.lte = new Date(query.endDate);
  }
  if (query.search) {
    where.description = { contains: query.search, mode: 'insensitive' };
  }

  const orderBy = {};
  orderBy[query.sortBy || 'transactionDate'] = query.sortOrder || 'desc';

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { category: { select: { name: true, icon: true, color: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return paginatedResponse(transactions, total, page, limit);
};

const getTransactionById = async (userId, id) => {
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: { select: { name: true, icon: true, color: true } } },
  });
  if (!transaction) throw new ApiError(404, 'Transaction not found');
  return transaction;
};

const updateTransaction = async (userId, id, data) => {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, 'Transaction not found');

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, userId },
    });
    if (!category) throw new ApiError(404, 'Category not found');
  }

  const updateData = { ...data };
  if (data.description !== undefined) {
    updateData.description = (data.description && data.description.trim()) || existing.description || 'Transaction';
  }
  if (data.transactionDate) {
    updateData.transactionDate = new Date(data.transactionDate);
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: updateData,
    include: { category: { select: { name: true, icon: true, color: true } } },
  });

  return transaction;
};

const deleteTransaction = async (userId, id) => {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, 'Transaction not found');

  await prisma.transaction.delete({ where: { id } });
  return { message: 'Transaction deleted successfully' };
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
};
