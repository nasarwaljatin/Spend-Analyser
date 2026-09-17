const budgetService = require('../services/budget.service');
const { asyncHandler } = require('../utils/helpers');

const getAll = asyncHandler(async (req, res) => {
  const budgets = await budgetService.getBudgets(req.user.id);
  res.json(budgets);
});

const create = asyncHandler(async (req, res) => {
  const budget = await budgetService.createBudget(req.user.id, req.body);
  res.status(201).json(budget);
});

const update = asyncHandler(async (req, res) => {
  const budget = await budgetService.updateBudget(req.user.id, req.params.id, req.body);
  res.json(budget);
});

const remove = asyncHandler(async (req, res) => {
  const result = await budgetService.deleteBudget(req.user.id, req.params.id);
  res.json(result);
});

const alerts = asyncHandler(async (req, res) => {
  const alertList = await budgetService.getAlerts(req.user.id);
  res.json(alertList);
});

module.exports = { getAll, create, update, remove, alerts };
