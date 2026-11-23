const { getCollections } = require('../config/db');
const { getTenantIdentifiers } = require('../middleware/auth.middleware');

// Customers CRUD
async function saveCustomer(req, res, next) {
    try {
        const { customersCollection } = getCollections();
        const cust = req.body;
        cust.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        cust.userEmail = req.user.ownerEmail || req.user.emailOrPhone;
        cust.recordedBy = req.user.name || req.user.emailOrPhone;
        cust.updatedAt = Date.now();
        cust.isDeleted = false;

        await customersCollection.updateOne({ id: cust.id }, { $set: cust }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Customer saved -> ${cust.name} for tenant ${cust.ownerId}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getCustomers(req, res, next) {
    try {
        const { customersCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);

        if (!tenantIds || tenantIds.length === 0) {
            return res.status(401).json({ success: false, message: "Unauthorized. Tenant identifier required." });
        }

        const query = {
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        };

        const customers = await customersCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${customers.length} scoped customers for tenant [${tenantIds.join(', ')}]`);
        res.json({ success: true, customers: customers });
    } catch (err) {
        next(err);
    }
}

async function deleteCustomer(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Permission denied. Staff members cannot delete customers." });
        }

        const { customersCollection, ledgersCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        const custId = req.params.id;

        const result = await customersCollection.updateOne(
            {
                id: custId,
                $or: [
                    { ownerId: { $in: tenantIds } },
                    { userEmail: { $in: tenantIds } },
                    { emailOrPhone: { $in: tenantIds } },
                    { userId: { $in: tenantIds } }
                ]
            },
            {
                $set: { isDeleted: true, updatedAt: Date.now() }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Customer not found or permission denied." });
        }

        await ledgersCollection.updateMany(
            { customerId: custId },
            { $set: { isDeleted: true, updatedAt: Date.now() } }
        );
        console.log(`✅ MongoDB Atlas: Soft-deleted (tombstoned) customer ${custId} and their ledgers`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

// Customer Ledgers
async function saveCustomerLedger(req, res, next) {
    try {
        const { ledgersCollection } = getCollections();
        const entry = req.body;

        entry.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        entry.userEmail = req.user.ownerEmail || req.user.emailOrPhone;
        entry.recordedBy = req.user.name || req.user.emailOrPhone;
        entry.recordedByRole = req.user.role || 'OWNER';
        entry.updatedAt = Date.now();
        entry.isDeleted = false;

        await ledgersCollection.updateOne({ id: entry.id }, { $set: entry }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Customer ledger logged -> ${entry.amount} (Recorded by ${entry.recordedBy})`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getCustomerLedgers(req, res, next) {
    try {
        const { ledgersCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);

        if (!tenantIds || tenantIds.length === 0) {
            return res.status(401).json({ success: false, message: "Unauthorized. Tenant identifier required." });
        }

        const query = {
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        };

        const ledgers = await ledgersCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${ledgers.length} scoped ledger entries for tenant [${tenantIds.join(', ')}]`);
        res.json({ success: true, ledgers: ledgers });
    } catch (err) {
        next(err);
    }
}

// ── Suppliers CRUD ───────────────────────────────────────────────────
async function saveSupplier(req, res, next) {
    try {
        const { suppliersCollection } = getCollections();
        const supp = req.body;
        supp.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        supp.userEmail = req.user.ownerEmail || req.user.emailOrPhone;
        supp.updatedAt = Date.now();
        supp.isDeleted = false;

        await suppliersCollection.updateOne({ id: supp.id }, { $set: supp }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Supplier saved -> ${supp.name}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getSuppliers(req, res, next) {
    try {
        const { suppliersCollection } = getCollections();
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

        const suppliers = await suppliersCollection.find(query).toArray();
        res.json({ success: true, suppliers: suppliers });
    } catch (err) {
        next(err);
    }
}

async function deleteSupplier(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot delete suppliers." });
        }

        const { suppliersCollection, supplierLedgersCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        const suppId = req.params.id;

        const result = await suppliersCollection.updateOne(
            {
                id: suppId,
                $or: [
                    { ownerId: { $in: tenantIds } },
                    { userEmail: { $in: tenantIds } },
                    { emailOrPhone: { $in: tenantIds } },
                    { userId: { $in: tenantIds } }
                ]
            },
            {
                $set: { isDeleted: true, updatedAt: Date.now() }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Supplier not found or permission denied." });
        }

        await supplierLedgersCollection.updateMany(
            { supplierId: suppId },
            { $set: { isDeleted: true, updatedAt: Date.now() } }
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

// Supplier Ledgers
async function saveSupplierLedger(req, res, next) {
    try {
        const { supplierLedgersCollection } = getCollections();
        const entry = req.body;
        entry.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        entry.userEmail = req.user.ownerEmail || req.user.emailOrPhone;
        entry.updatedAt = Date.now();
        entry.isDeleted = false;

        await supplierLedgersCollection.updateOne({ id: entry.id }, { $set: entry }, { upsert: true });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getSupplierLedgers(req, res, next) {
    try {
        const { supplierLedgersCollection } = getCollections();
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

        const ledgers = await supplierLedgersCollection.find(query).toArray();
        res.json({ success: true, supplierLedgers: ledgers });
    } catch (err) {
        next(err);
    }
}

// ── Stock Sales CRUD ─────────────────────────────────────────────────
async function saveStockSale(req, res, next) {
    try {
        const { stockSalesCollection } = getCollections();
        const sale = req.body;
        sale.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        sale.userEmail = req.user.ownerEmail || req.user.emailOrPhone;
        sale.recordedBy = req.user.name || req.user.emailOrPhone;
        sale.updatedAt = Date.now();
        sale.isDeleted = false;

        await stockSalesCollection.updateOne({ id: sale.id }, { $set: sale }, { upsert: true });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getStockSales(req, res, next) {
    try {
        const { stockSalesCollection } = getCollections();
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

        const sales = await stockSalesCollection.find(query).toArray();
        res.json({ success: true, stockSales: sales });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveCustomer,
    getCustomers,
    deleteCustomer,
    saveCustomerLedger,
    getCustomerLedgers,
    saveSupplier,
    getSuppliers,
    deleteSupplier,
    saveSupplierLedger,
    getSupplierLedgers,
    saveStockSale,
    getStockSales
};
