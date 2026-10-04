const reportService = require('../services/report.service');
const { asyncHandler, ApiError } = require('../utils/helpers');

const monthly = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  if (!year || !month || month < 1 || month > 12) {
    throw new ApiError(400, 'Valid year and month (1-12) are required');
  }
  const report = await reportService.getMonthlyReport(req.user.id, year, month);
  res.json(report);
});

const yearly = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year);
  if (!year) throw new ApiError(400, 'Year is required');
  const report = await reportService.getYearlyReport(req.user.id, year);
  res.json(report);
});

const trends = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const data = await reportService.getTrends(req.user.id, months);
  res.json(data);
});

const netSummary = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const summary = await reportService.getNetSummary(req.user.id, year);
  res.json(summary);
});

const weeklyHeatmap = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  if (month < 1 || month > 12) throw new ApiError(400, 'Valid month (1-12) is required');
  const data = await reportService.getWeeklyHeatmap(req.user.id, year, month);
  res.json(data);
});

const categoryTrend = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 6;
  const data = await reportService.getCategoryTrend(req.user.id, months);
  res.json(data);
});

module.exports = { monthly, yearly, trends, netSummary, weeklyHeatmap, categoryTrend };
