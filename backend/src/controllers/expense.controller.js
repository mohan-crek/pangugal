const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const ExpenseSplit = require('../models/ExpenseSplit');
const GroupMember = require('../models/GroupMember');
const { splitEqually } = require('../services/debt.service');

async function addExpense(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { groupId } = req.params;
    const { description, category, totalAmount, splitAmong } = req.body;

    if (!description || !totalAmount || !splitAmong || !Array.isArray(splitAmong) || splitAmong.length === 0) {
      return res.status(400).json({ message: 'description, totalAmount, and splitAmong are required' });
    }

    const membership = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
    if (!membership) return res.status(403).json({ message: 'Not a member of this group' });

    // Convert rupees to paisa as integer
    const totalAmountPaisa = Math.round(parseFloat(totalAmount) * 100);
    if (totalAmountPaisa <= 0) return res.status(400).json({ message: 'Amount must be positive' });

    const expense = await Expense.create([{
      groupId,
      description,
      category: category || 'other',
      totalAmountPaisa,
      paidByUserId: req.user._id,
      createdBy: req.user._id,
    }], { session });

    const shares = splitEqually(totalAmountPaisa, splitAmong);
    const splitDocs = shares.map(({ userId, amountPaisa }) => ({
      expenseId: expense[0]._id,
      groupId,
      owedByUserId: userId,
      owedToUserId: req.user._id,
      amountPaisa,
      isSettled: userId.toString() === req.user._id.toString(),
    }));

    await ExpenseSplit.insertMany(splitDocs, { session });
    await session.commitTransaction();

    res.status(201).json({ expense: expense[0] });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
}

async function listExpenses(req, res) {
  try {
    const { groupId } = req.params;
    const { before } = req.query;

    const membership = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
    if (!membership) return res.status(403).json({ message: 'Not a member' });

    const query = { groupId };
    if (before) query._id = { $lt: new mongoose.Types.ObjectId(before) };

    // No limit — load all expenses for the group (groups rarely exceed a few hundred)
    const expenses = await Expense.find(query)
      .sort({ date: -1, _id: -1 })
      .populate('paidByUserId', 'name');

    // attach split members to each expense
    const expenseIds = expenses.map(e => e._id);
    const splits = await ExpenseSplit.find({ expenseId: { $in: expenseIds } })
      .populate('owedByUserId', 'name');

    const splitMap = {};
    splits.forEach(s => {
      const eid = s.expenseId.toString();
      if (!splitMap[eid]) splitMap[eid] = [];
      splitMap[eid].push({ _id: s.owedByUserId._id, name: s.owedByUserId.name });
    });

    const result = expenses.map(e => ({
      ...e.toObject(),
      sharedWith: splitMap[e._id.toString()] || [],
    }));

    res.json({ expenses: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getExpense(req, res) {
  try {
    const { groupId, expenseId } = req.params;
    const membership = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
    if (!membership) return res.status(403).json({ message: 'Not a member' });

    const expense = await Expense.findOne({ _id: expenseId, groupId }).populate('paidByUserId', 'name');
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const splits = await ExpenseSplit.find({ expenseId }).populate('owedByUserId', 'name');
    res.json({ expense, splits });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function editExpense(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { groupId, expenseId } = req.params;
    const { description, category, totalAmount, splitAmong } = req.body;

    const expense = await Expense.findOne({ _id: expenseId, groupId });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can edit this expense' });
    }

    if (!splitAmong || !Array.isArray(splitAmong) || splitAmong.length === 0) {
      return res.status(400).json({ message: 'splitAmong is required' });
    }

    const totalAmountPaisa = Math.round(parseFloat(totalAmount) * 100);
    if (totalAmountPaisa <= 0) return res.status(400).json({ message: 'Amount must be positive' });

    // Update the expense fields
    expense.description = description || expense.description;
    expense.category = category || expense.category;
    expense.totalAmountPaisa = totalAmountPaisa;
    await expense.save({ session });

    // Recalculate splits — delete old, insert new
    await ExpenseSplit.deleteMany({ expenseId }, { session });

    const shares = splitEqually(totalAmountPaisa, splitAmong);
    const splitDocs = shares.map(({ userId, amountPaisa }) => ({
      expenseId: expense._id,
      groupId,
      owedByUserId: userId,
      owedToUserId: expense.paidByUserId,
      amountPaisa,
      isSettled: userId.toString() === expense.paidByUserId.toString(),
    }));
    await ExpenseSplit.insertMany(splitDocs, { session });

    await session.commitTransaction();
    res.json({ expense });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
}

async function deleteExpense(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { groupId, expenseId } = req.params;
    const expense = await Expense.findOne({ _id: expenseId, groupId });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can delete this expense' });
    }

    await ExpenseSplit.deleteMany({ expenseId }, { session });
    await Expense.deleteOne({ _id: expenseId }, { session });
    await session.commitTransaction();

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
}

module.exports = { addExpense, listExpenses, getExpense, editExpense, deleteExpense };
