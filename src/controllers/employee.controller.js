const { getCollections } = require('../config/db');

// Employees CRUD
async function saveEmployee(req, res, next) {
    try {
        const { employeesCollection } = getCollections();
        const emp = req.body;
        await employeesCollection.updateOne({ id: emp.id }, { $set: emp }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Employee saved ${emp.name}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getEmployees(req, res, next) {
    try {
        const { employeesCollection } = getCollections();
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const employees = await employeesCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${employees.length} employees for ${email}`);
        res.json({ success: true, employees: employees });
    } catch (err) {
        next(err);
    }
}

async function deleteEmployee(req, res, next) {
    try {
        const { employeesCollection, employeeTxCollection } = getCollections();
        await employeesCollection.deleteOne({ id: req.params.id });
        await employeeTxCollection.deleteMany({ employeeId: req.params.id });
        console.log(`✅ MongoDB Atlas: Employee ${req.params.id} deleted`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

// Employee Transactions CRUD
async function saveEmployeeTransaction(req, res, next) {
    try {
        const { employeeTxCollection } = getCollections();
        const tx = req.body;
        await employeeTxCollection.updateOne({ id: tx.id }, { $set: tx }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Employee Tx saved ${tx.type} for employee ${tx.employeeId}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getEmployeeTransactions(req, res, next) {
    try {
        const { employeeTxCollection } = getCollections();
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const txs = await employeeTxCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${txs.length} employee transactions for ${email}`);
        res.json({ success: true, employeeTransactions: txs });
    } catch (err) {
        next(err);
    }
}

async function deleteEmployeeTransaction(req, res, next) {
    try {
        const { employeeTxCollection } = getCollections();
        await employeeTxCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Employee Tx ${req.params.id} deleted`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveEmployee,
    getEmployees,
    deleteEmployee,
    saveEmployeeTransaction,
    getEmployeeTransactions,
    deleteEmployeeTransaction
};
