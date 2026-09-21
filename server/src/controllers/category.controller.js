const categoryService = require('../services/category.service');
const { asyncHandler } = require('../utils/helpers');

const getAll = asyncHandler(async (req, res) => {
  const includeHidden = req.query.includeHidden === 'true' || req.query.includeHidden === true;
  const categories = await categoryService.getCategories(req.user.id, req.query.type, includeHidden);
  res.json(categories);
});

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.user.id, req.body);
  res.status(201).json(category);
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.user.id, req.params.id, req.body);
  res.json(category);
});

const remove = asyncHandler(async (req, res) => {
  const reassignCategoryId = req.body?.reassignCategoryId || req.query?.reassignCategoryId;
  const result = await categoryService.deleteCategory(req.user.id, req.params.id, reassignCategoryId);
  res.json(result);
});

module.exports = { getAll, create, update, remove };
