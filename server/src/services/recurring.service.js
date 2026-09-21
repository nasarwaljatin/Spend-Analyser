const prisma = require('../config/db');
const { ApiError } = require('../utils/helpers');

const getNextDueDate = (currentDate, frequency) => {
  const d = new Date(currentDate);
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
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

// Called by cron job to process due recurring transactions
const processDueTransactions = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueTransactions = await prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: today },
    },
  });

  let processedCount = 0;

  for (const recurring of dueTransactions) {
    // Check if past end date
    if (recurring.endDate && recurring.endDate < today) {
      await prisma.recurringTransaction.update({
        where: { id: recurring.id },
        data: { isActive: false },
      });
      continue;
    }

    // Create the transaction
    await prisma.transaction.create({
      data: {
        userId: recurring.userId,
        categoryId: recurring.categoryId,
        type: recurring.type,
        amount: recurring.amount,
        currency: recurring.currency,
        description: recurring.description,
        transactionDate: today,
        isRecurring: true,
      },
    });

    // Update next due date
    const nextDue = getNextDueDate(recurring.nextDueDate, recurring.frequency);
    await prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: { nextDueDate: nextDue },
    });

    processedCount++;
  }

  return processedCount;
};

module.exports = {
  getRecurringTransactions,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  togglePause,
  processDueTransactions,
  getNextDueDate,
};
