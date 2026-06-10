const mongoose = require('mongoose');

const CATEGORIES = ['food', 'travel', 'utilities', 'rent', 'entertainment', 'shopping', 'other'];

const expenseSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, enum: CATEGORIES, default: 'other' },
  totalAmountPaisa: { type: Number, required: true, min: 1 }, // stored as integer paisa
  paidByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

expenseSchema.index({ groupId: 1, _id: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
