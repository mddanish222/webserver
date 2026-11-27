const { getCollections } = require('../config/db');
const { DEFAULT_UPI_ID } = require('../config/env');
const { renderPassbookHtml, renderNotFoundHtml } = require('../views/passbook.template');

const CURRENCY_SYMBOLS = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
    SAR: '﷼',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$'
};

function extractValidPhone(candidates) {
    for (const rawCandidate of candidates) {
        if (!rawCandidate) continue;
        const str = String(rawCandidate).trim();
        if (!str || str.includes('@')) continue;
        const cleaned = str.replace(/[^\d+]/g, '');
        const digitsOnly = cleaned.replace(/\D/g, '');
        if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
            return { display: str, tel: cleaned };
        }
    }
    return { display: '', tel: '' };
}

function formatPassbookNumber(value) {
    const absVal = Math.abs(Number(value) || 0);
    const isWhole = Math.abs(absVal - Math.round(absVal)) < 0.005;
    return absVal.toLocaleString('en-IN', {
        minimumFractionDigits: isWhole ? 0 : 2,
        maximumFractionDigits: 2
    });
}

async function renderPassbook(req, res) {
    try {
        const { customersCollection, usersCollection, ledgersCollection } = getCollections();
        const customerId = req.params.customerId;
        const customer = await customersCollection.findOne({ id: customerId });

        if (!customer) {
            return res.status(404).send(renderNotFoundHtml());
        }

        // Resolve shop owner across ownerId and emailOrPhone
        let owner = null;
        const ownerQuery = [
            customer.ownerId ? { id: String(customer.ownerId).trim() } : null,
            customer.ownerId ? { ownerId: String(customer.ownerId).trim() } : null,
            customer.userEmail ? { emailOrPhone: String(customer.userEmail).trim() } : null,
            customer.emailOrPhone ? { emailOrPhone: String(customer.emailOrPhone).trim() } : null
        ].filter(Boolean);

        if (ownerQuery.length > 0) {
            owner = await usersCollection.findOne({
                $and: [
                    { $or: ownerQuery },
                    { role: { $ne: 'STAFF' } }
                ]
            });
            if (!owner) {
                owner = await usersCollection.findOne({ $or: ownerQuery });
            }
        }

        const currencyCode = (owner && owner.currencyCode) ? String(owner.currencyCode).toUpperCase() : 'INR';
        const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '₹';
        const isIndiaInr = currencyCode === 'INR';
        const shopUpiId = isIndiaInr
            ? (req.query.upi || (owner && owner.upiId) || DEFAULT_UPI_ID || '').trim()
            : '';
        const shopNameStr = (owner && owner.businessName && owner.businessName.trim())
            ? owner.businessName.trim()
            : 'Shop';
        const ownerNameStr = (owner && owner.name && owner.name.trim()) ? owner.name.trim() : '';
        const shopAddressStr = (owner && owner.address && owner.address.trim()) ? owner.address.trim() : '';

        const ownerPhoneInfo = extractValidPhone([
            owner && owner.phoneNumber,
            owner && owner.phone,
            owner && owner.mobile,
            owner && owner.emailOrPhone,
            customer.ownerPhone
        ]);

        // Fetch ledgers chronologically to compute exact running balance per transaction
        const ledgers = await ledgersCollection
            .find({ customerId: customerId })
            .sort({ timestamp: 1 })
            .toArray();

        let totalCredit = 0; // Udhar / Debit on customer account
        let totalPaid = 0;   // Cash/UPI received / Credit on customer account
        const currentYear = new Date().getFullYear();

        const chronologicalItems = ledgers.map(entry => {
            const amt = Number(entry.amount) || 0;
            const isUdharDebit = entry.type === 'CREDIT_GIVEN' || entry.type === 'GIVEN';
            if (isUdharDebit) {
                totalCredit += amt;
            } else {
                totalPaid += amt;
            }
            const runningBal = totalCredit - totalPaid;

            const ts = Number(entry.timestamp) || 0;
            const dateObj = ts > 0 ? new Date(ts) : null;
            let shortDateStr = 'N/A';
            let fullDateStr = 'N/A';
            if (dateObj && !isNaN(dateObj.getTime())) {
                const sameYear = dateObj.getFullYear() === currentYear;
                shortDateStr = dateObj.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    ...(sameYear ? {} : { year: '2-digit' })
                });
                fullDateStr = dateObj.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            return {
                ...entry,
                amount: amt,
                formattedAmount: formatPassbookNumber(amt),
                dateStr: shortDateStr,
                fullDateStr,
                noteStr: entry.note ? String(entry.note).trim() : '',
                isCredit: isUdharDebit,
                isUdharDebit,
                runningBal,
                formattedRunningBal: formatPassbookNumber(runningBal),
                balanceSuffix: runningBal > 0 ? 'Dr' : (runningBal < 0 ? 'Cr' : '')
            };
        });

        // Reverse so newest transaction appears at the top with a Latest badge
        const ledgerItems = chronologicalItems.reverse().map((item, idx) => ({
            ...item,
            isLatest: idx === 0
        }));

        const netDue = totalCredit - totalPaid;
        const isNetDuePositive = netDue > 0;
        const formattedNetDue = formatPassbookNumber(netDue);
        const formattedTotalCredit = formatPassbookNumber(totalCredit);
        const formattedTotalPaid = formatPassbookNumber(totalPaid);

        const generatedAtStr = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const html = renderPassbookHtml({
            customer,
            shopNameStr,
            ownerNameStr,
            shopAddressStr,
            ownerPhone: ownerPhoneInfo.display,
            ownerPhoneTel: ownerPhoneInfo.tel,
            currencySymbol,
            shopUpiId,
            ledgerItems,
            netDue,
            isNetDuePositive,
            formattedNetDue,
            formattedTotalCredit,
            formattedTotalPaid,
            generatedAtStr
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
