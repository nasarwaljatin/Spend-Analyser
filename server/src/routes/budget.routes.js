const router = require('express').Router();
const controller = require('../controllers/budget.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createBudgetSchema, updateBudgetSchema } = require('../schemas/budget.schema');

router.use(authenticate);

router.get('/', controller.getAll);
router.get('/alerts', controller.alerts);
router.post('/', validate(createBudgetSchema), controller.create);
router.put('/:id', validate(updateBudgetSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
