const ExpenseSplit = require('../models/ExpenseSplit');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');
const { computeBalances, simplifyDebts } = require('../services/debt.service');

function paisaToRupees(p) {
  return parseFloat((p / 100).toFixed(2));
}

async function groupDashboard(req, res) {
  try {
    const { groupId } = req.params;
    const membership = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
    if (!membership) return res.status(403).json({ message: 'Not a member' });

    const splits = await ExpenseSplit.find({ groupId, isSettled: false });
    const balanceMap = computeBalances(splits);
    const simplified = simplifyDebts(balanceMap);

    // Fetch user names for all referenced IDs
    const allIds = [...new Set([
      ...Object.keys(balanceMap),
      ...simplified.flatMap(t => [t.from, t.to]),
    ])];
    const users = await User.find({ _id: { $in: allIds } }).select('name email phone');
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const balances = Object.entries(balanceMap).map(([uid, paisa]) => ({
      user: userMap[uid],
      netAmount: paisaToRupees(paisa),
      netPaisa: paisa,
    }));

    const transactions = simplified.map(t => ({
      from: userMap[t.from],
      to: userMap[t.to],
      amount: paisaToRupees(t.amountPaisa),
      amountPaisa: t.amountPaisa,
    }));

    // Per-person total spending
    const allSplits = await ExpenseSplit.find({ groupId });
    const spendMap = {};
    allSplits.forEach(s => {
      const uid = s.owedByUserId.toString();
      spendMap[uid] = (spendMap[uid] || 0) + s.amountPaisa;
    });

    res.json({ balances, simplifiedTransactions: transactions, spendMap });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function overallSummary(req, res) {
  try {
    const memberships = await GroupMember.find({ userId: req.user._id, isActive: true });
    const groupIds = memberships.map(m => m.groupId);

    const splits = await ExpenseSplit.find({ groupId: { $in: groupIds }, isSettled: false });
    const myId = req.user._id.toString();

    let totalOwed = 0;   // others owe me
    let totalOwing = 0;  // I owe others

    splits.forEach(s => {
      if (s.owedByUserId.toString() === myId && s.owedToUserId.toString() !== myId) {
        totalOwing += s.amountPaisa;
      }
      if (s.owedToUserId.toString() === myId && s.owedByUserId.toString() !== myId) {
        totalOwed += s.amountPaisa;
      }
    });

    res.json({
      totalOwed: paisaToRupees(totalOwed),
      totalOwing: paisaToRupees(totalOwing),
      netBalance: paisaToRupees(totalOwed - totalOwing),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function settleUp(req, res) {
  try {
    const { groupId } = req.params;
    const { owedByUserId } = req.body;

    await ExpenseSplit.updateMany(
      { groupId, owedByUserId, owedToUserId: req.user._id, isSettled: false },
      { isSettled: true, settledAt: new Date() }
    );
    res.json({ message: 'Settled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { groupDashboard, overallSummary, settleUp };
