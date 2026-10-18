const prisma = require('../config/db');
const { ApiError, parsePagination, paginatedResponse } = require('../utils/helpers');
const { getNextDueDate } = require('./recurring.service');

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
      transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
      notes: data.notes || null,
    },
    include: { category: { select: { name: true, icon: true, color: true } } },
  });

  // "Repeat" option: this transaction is the first occurrence, the schedule
  // picks up from the next one.
  if (data.recurrence?.frequency) {
    const firstDate = transaction.transactionDate;
    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        frequency: data.recurrence.frequency,
        startDate: firstDate,
        endDate: data.recurrence.endDate ? new Date(data.recurrence.endDate) : null,
        nextDueDate: getNextDueDate(firstDate, data.recurrence.frequency),
        isActive: true,
      },
    });
    await prisma.transaction.update({ where: { id: transaction.id }, data: { isRecurring: true } });
    return { ...transaction, isRecurring: true, recurringId: recurring.id };
  }

  return transaction;
};

const buildTransactionWhere = (userId, query) => {
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
  return where;
};

const getTransactions = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const where = buildTransactionWhere(userId, query);

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

const bulkDeleteTransactions = async (userId, ids) => {
  if (!ids || ids.length === 0) return { count: 0, message: 'No transactions selected' };

  const result = await prisma.transaction.deleteMany({
    where: {
      id: { in: ids },
      userId,
    },
  });

  return {
    count: result.count,
    message: `Successfully deleted ${result.count} transaction(s)`,
  };
};

const bulkUpdateCategory = async (userId, ids, categoryId) => {
  if (!ids || ids.length === 0) return { count: 0, message: 'No transactions selected' };

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) throw new ApiError(404, 'Category not found');

  const result = await prisma.transaction.updateMany({
    where: {
      id: { in: ids },
      userId,
    },
    data: {
      categoryId,
    },
  });

  return {
    count: result.count,
    message: `Successfully updated ${result.count} transaction(s)`,
  };
};

const FALLBACK_CATEGORY = {
  spend: { name: 'Other Expenses', icon: '📦', color: '#64748b' },
  earning: { name: 'Other Income', icon: '💵', color: '#10b981' },
};

/**
 * Bulk-imports rows (e.g. parsed from a bank statement CSV). Categories are
 * matched by name (case-insensitive) within the same type; unknown names are
 * created when allowed, otherwise the row falls back to an "Other" category.
 */
const importTransactions = async (userId, rows, { createMissingCategories = true } = {}) => {
  const categories = await prisma.category.findMany({ where: { userId } });
  const lookup = new Map(categories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c]));
  const createdCategories = [];

  const resolveCategory = async (type, rawName) => {
    const name = (rawName || '').trim();
    if (name) {
      const match = lookup.get(`${type}:${name.toLowerCase()}`);
      if (match) return match;
    }

    const wanted = name && createMissingCategories ? { name, icon: '🏷️', color: '#6366f1' } : FALLBACK_CATEGORY[type];
    const key = `${type}:${wanted.name.toLowerCase()}`;
    if (lookup.has(key)) return lookup.get(key);

    const created = await prisma.category.create({ data: { userId, type, ...wanted } });
    lookup.set(key, created);
    createdCategories.push(created.name);
    return created;
  };

  const data = [];
  for (const row of rows) {
    const category = await resolveCategory(row.type, row.category);
    data.push({
      userId,
      categoryId: category.id,
      type: row.type,
      amount: row.amount,
      currency: 'INR',
      description: (row.description && row.description.trim()) || category.name,
      transactionDate: new Date(row.transactionDate),
      notes: row.notes || null,
    });
  }

  const { count } = await prisma.transaction.createMany({ data });

  return {
    count,
    createdCategories,
    message: `Imported ${count} transaction(s)`,
  };
};

/** Combined totals for the same filters the list uses (period, type, category, search). */
const getTransactionSummary = async (userId, query) => {
  const where = buildTransactionWhere(userId, query);
  const groups = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _sum: { amount: true },
    _count: { _all: true },
  });

  const totals = { earning: 0, spend: 0, earningCount: 0, spendCount: 0 };
  groups.forEach((g) => {
    const key = g.type === 'earning' ? 'earning' : 'spend';
    totals[key] += Number(g._sum.amount || 0);
    totals[`${key}Count`] += g._count._all;
  });

  return {
    earning: Number(totals.earning.toFixed(2)),
    spend: Number(totals.spend.toFixed(2)),
    net: Number((totals.earning - totals.spend).toFixed(2)),
    earningCount: totals.earningCount,
    spendCount: totals.spendCount,
    count: totals.earningCount + totals.spendCount,
  };
};

/**
 * Earned / spent / net per day, month or year for the list filters.
 * `tzOffset` is the client's Date#getTimezoneOffset() so buckets follow the
 * user's local calendar rather than the server's.
 */
const getTransactionBreakdown = async (userId, query) => {
  const groupBy = ['day', 'month', 'year'].includes(query.groupBy) ? query.groupBy : 'day';
  const offsetMinutes = Number.isFinite(Number(query.tzOffset)) ? Number(query.tzOffset) : 0;
  const where = buildTransactionWhere(userId, query);

  const rows = await prisma.transaction.findMany({
    where,
    select: { type: true, amount: true, transactionDate: true },
  });

  const pad = (n) => String(n).padStart(2, '0');
  const buckets = {};
  rows.forEach((t) => {
    const local = new Date(t.transactionDate.getTime() - offsetMinutes * 60000);
    const y = local.getUTCFullYear();
    const m = pad(local.getUTCMonth() + 1);
    const key = groupBy === 'year' ? `${y}` : groupBy === 'month' ? `${y}-${m}` : `${y}-${m}-${pad(local.getUTCDate())}`;

    if (!buckets[key]) buckets[key] = { key, earning: 0, spend: 0, earningCount: 0, spendCount: 0 };
    const b = buckets[key];
    if (t.type === 'earning') {
      b.earning += Number(t.amount);
      b.earningCount += 1;
    } else {
      b.spend += Number(t.amount);
      b.spendCount += 1;
    }
  });

  return {
    groupBy,
    buckets: Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((b) => ({
        ...b,
        earning: Number(b.earning.toFixed(2)),
        spend: Number(b.spend.toFixed(2)),
        net: Number((b.earning - b.spend).toFixed(2)),
        count: b.earningCount + b.spendCount,
      })),
  };
};

module.exports = {
  getTransactionBreakdown,
  getTransactionSummary,
  importTransactions,
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  bulkUpdateCategory,
};
