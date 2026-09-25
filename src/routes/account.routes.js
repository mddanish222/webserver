const express = require('express');
const router = express.Router();
const accountController = require('../controllers/account.controller');

router.post('/', accountController.saveAccount);
router.get('/', accountController.getAccounts);
router.delete('/:id', accountController.deleteAccount);

module.exports = router;
