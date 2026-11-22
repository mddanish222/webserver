const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');

// Customers CRUD: /api/customers
router.post('/customers', customerController.saveCustomer);
router.get('/customers', customerController.getCustomers);
router.delete('/customers/:id', customerController.deleteCustomer);

// Khata Ledgers: /api/customer_ledgers
router.post('/customer_ledgers', customerController.saveCustomerLedger);
router.get('/customer_ledgers', customerController.getCustomerLedgers);

// Suppliers CRUD: /api/suppliers
router.post('/suppliers', customerController.saveSupplier);
router.get('/suppliers', customerController.getSuppliers);
router.delete('/suppliers/:id', customerController.deleteSupplier);

// Supplier Ledgers: /api/supplier_ledgers
router.post('/supplier_ledgers', customerController.saveSupplierLedger);
router.get('/supplier_ledgers', customerController.getSupplierLedgers);

// Stock Unit Sales: /api/stock-sales & /api/stock_sales
router.post('/stock-sales', customerController.saveStockSale);
router.get('/stock-sales', customerController.getStockSales);
router.post('/stock_sales', customerController.saveStockSale);
router.get('/stock_sales', customerController.getStockSales);

module.exports = router;
