const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');

router.post('/', transactionController.saveTransaction);
router.get('/', transactionController.getTransactions);
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
