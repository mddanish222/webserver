const { getCollections } = require('../config/db');
const { getTenantIdentifiers } = require('../middleware/auth.middleware');

async function saveAccount(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts do not have access to personal accounts." });
        }

        const { accountsCollection } = getCollections();
        const acc = req.body;
        acc.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        acc.userEmail = req.user.ownerEmail || req.user.emailOrPhone;
        acc.updatedAt = Date.now();
        acc.isDeleted = false;

        await accountsCollection.updateOne({ id: acc.id }, { $set: acc }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Account saved -> ${acc.title} for ${acc.userEmail}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getAccounts(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts do not have access to personal accounts." });
        }

        const { accountsCollection } = getCollections();
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

        const accounts = await accountsCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${accounts.length} scoped accounts for tenant [${tenantIds.join(', ')}]`);
        res.json({ success: true, accounts: accounts });
    } catch (err) {
        next(err);
    }
}

async function deleteAccount(req, res, next) {
    try {
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Staff accounts cannot delete personal accounts." });
        }

        const { accountsCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        const accId = req.params.id;

        const result = await accountsCollection.deleteOne({
            id: accId,
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Account not found or permission denied." });
        }

        console.log(`✅ MongoDB Atlas: Deleted account ${accId}`);
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
