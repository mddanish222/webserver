const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');

// Employees: /api/employees
router.post('/employees', employeeController.saveEmployee);
router.get('/employees', employeeController.getEmployees);
router.delete('/employees/:id', employeeController.deleteEmployee);

// Employee Transactions: /api/employee-transactions
router.post('/employee-transactions', employeeController.saveEmployeeTransaction);
router.get('/employee-transactions', employeeController.getEmployeeTransactions);
router.delete('/employee-transactions/:id', employeeController.deleteEmployeeTransaction);

module.exports = router;
