const { getCollections } = require('../config/db');

async function saveLoan(req, res, next) {
    try {
        const { loansCollection } = getCollections();
        const loan = req.body;
        await loansCollection.updateOne({ id: loan.id }, { $set: loan }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Loan tracker saved -> ${loan.title}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getLoans(req, res, next) {
    try {
        const { loansCollection } = getCollections();
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const loans = await loansCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${loans.length} loans for ${email}`);
        res.json({ success: true, loans: loans });
    } catch (err) {
        next(err);
    }
}

async function deleteLoan(req, res, next) {
    try {
        const { loansCollection } = getCollections();
        await loansCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted loan ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveLoan,
    getLoans,
    deleteLoan
};
