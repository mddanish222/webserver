const { getCollections } = require('../config/db');
const { getTenantIdentifiers } = require('../middleware/auth.middleware');

async function saveLoan(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot manage loans." });
        }

        const { loansCollection } = getCollections();
        const loan = req.body;
        loan.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        loan.userEmail = req.user.ownerEmail || req.user.emailOrPhone;

        await loansCollection.updateOne({ id: loan.id }, { $set: loan }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Loan tracker saved -> ${loan.title}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getLoans(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot access loans." });
        }

        const { loansCollection } = getCollections();
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

        const loans = await loansCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${loans.length} scoped loans for tenant [${tenantIds.join(', ')}]`);
        res.json({ success: true, loans: loans });
    } catch (err) {
        next(err);
    }
}

async function deleteLoan(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot delete loans." });
        }

        const { loansCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        const loanId = req.params.id;

        const result = await loansCollection.deleteOne({
            id: loanId,
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Loan not found or permission denied." });
        }

        console.log(`✅ MongoDB Atlas: Deleted loan ${loanId}`);
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
