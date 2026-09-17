const prisma = require('../config/db');
const { asyncHandler } = require('../utils/helpers');

const exportCSV = asyncHandler(async (req, res) => {
  const where = { userId: req.user.id };
  if (req.query.startDate || req.query.endDate) {
    where.transactionDate = {};
    if (req.query.startDate) where.transactionDate.gte = new Date(req.query.startDate);
    if (req.query.endDate) where.transactionDate.lte = new Date(req.query.endDate);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: { select: { name: true } } },
    orderBy: { transactionDate: 'desc' },
  });

  // Build CSV
  const header = 'Date,Type,Category,Description,Amount,Currency,Notes\n';
  const rows = transactions
    .map((t) => {
      const date = t.transactionDate.toISOString().split('T')[0];
      const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
      const notes = `"${(t.notes || '').replace(/"/g, '""')}"`;
      return `${date},${t.type},${t.category.name},${desc},${t.amount},${t.currency},${notes}`;
    })
    .join('\n');

  const csv = header + rows;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
  res.send(csv);
});

const exportExcel = asyncHandler(async (req, res) => {
  // We'll use a simple JSON approach — frontend handles actual Excel with SheetJS
  const where = { userId: req.user.id };
  if (req.query.startDate || req.query.endDate) {
    where.transactionDate = {};
    if (req.query.startDate) where.transactionDate.gte = new Date(req.query.startDate);
    if (req.query.endDate) where.transactionDate.lte = new Date(req.query.endDate);
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: { select: { name: true } } },
    orderBy: { transactionDate: 'desc' },
  });

  const data = transactions.map((t) => ({
    Date: t.transactionDate.toISOString().split('T')[0],
    Type: t.type,
    Category: t.category.name,
    Description: t.description,
    Amount: Number(t.amount),
    Currency: t.currency,
    Notes: t.notes || '',
  }));

  res.json(data);
});

module.exports = { exportCSV, exportExcel };
