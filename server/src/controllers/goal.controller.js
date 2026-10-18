const goalService = require('../services/goal.service');
const { asyncHandler } = require('../utils/helpers');

const getAll = asyncHandler(async (req, res) => {
  const goals = await goalService.getGoals(req.user.id);
  res.json(goals);
});

const create = asyncHandler(async (req, res) => {
  const goal = await goalService.createGoal(req.user.id, req.body);
  res.status(201).json(goal);
});

const update = asyncHandler(async (req, res) => {
  const goal = await goalService.updateGoal(req.user.id, req.params.id, req.body);
  res.json(goal);
});

const contribute = asyncHandler(async (req, res) => {
  const goal = await goalService.contributeToGoal(req.user.id, req.params.id, req.body.amount);
  res.json(goal);
});

const remove = asyncHandler(async (req, res) => {
  const result = await goalService.deleteGoal(req.user.id, req.params.id);
  res.json(result);
});

module.exports = { getAll, create, update, contribute, remove };
