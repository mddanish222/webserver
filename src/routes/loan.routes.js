const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loan.controller');

router.post('/', loanController.saveLoan);
router.get('/', loanController.getLoans);
router.delete('/:id', loanController.deleteLoan);

module.exports = router;
