const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');

router.get('/next-number', invoiceController.getNextDocumentNumber);
router.post('/next-number', invoiceController.getNextDocumentNumber);

module.exports = router;
