const router = require('express').Router();
const controller = require('../controllers/transaction.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  bulkDeleteTransactionsSchema,
  bulkUpdateCategorySchema,
} = require('../schemas/transaction.schema');

router.use(authenticate);

router.get('/', validate(transactionQuerySchema, 'query'), controller.getAll);
router.post('/bulk-delete', validate(bulkDeleteTransactionsSchema), controller.bulkRemove);
router.delete('/bulk', validate(bulkDeleteTransactionsSchema), controller.bulkRemove);
router.patch('/bulk-category', validate(bulkUpdateCategorySchema), controller.bulkUpdateCategory);

router.get('/:id', controller.getById);
router.post('/', validate(createTransactionSchema), controller.create);
router.put('/:id', validate(updateTransactionSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
