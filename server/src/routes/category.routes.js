const router = require('express').Router();
const controller = require('../controllers/category.controller');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCategorySchema, updateCategorySchema } = require('../schemas/category.schema');

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validate(createCategorySchema), controller.create);
router.put('/:id', validate(updateCategorySchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
