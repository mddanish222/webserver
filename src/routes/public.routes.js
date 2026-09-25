const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Public Web Passbook statement: /p/:customerId
router.get('/:customerId', publicController.renderPassbook);

module.exports = router;
