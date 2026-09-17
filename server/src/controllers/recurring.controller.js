const recurringService = require('../services/recurring.service');
const { asyncHandler } = require('../utils/helpers');

const getAll = asyncHandler(async (req, res) => {
  const items = await recurringService.getRecurringTransactions(req.user.id);
  res.json(items);
});

const create = asyncHandler(async (req, res) => {
  const item = await recurringService.createRecurring(req.user.id, req.body);
  res.status(201).json(item);
});

const update = asyncHandler(async (req, res) => {
  const item = await recurringService.updateRecurring(req.user.id, req.params.id, req.body);
  res.json(item);
});

const remove = asyncHandler(async (req, res) => {
  const result = await recurringService.deleteRecurring(req.user.id, req.params.id);
  res.json(result);
});

const pause = asyncHandler(async (req, res) => {
  const item = await recurringService.togglePause(req.user.id, req.params.id, false);
  res.json(item);
});

const resume = asyncHandler(async (req, res) => {
  const item = await recurringService.togglePause(req.user.id, req.params.id, true);
  res.json(item);
});

module.exports = { getAll, create, update, remove, pause, resume };
