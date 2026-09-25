const { getCollections } = require('../config/db');

async function saveTransaction(req, res, next) {
    try {
        const { transactionsCollection } = getCollections();
        const tx = req.body;
        await transactionsCollection.updateOne({ id: tx.id }, { $set: tx }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Transaction saved -> ${tx.category} (${tx.amount})`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getTransactions(req, res, next) {
    try {
        const { transactionsCollection } = getCollections();
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const transactions = await transactionsCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${transactions.length} transactions for ${email}`);
        res.json({ success: true, transactions: transactions });
    } catch (err) {
        next(err);
    }
}

async function deleteTransaction(req, res, next) {
    try {
        const { transactionsCollection } = getCollections();
        await transactionsCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted transaction ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveTransaction,
    getTransactions,
    deleteTransaction
};
