const { getCollections } = require('../config/db');
const { getTenantIdentifiers } = require('../middleware/auth.middleware');

// Employees CRUD
async function saveEmployee(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot manage employees." });
        }

        const { employeesCollection } = getCollections();
        const emp = req.body;
        emp.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        emp.userEmail = req.user.ownerEmail || req.user.emailOrPhone;

        await employeesCollection.updateOne({ id: emp.id }, { $set: emp }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Employee saved ${emp.name}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getEmployees(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot access employee payroll." });
        }

        const { employeesCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);

        if (!tenantIds || tenantIds.length === 0) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }

        const query = {
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        };

        const employees = await employeesCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${employees.length} scoped employees for tenant [${tenantIds.join(', ')}]`);
        res.json({ success: true, employees: employees });
    } catch (err) {
        next(err);
    }
}

async function deleteEmployee(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot delete employees." });
        }

        const { employeesCollection, employeeTxCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        const empId = req.params.id;

        const result = await employeesCollection.deleteOne({
            id: empId,
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Employee not found or permission denied." });
        }

        await employeeTxCollection.deleteMany({ employeeId: empId });
        console.log(`✅ MongoDB Atlas: Employee ${empId} deleted`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

// Employee Transactions CRUD
async function saveEmployeeTransaction(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot manage employee payroll." });
        }

        const { employeeTxCollection } = getCollections();
        const tx = req.body;
        tx.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        tx.userEmail = req.user.ownerEmail || req.user.emailOrPhone;

        await employeeTxCollection.updateOne({ id: tx.id }, { $set: tx }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Employee Tx saved ${tx.type} for employee ${tx.employeeId}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getEmployeeTransactions(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot access employee payroll." });
        }

        const { employeeTxCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);

        if (!tenantIds || tenantIds.length === 0) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }

        const query = {
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        };

        const txs = await employeeTxCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${txs.length} scoped employee transactions for tenant [${tenantIds.join(', ')}]`);
        res.json({ success: true, employeeTransactions: txs });
    } catch (err) {
        next(err);
    }
}

async function deleteEmployeeTransaction(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot delete employee transactions." });
        }

        const { employeeTxCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        const txId = req.params.id;

        const result = await employeeTxCollection.deleteOne({
            id: txId,
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Transaction not found or permission denied." });
        }

        console.log(`✅ MongoDB Atlas: Employee Tx ${txId} deleted`);
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
