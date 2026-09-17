const router = require('express').Router();
const controller = require('../controllers/recurring.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createRecurringSchema, updateRecurringSchema } = require('../schemas/recurring.schema');

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validate(createRecurringSchema), controller.create);
router.put('/:id', validate(updateRecurringSchema), controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/pause', controller.pause);
router.post('/:id/resume', controller.resume);

module.exports = router;
