const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');

// Customer CRUD: /api/customers
router.post('/customers', customerController.saveCustomer);
router.get('/customers', customerController.getCustomers);
router.delete('/customers/:id', customerController.deleteCustomer);

// Khata Ledgers: /api/customer_ledgers
router.post('/customer_ledgers', customerController.saveCustomerLedger);
router.get('/customer_ledgers', customerController.getCustomerLedgers);

module.exports = router;
