const router = require('express').Router();

const ADMIN_USER = 'joey';
const ADMIN_PASS = 'kenadams';

function adminAuth(req, res, next) {
  const auth = req.headers['x-admin-token'];
  if (auth !== `${ADMIN_USER}:${ADMIN_PASS}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ token: `${ADMIN_USER}:${ADMIN_PASS}` });
  }
  res.status(401).json({ message: 'Invalid admin credentials' });
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/groups', adminAuth, async (req, res) => {
  try {
    const Group = require('../models/Group');
    const GroupMember = require('../models/GroupMember');
    const groups = await Group.find().sort({ createdAt: -1 }).populate('createdBy', 'name email phone');
    const counts = await GroupMember.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });
    const result = groups.map(g => ({ ...g.toObject(), memberCount: countMap[g._id.toString()] || 0 }));
    res.json({ groups: result });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/groups/:groupId/expenses', adminAuth, async (req, res) => {
  try {
    const Expense = require('../models/Expense');
    const expenses = await Expense.find({ groupId: req.params.groupId })
      .sort({ createdAt: -1 })
      .populate('paidByUserId', 'name');
    res.json({ expenses });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/expenses', adminAuth, async (req, res) => {
  try {
    const Expense = require('../models/Expense');
    const expenses = await Expense.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('paidByUserId', 'name')
      .populate('groupId', 'name');
    res.json({ expenses });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', adminAuth, async (req, res) => {
  try {
    const User = require('../models/User');
    const Group = require('../models/Group');
    const Expense = require('../models/Expense');
    const ExpenseSplit = require('../models/ExpenseSplit');
    const [userCount, groupCount, expenseCount, splitAgg] = await Promise.all([
      User.countDocuments(),
      Group.countDocuments(),
      Expense.countDocuments(),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmountPaisa' } } }]),
    ]);
    res.json({
      userCount,
      groupCount,
      expenseCount,
      totalSpentRupees: splitAgg[0] ? (splitAgg[0].total / 100).toFixed(2) : '0.00',
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
