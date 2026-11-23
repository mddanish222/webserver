const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');
const authRoutes = require('./auth.routes');
const accountRoutes = require('./account.routes');
const transactionRoutes = require('./transaction.routes');
const customerRoutes = require('./customer.routes');
const loanRoutes = require('./loan.routes');
const reminderRoutes = require('./reminder.routes');
const employeeRoutes = require('./employee.routes');
const syncRoutes = require('./sync.routes');
const invoiceRoutes = require('./invoice.routes');

// Apply baseline API rate limiting across all incoming endpoints
router.use(apiLimiter);

// Health Check (Public)
router.get('/health', (req, res) => {
    res.json({ success: true, message: "Server is running securely", timestamp: Date.now() });
});

// Authentication & Profile Routes
router.use('/', authRoutes); // /register and /login are public; /staff and /profile are protected inside

// Protected Multi-Tenant Domain Routes
router.use('/accounts', authenticateToken, accountRoutes);
router.use('/transactions', authenticateToken, transactionRoutes);
router.use('/sync', authenticateToken, syncRoutes);
router.use('/', authenticateToken, customerRoutes); // /customers, /customer_ledgers
router.use('/loans', authenticateToken, loanRoutes);
router.use('/reminders', authenticateToken, reminderRoutes);
router.use('/invoices', authenticateToken, invoiceRoutes);
router.use('/', authenticateToken, employeeRoutes); // /employees, /employee-transactions

module.exports = router;
