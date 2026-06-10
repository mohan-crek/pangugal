const router = require('express').Router();
const { addExpense, listExpenses, getExpense, deleteExpense } = require('../controllers/expense.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/:groupId/expenses', addExpense);
router.get('/:groupId/expenses', listExpenses);
router.get('/:groupId/expenses/:expenseId', getExpense);
router.delete('/:groupId/expenses/:expenseId', deleteExpense);

module.exports = router;
