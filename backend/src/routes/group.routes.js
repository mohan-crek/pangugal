const router = require('express').Router();
const { createGroup, listGroups, getGroup, inviteMember, removeMember } = require('../controllers/group.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/', createGroup);
router.get('/', listGroups);
router.get('/:groupId', getGroup);
router.post('/:groupId/invite', inviteMember);
router.delete('/:groupId/members/:userId', removeMember);

module.exports = router;
