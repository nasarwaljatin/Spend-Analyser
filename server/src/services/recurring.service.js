const prisma = require('../config/db');
const { ApiError } = require('../utils/helpers');

/**
 * Advance a due date by one period. `anchorDay` keeps monthly/yearly rules on
 * their original day (e.g. the 31st) while clamping to shorter months, so
 * Jan 31 -> Feb 28 -> Mar 31 instead of drifting to Mar 3.
 */
const getNextDueDate = (currentDate, frequency, anchorDay) => {
  const d = new Date(currentDate);
  const day = anchorDay || d.getDate();
  const clampTo = (year, month) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    d.setFullYear(year, month, Math.min(day, lastDay));
  };
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setDate(1);
      clampTo(d.getFullYear(), d.getMonth() + 1);
      break;
    case 'yearly':
      d.setDate(1);
      clampTo(d.getFullYear() + 1, d.getMonth());
      break;
  }
  return d;
};

/**
 * Day-of-month a rule should land on: normally the current due date's day,
 * but if that was clamped to a month end (e.g. Feb 28 for a rule started on
 * the 31st), restore the original start day.
 */
const getAnchorDay = (startDate, dueDate) => {
  const start = new Date(startDate).getDate();
  const due = new Date(dueDate);
  const lastDay = new Date(due.getFullYear(), due.getMonth() + 1, 0).getDate();
  return due.getDate() === lastDay && start > due.getDate() ? start : due.getDate();
};

const getRecurringTransactions = async (userId) => {
  return prisma.recurringTransaction.findMany({
    where: { userId },
    include: { category: { select: { name: true, icon: true, color: true } } },
    orderBy: { nextDueDate: 'asc' },
  });
};

const createRecurring = async (userId, data) => {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) throw new ApiError(404, 'Category not found');

  const startDate = new Date(data.startDate);
  const nextDueDate = startDate;
  const desc = (data.description && data.description.trim()) || category.name || 'Recurring Schedule';

  const recurring = await prisma.recurringTransaction.create({
    data: {
      userId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      currency: data.currency || 'INR',
      description: desc,
      frequency: data.frequency,
      startDate,
      endDate: data.endDate ? new Date(data.endDate) : null,
      nextDueDate,
      isActive: true,
    },
    include: { category: { select: { name: true, icon: true, color: true } } },
  });

  return recurring;
};

const updateRecurring = async (userId, id, data) => {
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, 'Recurring transaction not found');

  const updateData = { ...data };
  if (data.description !== undefined) {
    updateData.description = (data.description && data.description.trim()) || existing.description || 'Recurring Schedule';
  }
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  const recurring = await prisma.recurringTransaction.update({
    where: { id },
    data: updateData,
    include: { category: { select: { name: true, icon: true, color: true } } },
  });

  return recurring;
};

const deleteRecurring = async (userId, id) => {
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, 'Recurring transaction not found');

  await prisma.recurringTransaction.delete({ where: { id } });
  return { message: 'Recurring transaction deleted successfully' };
};

const togglePause = async (userId, id, isActive) => {
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw new ApiError(404, 'Recurring transaction not found');

  const recurring = await prisma.recurringTransaction.update({
    where: { id },
    data: { isActive },
    include: { category: { select: { name: true, icon: true, color: true } } },
  });

  return recurring;
};

const MAX_CATCH_UP = 400; // safety cap on occurrences generated per rule per run

/**
 * Materialise every occurrence that has come due (catching up on any missed
 * while the server was asleep). Each transaction is dated on its due date.
 * Pass a userId to process just that user's rules.
 */
const processDueTransactions = async (userId) => {
  const now = new Date();

  const dueRules = await prisma.recurringTransaction.findMany({
    where: {
      ...(userId ? { userId } : {}),
      isActive: true,
      nextDueDate: { lte: now },
    },
  });

  let processedCount = 0;

  for (const rule of dueRules) {
    const anchorDay = getAnchorDay(rule.startDate, rule.nextDueDate);
    let due = new Date(rule.nextDueDate);
    const occurrences = [];

    while (due <= now && occurrences.length < MAX_CATCH_UP) {
      if (rule.endDate && due > rule.endDate) break;
      occurrences.push(new Date(due));
      due = getNextDueDate(due, rule.frequency, anchorDay);
    }

    if (occurrences.length > 0) {
      await prisma.transaction.createMany({
        data: occurrences.map((date) => ({
          userId: rule.userId,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          description: rule.description,
          transactionDate: date,
          isRecurring: true,
        })),
      });
      processedCount += occurrences.length;
    }

    const finished = rule.endDate && due > rule.endDate;
    await prisma.recurringTransaction.update({
      where: { id: rule.id },
      data: { nextDueDate: due, ...(finished ? { isActive: false } : {}) },
    });
  }

  return processedCount;
};

// Per-user lazy catch-up, throttled so busy pages don't hammer the DB
const lastUserRun = new Map();
const USER_THROTTLE_MS = 5 * 60 * 1000;

const processDueForUser = async (userId) => {
  const last = lastUserRun.get(userId) || 0;
  if (Date.now() - last < USER_THROTTLE_MS) return 0;
  lastUserRun.set(userId, Date.now());
  try {
    return await processDueTransactions(userId);
  } catch (err) {
    console.error('[RECURRING] Catch-up failed:', err.message);
    return 0;
  }
};

module.exports = {
  getRecurringTransactions,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  togglePause,
  processDueTransactions,
  processDueForUser,
  getNextDueDate,
};
