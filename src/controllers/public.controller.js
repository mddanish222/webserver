const { getCollections } = require('../config/db');
const { DEFAULT_UPI_ID } = require('../config/env');
const { renderPassbookHtml, renderNotFoundHtml } = require('../views/passbook.template');

async function renderPassbook(req, res, next) {
    try {
        const { customersCollection, usersCollection, ledgersCollection } = getCollections();
        const customerId = req.params.customerId;
        const customer = await customersCollection.findOne({ id: customerId });

        if (!customer) {
            return res.status(404).send(renderNotFoundHtml());
        }

        // Fetch shop owner for UPI ID & shop name
        let owner = null;
        const ownerQuery = [
            customer.userEmail ? { emailOrPhone: customer.userEmail.trim() } : null,
            customer.emailOrPhone ? { emailOrPhone: customer.emailOrPhone.trim() } : null
        ].filter(Boolean);

        if (ownerQuery.length > 0) {
            owner = await usersCollection.findOne({ $or: ownerQuery });
        }

        const shopUpiId = (req.query.upi || (owner && owner.upiId) || DEFAULT_UPI_ID || '').trim();
        const shopNameStr = (owner && owner.businessName) ? owner.businessName : 'Shop';

        // Fetch ledgers for customer
        const ledgers = await ledgersCollection.find({ customerId: customerId }).sort({ timestamp: 1 }).toArray();

        // Calculate Totals & Running Balances
        let totalCredit = 0;
        let totalPaid = 0;

        const ledgerItems = ledgers.map(entry => {
            const amt = entry.amount || 0;
            const isCredit = entry.type === 'CREDIT_GIVEN' || entry.type === 'GIVEN';
            if (isCredit) {
                totalCredit += amt;
            } else {
                totalPaid += amt;
            }
            const runningBal = totalCredit - totalPaid;
            const dateStr = entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'N/A';
            return {
                id: entry.id,
                dateStr,
                note: entry.note || (isCredit ? 'Credit / Udhar' : 'Payment Received'),
                amount: amt,
                isCredit,
                runningBal
            };
        });

        const netDue = totalCredit - totalPaid;
        const isNetDuePositive = netDue > 0;
        const formattedNetDue = Math.abs(netDue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const html = renderPassbookHtml({
            customer,
            shopNameStr,
            shopUpiId,
            ledgerItems,
            netDue,
            isNetDuePositive,
            formattedNetDue
        });

        res.send(html);
    } catch (err) {
        console.error("❌ Error serving web passbook:", err);
        res.status(500).send("Server Error generating passbook statement.");
    }
}

module.exports = {
    renderPassbook
};
