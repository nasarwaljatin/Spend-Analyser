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

const getWeeklyHeatmap = async (userId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'spend',
      transactionDate: { gte: startDate, lte: endDate },
    },
  });

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Build a map: dayOfWeek -> { count, total }
  const heatmap = DAY_NAMES.map((day, i) => ({
    day,
    dayIndex: i,
    total: 0,
    count: 0,
  }));

  transactions.forEach((t) => {
    const dow = t.transactionDate.getDay(); // 0=Sun
    heatmap[dow].total += Number(t.amount);
    heatmap[dow].count += 1;
  });

  return heatmap.map((d) => ({
    ...d,
    total: Number(d.total.toFixed(2)),
    avgPerTx: d.count > 0 ? Number((d.total / d.count).toFixed(2)) : 0,
  }));
};

const getCategoryTrend = async (userId, months = 6) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'spend',
      transactionDate: { gte: startDate, lte: endDate },
    },
    include: { category: { select: { name: true, color: true } } },
    orderBy: { transactionDate: 'asc' },
  });

  // Collect unique categories
  const categorySet = {};
  transactions.forEach((t) => {
    if (!categorySet[t.categoryId]) {
      categorySet[t.categoryId] = {
        id: t.categoryId,
        name: t.category.name,
        color: t.category.color,
      };
    }
  });

  // Build month keys
  const monthKeys = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    monthKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Group transactions by month and category
  const grid = {}; // grid[monthKey][categoryId] = total
  transactions.forEach((t) => {
    const key = `${t.transactionDate.getFullYear()}-${String(t.transactionDate.getMonth() + 1).padStart(2, '0')}`;
    if (!grid[key]) grid[key] = {};
    if (!grid[key][t.categoryId]) grid[key][t.categoryId] = 0;
    grid[key][t.categoryId] += Number(t.amount);
  });

  const result = monthKeys.map((mk) => {
    const row = { month: mk };
    Object.values(categorySet).forEach((cat) => {
      row[cat.name] = Number(((grid[mk] || {})[cat.id] || 0).toFixed(2));
    });
    return row;
  });

  return {
    months: monthKeys,
    categories: Object.values(categorySet),
    data: result,
  };
};

const round2 = (n) => Number(n.toFixed(2));
const pctChange = (current, previous) =>
  previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(1)) : null;

/**
 * Actionable spending insights for the current month: pace vs last month,
 * month-end projection, frequent merchants, category movers and upcoming bills.
 */
const getInsights = async (userId) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStart = new Date(year, month, dayOfMonth);

  const monthStart = new Date(year, month, 1);
  const prevMonthStart = new Date(year, month - 1, 1);
  const prevMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  // Same point in the previous month (clamped for shorter months)
  const prevSamePoint = new Date(
    year,
    month - 1,
    Math.min(dayOfMonth, prevMonthEnd.getDate()),
    23, 59, 59, 999
  );
  const lookbackStart = new Date(year, month, dayOfMonth - 90);
  const queryStart = lookbackStart < prevMonthStart ? lookbackStart : prevMonthStart;

  const [transactions, upcomingRecurring] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: queryStart, lte: now } },
      include: { category: { select: { name: true, icon: true, color: true } } },
    }),
    prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
        nextDueDate: { lte: new Date(year, month, dayOfMonth + 14, 23, 59, 59) },
      },
      include: { category: { select: { name: true, icon: true, color: true } } },
      orderBy: { nextDueDate: 'asc' },
    }),
  ]);

  const spends = transactions.filter((t) => t.type === 'spend');
  const inRange = (t, from, to) => t.transactionDate >= from && t.transactionDate <= to;
  const sum = (list) => list.reduce((acc, t) => acc + Number(t.amount), 0);

  const thisMonthSpends = spends.filter((t) => inRange(t, monthStart, now));
  const prevToDateSpends = spends.filter((t) => inRange(t, prevMonthStart, prevSamePoint));
  const prevMonthSpends = spends.filter((t) => inRange(t, prevMonthStart, prevMonthEnd));
  const thisMonthEarnings = sum(
    transactions.filter((t) => t.type === 'earning' && inRange(t, monthStart, now))
  );

  const monthToDateSpend = sum(thisMonthSpends);
  const prevMonthToDateSpend = sum(prevToDateSpends);
  const avgDailySpend = monthToDateSpend / dayOfMonth;
  const projectedMonthSpend = avgDailySpend * daysInMonth;

  // Days this month (so far) with no spending at all
  const spendDays = new Set(thisMonthSpends.map((t) => t.transactionDate.getDate()));
  const noSpendDays = dayOfMonth - spendDays.size;

  const biggest = thisMonthSpends.reduce(
    (max, t) => (!max || Number(t.amount) > Number(max.amount) ? t : max),
    null
  );

  // Frequent merchants / payees over the last 90 days (grouped by description)
  const merchantMap = {};
  spends
    .filter((t) => t.transactionDate >= lookbackStart)
    .forEach((t) => {
      const key = (t.description || '').trim().toLowerCase();
      if (!key) return;
      if (!merchantMap[key]) {
        merchantMap[key] = { name: t.description.trim(), total: 0, count: 0, icon: t.category.icon };
      }
      merchantMap[key].total += Number(t.amount);
      merchantMap[key].count += 1;
    });
  const topMerchants = Object.values(merchantMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
    .map((m) => ({ ...m, total: round2(m.total), avg: round2(m.total / m.count) }));

  // Category pace: this month-to-date vs same period last month
  const categoryMap = {};
  const addToCategory = (t, field) => {
    if (!categoryMap[t.categoryId]) {
      categoryMap[t.categoryId] = {
        categoryId: t.categoryId,
        name: t.category.name,
        icon: t.category.icon,
        color: t.category.color,
        current: 0,
        previous: 0,
      };
    }
    categoryMap[t.categoryId][field] += Number(t.amount);
  };
  thisMonthSpends.forEach((t) => addToCategory(t, 'current'));
  prevToDateSpends.forEach((t) => addToCategory(t, 'previous'));
  const categoryMovers = Object.values(categoryMap)
    .map((c) => ({
      ...c,
      current: round2(c.current),
      previous: round2(c.previous),
      change: round2(c.current - c.previous),
      changePercent: pctChange(c.current, c.previous),
    }))
    .filter((c) => c.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 5);

  const upcomingBills = upcomingRecurring.map((r) => ({
    id: r.id,
    description: r.description,
    type: r.type,
    amount: Number(r.amount),
    nextDueDate: r.nextDueDate,
    frequency: r.frequency,
    category: r.category,
    isOverdue: r.nextDueDate < todayStart,
  }));
  const upcomingBillsTotal = upcomingBills
    .filter((b) => b.type === 'spend')
    .reduce((acc, b) => acc + b.amount, 0);

  // Plain-language tips derived from the numbers above
  const tips = [];
  const paceChange = pctChange(monthToDateSpend, prevMonthToDateSpend);
  if (monthToDateSpend === 0) {
    tips.push({ level: 'warning', text: 'No spends logged this month yet. Add transactions or import a bank statement CSV.' });
  } else if (paceChange !== null && paceChange >= 15) {
    tips.push({ level: 'warning', text: `You're spending ${paceChange}% faster than at this point last month.` });
  } else if (paceChange !== null && paceChange <= -10) {
    tips.push({ level: 'success', text: `Nice! You're spending ${Math.abs(paceChange)}% less than at this point last month.` });
  }
  if (thisMonthEarnings > 0 && projectedMonthSpend > thisMonthEarnings) {
    tips.push({ level: 'danger', text: "At this pace, your spending will exceed this month's income." });
  }
  const topMover = categoryMovers.find((c) => c.change > 0 && c.previous > 0 && c.changePercent >= 30);
  if (topMover) {
    tips.push({ level: 'warning', text: `${topMover.icon} ${topMover.name} is up ${topMover.changePercent}% vs last month.` });
  }
  if (monthToDateSpend > 0 && noSpendDays >= 3) {
    tips.push({ level: 'success', text: `You've had ${noSpendDays} no-spend day(s) this month. Keep it up!` });
  }
  const overdueBills = upcomingBills.filter((b) => b.isOverdue).length;
  if (overdueBills > 0) {
    tips.push({ level: 'danger', text: `${overdueBills} recurring bill(s) are past their due date.` });
  }

  return {
    period: { year, month: month + 1, dayOfMonth, daysInMonth },
    monthToDateSpend: round2(monthToDateSpend),
    prevMonthToDateSpend: round2(prevMonthToDateSpend),
    paceChangePercent: paceChange,
    prevMonthTotalSpend: round2(sum(prevMonthSpends)),
    monthToDateEarnings: round2(thisMonthEarnings),
    avgDailySpend: round2(avgDailySpend),
    projectedMonthSpend: round2(projectedMonthSpend),
    noSpendDays,
    biggestSpend: biggest
      ? {
          id: biggest.id,
          description: biggest.description,
          amount: Number(biggest.amount),
          date: biggest.transactionDate,
          category: biggest.category,
        }
      : null,
    topMerchants,
    categoryMovers,
    upcomingBills,
    upcomingBillsTotal: round2(upcomingBillsTotal),
    tips,
  };
};

const getDailyTransactions = async (userId, start, end) => {
  const [transactions, recurring] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: start, lte: end } },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        transactionDate: true,
        isRecurring: true,
        category: { select: { name: true, icon: true, color: true } },
      },
      orderBy: { transactionDate: 'asc' },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId, isActive: true, nextDueDate: { lte: end } },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        frequency: true,
        startDate: true,
        endDate: true,
        nextDueDate: true,
        category: { select: { name: true, icon: true, color: true } },
      },
    }),
  ]);

  return {
    transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
    recurring: recurring.map((r) => ({ ...r, amount: Number(r.amount) })),
  };
};

module.exports = { getMonthlyReport, getYearlyReport, getTrends, getNetSummary, getWeeklyHeatmap, getCategoryTrend, getInsights, getDailyTransactions };
