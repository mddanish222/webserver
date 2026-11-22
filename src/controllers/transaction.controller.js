const { getCollections } = require('../config/db');
const { getTenantIdentifiers } = require('../middleware/auth.middleware');

async function saveTransaction(req, res, next) {
    try {
        const { transactionsCollection } = getCollections();
        const tx = req.body;
        const tenantIds = getTenantIdentifiers(req);

        // Ensure transaction is tagged with the organization/owner identifier
        tx.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        tx.userEmail = req.user.ownerEmail || req.user.emailOrPhone;
        tx.recordedBy = req.user.name || req.user.emailOrPhone;
        tx.recordedByRole = req.user.role || 'OWNER';

        await transactionsCollection.updateOne({ id: tx.id }, { $set: tx }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Transaction saved -> ${tx.category} (Amount: ${tx.amount}) by ${tx.recordedBy}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getTransactions(req, res, next) {
    try {
        const { transactionsCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);

        if (!tenantIds || tenantIds.length === 0) {
            return res.status(401).json({ success: false, message: "Unauthorized. Tenant identifier required." });
        }

        // Strict multi-tenant query: NEVER execute empty find({})!
        const query = {
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        };

        const transactions = await transactionsCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${transactions.length} scoped transactions for tenant [${tenantIds.join(', ')}]`);
        res.json({ success: true, transactions: transactions });
    } catch (err) {
        next(err);
    }
}

async function deleteTransaction(req, res, next) {
    try {
        // Staff cannot delete transactions
        if (req.user && req.user.role === 'STAFF') {
            return res.status(403).json({ success: false, message: "Permission denied. Staff members cannot delete transactions." });
        }

        const { transactionsCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        const txId = req.params.id;

        // Verify resource ownership before deleting
        const result = await transactionsCollection.deleteOne({
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

        console.log(`✅ MongoDB Atlas: Deleted transaction ${txId} for tenant [${tenantIds.join(', ')}]`);
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
