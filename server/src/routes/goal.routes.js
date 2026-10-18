const router = require('express').Router();
const controller = require('../controllers/goal.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createGoalSchema, updateGoalSchema, contributeGoalSchema } = require('../schemas/goal.schema');

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validate(createGoalSchema), controller.create);
router.put('/:id', validate(updateGoalSchema), controller.update);
router.post('/:id/contribute', validate(contributeGoalSchema), controller.contribute);
router.delete('/:id', controller.remove);

module.exports = router;
