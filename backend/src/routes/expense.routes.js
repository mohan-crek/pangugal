const router = require('express').Router();
const { addExpense, listExpenses, getExpense, editExpense, deleteExpense } = require('../controllers/expense.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/:groupId/expenses', addExpense);
router.get('/:groupId/expenses', listExpenses);
router.get('/:groupId/expenses/:expenseId', getExpense);
router.put('/:groupId/expenses/:expenseId', editExpense);
router.delete('/:groupId/expenses/:expenseId', deleteExpense);

module.exports = router;
