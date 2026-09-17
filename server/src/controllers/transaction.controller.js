const transactionService = require('../services/transaction.service');
const { asyncHandler } = require('../utils/helpers');

const create = asyncHandler(async (req, res) => {
  const transaction = await transactionService.createTransaction(req.user.id, req.body);
  res.status(201).json(transaction);
});

const getAll = asyncHandler(async (req, res) => {
  const result = await transactionService.getTransactions(req.user.id, req.query);
  res.json(result);
});

const getById = asyncHandler(async (req, res) => {
  const transaction = await transactionService.getTransactionById(req.user.id, req.params.id);
  res.json(transaction);
});

const update = asyncHandler(async (req, res) => {
  const transaction = await transactionService.updateTransaction(
    req.user.id,
    req.params.id,
    req.body
  );
  res.json(transaction);
});

const remove = asyncHandler(async (req, res) => {
  const result = await transactionService.deleteTransaction(req.user.id, req.params.id);
  res.json(result);
});

module.exports = { create, getAll, getById, update, remove };
