const { getCollections } = require('../config/db');
const { getTenantIdentifiers } = require('../middleware/auth.middleware');

/**
 * Atomically generates the next sequence number for an invoice or quotation
 * Guarantees zero duplicate invoice numbers across concurrent cashier phones and devices
 */
async function getNextDocumentNumber(req, res, next) {
    try {
        const { countersCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        if (!tenantIds || tenantIds.length === 0) {
            return res.status(401).json({ success: false, message: "Unauthorized. Tenant identifier required." });
        }

        const ownerId = tenantIds[0];
        const type = (req.query.type || req.body.type || 'INVOICE').toUpperCase();
        const prefix = req.query.prefix || req.body.prefix || (type === 'INVOICE' ? 'INV' : 'QTN');

        const counterId = `counter_${ownerId}_${type}`;
        
        const result = await countersCollection.findOneAndUpdate(
            { _id: counterId },
            { $inc: { seq: 1 }, $set: { updatedAt: Date.now() } },
            { upsert: true, returnDocument: 'after' }
        );

        const seq = (result && result.seq) ? result.seq : 1;
        const formattedNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

        res.json({
            success: true,
            type,
            prefix,
            seq,
            documentNumber: formattedNumber
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getNextDocumentNumber
};
