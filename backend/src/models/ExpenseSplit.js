const mongoose = require('mongoose');

const expenseSplitSchema = new mongoose.Schema({
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  owedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amountPaisa: { type: Number, required: true, min: 0 }, // integer paisa
  isSettled: { type: Boolean, default: false },
  settledAt: { type: Date, default: null },
}, { timestamps: true });

expenseSplitSchema.index({ groupId: 1, owedByUserId: 1 });
expenseSplitSchema.index({ groupId: 1, owedToUserId: 1 });
expenseSplitSchema.index({ expenseId: 1 });

module.exports = mongoose.model('ExpenseSplit', expenseSplitSchema);
