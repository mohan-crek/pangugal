const router = require('express').Router();
const { groupDashboard, overallSummary, settleUp } = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/summary', overallSummary);
router.get('/groups/:groupId', groupDashboard);
router.post('/groups/:groupId/settle', settleUp);

module.exports = router;
