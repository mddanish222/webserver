const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const accountRoutes = require('./account.routes');
const transactionRoutes = require('./transaction.routes');
const customerRoutes = require('./customer.routes');
const loanRoutes = require('./loan.routes');
const reminderRoutes = require('./reminder.routes');
const employeeRoutes = require('./employee.routes');

// Health Check
router.get('/health', (req, res) => {
    res.json({ success: true, message: "Server is running" });
});

// Domain Routes
router.use('/', authRoutes);             // /api/register, /api/login, /api/profile
router.use('/accounts', accountRoutes);  // /api/accounts
router.use('/transactions', transactionRoutes); // /api/transactions
router.use('/', customerRoutes);         // /api/customers, /api/customer_ledgers
router.use('/loans', loanRoutes);        // /api/loans
router.use('/reminders', reminderRoutes);// /api/reminders
router.use('/', employeeRoutes);         // /api/employees, /api/employee-transactions

module.exports = router;
