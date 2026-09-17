const prisma = require('../config/db');

const getMonthlyReport = async (userId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: startDate, lte: endDate },
    },
    include: { category: { select: { name: true, icon: true, color: true } } },
    orderBy: { transactionDate: 'asc' },
  });

  const totalEarnings = transactions
    .filter((t) => t.type === 'earning')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSpends = transactions
    .filter((t) => t.type === 'spend')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netSavings = totalEarnings - totalSpends;
  const savingsRate = totalEarnings > 0 ? (netSavings / totalEarnings) * 100 : 0;

  // Category breakdown
  const categoryMap = {};
  transactions.forEach((t) => {
    const key = t.categoryId;
    if (!categoryMap[key]) {
      categoryMap[key] = {
        categoryId: t.categoryId,
        name: t.category.name,
        icon: t.category.icon,
        color: t.category.color,
        type: t.type,
        total: 0,
        transactionCount: 0,
      };
    }
    categoryMap[key].total += Number(t.amount);
    categoryMap[key].transactionCount += 1;
  });

  const categoryBreakdown = Object.values(categoryMap)
    .map((c) => ({
      ...c,
      percentage:
        c.type === 'spend' && totalSpends > 0
          ? Number(((c.total / totalSpends) * 100).toFixed(1))
          : c.type === 'earning' && totalEarnings > 0
          ? Number(((c.total / totalEarnings) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Daily breakdown
  const dailyMap = {};
  transactions.forEach((t) => {
    const day = t.transactionDate.toISOString().split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = { date: day, earnings: 0, spends: 0 };
    if (t.type === 'earning') dailyMap[day].earnings += Number(t.amount);
    else dailyMap[day].spends += Number(t.amount);
  });
  const dailyBreakdown = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Top spends
  const topSpends = transactions
    .filter((t) => t.type === 'spend')
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      category: t.category.name,
      date: t.transactionDate,
    }));

  // Previous month comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd = new Date(prevYear, prevMonth, 0);

  const prevTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: prevStart, lte: prevEnd },
    },
  });

  const prevEarnings = prevTransactions
    .filter((t) => t.type === 'earning')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const prevSpends = prevTransactions
    .filter((t) => t.type === 'spend')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    period: { year, month },
    totalEarnings: Number(totalEarnings.toFixed(2)),
    totalSpends: Number(totalSpends.toFixed(2)),
    netSavings: Number(netSavings.toFixed(2)),
    savingsRate: Number(savingsRate.toFixed(1)),
    categoryBreakdown,
    dailyBreakdown,
    topSpends,
    transactionCount: transactions.length,
    comparison: {
      prevMonth: {
        earnings: Number(prevEarnings.toFixed(2)),
        spends: Number(prevSpends.toFixed(2)),
      },
      changePercent: {
        earnings:
          prevEarnings > 0
            ? Number((((totalEarnings - prevEarnings) / prevEarnings) * 100).toFixed(1))
            : 0,
        spends:
          prevSpends > 0
            ? Number((((totalSpends - prevSpends) / prevSpends) * 100).toFixed(1))
            : 0,
      },
    },
  };
};

const getYearlyReport = async (userId, year) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: startDate, lte: endDate },
    },
    include: { category: { select: { name: true, icon: true, color: true } } },
    orderBy: { transactionDate: 'asc' },
  });

  const totalEarnings = transactions
    .filter((t) => t.type === 'earning')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSpends = transactions
    .filter((t) => t.type === 'spend')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netSavings = totalEarnings - totalSpends;
  const savingsRate = totalEarnings > 0 ? (netSavings / totalEarnings) * 100 : 0;

  // Monthly breakdown
  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const monthTransactions = transactions.filter(
      (t) => t.transactionDate.getMonth() === i
    );
    const earnings = monthTransactions
      .filter((t) => t.type === 'earning')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const spends = monthTransactions
      .filter((t) => t.type === 'spend')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return {
      month: i + 1,
      monthName: new Date(year, i, 1).toLocaleString('default', { month: 'short' }),
      earnings: Number(earnings.toFixed(2)),
      spends: Number(spends.toFixed(2)),
      net: Number((earnings - spends).toFixed(2)),
      transactionCount: monthTransactions.length,
    };
  });

  // Category breakdown for the year
  const categoryMap = {};
  transactions.forEach((t) => {
    const key = t.categoryId;
    if (!categoryMap[key]) {
      categoryMap[key] = {
        categoryId: t.categoryId,
        name: t.category.name,
        icon: t.category.icon,
        color: t.category.color,
        type: t.type,
        total: 0,
        transactionCount: 0,
      };
    }
    categoryMap[key].total += Number(t.amount);
    categoryMap[key].transactionCount += 1;
  });

  const categoryBreakdown = Object.values(categoryMap)
    .map((c) => ({
      ...c,
      total: Number(c.total.toFixed(2)),
      percentage:
        c.type === 'spend' && totalSpends > 0
          ? Number(((c.total / totalSpends) * 100).toFixed(1))
          : c.type === 'earning' && totalEarnings > 0
          ? Number(((c.total / totalEarnings) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    period: { year },
    totalEarnings: Number(totalEarnings.toFixed(2)),
    totalSpends: Number(totalSpends.toFixed(2)),
    netSavings: Number(netSavings.toFixed(2)),
    savingsRate: Number(savingsRate.toFixed(1)),
    monthlyBreakdown,
    categoryBreakdown,
    transactionCount: transactions.length,
    averageMonthlySpend: Number((totalSpends / 12).toFixed(2)),
    averageMonthlyEarning: Number((totalEarnings / 12).toFixed(2)),
  };
};

const getTrends = async (userId, months = 12) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: startDate, lte: endDate },
    },
    orderBy: { transactionDate: 'asc' },
  });

  const monthlyMap = {};
  transactions.forEach((t) => {
    const key = `${t.transactionDate.getFullYear()}-${String(
      t.transactionDate.getMonth() + 1
    ).padStart(2, '0')}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = { month: key, earnings: 0, spends: 0 };
    }
    if (t.type === 'earning') monthlyMap[key].earnings += Number(t.amount);
    else monthlyMap[key].spends += Number(t.amount);
  });

  const trends = Object.values(monthlyMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      earnings: Number(m.earnings.toFixed(2)),
      spends: Number(m.spends.toFixed(2)),
      net: Number((m.earnings - m.spends).toFixed(2)),
    }));

  return trends;
};

const getNetSummary = async (userId, year) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: startDate, lte: endDate },
    },
  });

  const totalEarnings = transactions
    .filter((t) => t.type === 'earning')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSpends = transactions
    .filter((t) => t.type === 'spend')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netSavings = totalEarnings - totalSpends;

  return {
    year,
    totalEarnings: Number(totalEarnings.toFixed(2)),
    totalSpends: Number(totalSpends.toFixed(2)),
    netSavings: Number(netSavings.toFixed(2)),
    savingsRate: totalEarnings > 0 ? Number(((netSavings / totalEarnings) * 100).toFixed(1)) : 0,
    status: netSavings >= 0 ? 'profit' : 'loss',
    transactionCount: transactions.length,
  };
};

module.exports = { getMonthlyReport, getYearlyReport, getTrends, getNetSummary };
