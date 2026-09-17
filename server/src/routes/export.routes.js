const router = require('express').Router();
const controller = require('../controllers/export.controller');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/csv', controller.exportCSV);
router.get('/excel', controller.exportExcel);

module.exports = router;
