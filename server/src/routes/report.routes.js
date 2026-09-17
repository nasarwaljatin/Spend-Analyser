const router = require('express').Router();
const controller = require('../controllers/report.controller');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/monthly', controller.monthly);
router.get('/yearly', controller.yearly);
router.get('/trends', controller.trends);
router.get('/net-summary', controller.netSummary);

module.exports = router;
