const { getCollections } = require('../config/db');

// Customers CRUD
async function saveCustomer(req, res, next) {
    try {
        const { customersCollection } = getCollections();
        const cust = req.body;
        await customersCollection.updateOne({ id: cust.id }, { $set: cust }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Customer saved -> ${cust.name}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getCustomers(req, res, next) {
    try {
        const { customersCollection } = getCollections();
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const customers = await customersCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${customers.length} customers for ${email}`);
        res.json({ success: true, customers: customers });
    } catch (err) {
        next(err);
    }
}

async function deleteCustomer(req, res, next) {
    try {
        const { customersCollection, ledgersCollection } = getCollections();
        await customersCollection.deleteOne({ id: req.params.id });
        await ledgersCollection.deleteMany({ customerId: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted customer ${req.params.id}`);
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
        await ledgersCollection.updateOne({ id: entry.id }, { $set: entry }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Customer ledger logged -> ${entry.amount}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getCustomerLedgers(req, res, next) {
    try {
        const { ledgersCollection } = getCollections();
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const ledgers = await ledgersCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${ledgers.length} ledger entries for ${email}`);
        res.json({ success: true, ledgers: ledgers });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveCustomer,
    getCustomers,
    deleteCustomer,
    saveCustomerLedger,
    getCustomerLedgers
};
