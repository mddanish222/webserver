const { getCollections } = require('../config/db');

async function saveAccount(req, res, next) {
    try {
        const { accountsCollection } = getCollections();
        const acc = req.body;
        await accountsCollection.updateOne({ id: acc.id }, { $set: acc }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Account saved -> ${acc.title}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getAccounts(req, res, next) {
    try {
        const { accountsCollection } = getCollections();
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const accounts = await accountsCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${accounts.length} accounts for ${email}`);
        res.json({ success: true, accounts: accounts });
    } catch (err) {
        next(err);
    }
}

async function deleteAccount(req, res, next) {
    try {
        const { accountsCollection } = getCollections();
        await accountsCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted account ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveAccount,
    getAccounts,
    deleteAccount
};
