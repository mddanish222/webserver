function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderPassbookHtml({
    customer,
    shopNameStr,
    ownerNameStr = '',
    shopAddressStr = '',
    ownerPhone = '',
    ownerPhoneTel = '',
    currencySymbol = '₹',
    shopUpiId = '',
    ledgerItems = [],
    netDue = 0,
    isNetDuePositive = false,
    formattedNetDue = '0',
    formattedTotalCredit = '0',
    formattedTotalPaid = '0',
    generatedAtStr = ''
}) {
    const safeShopName = escapeHtml(shopNameStr || 'Shop');
    const safeOwnerName = escapeHtml(ownerNameStr);
    const safeShopAddress = escapeHtml(shopAddressStr);
    const safeCustomerName = escapeHtml(customer.name || 'Valued Customer');
    const safeCustomerPhone = escapeHtml(customer.phoneNumber || '');
    const safeCurrency = escapeHtml(currencySymbol || '₹');
    const cleanNetDue = Number(netDue) || 0;
    const isSettled = Math.abs(cleanNetDue) < 0.005;

    const statusBadgeText = isNetDuePositive
        ? 'Pending Balance Due'
        : (isSettled ? 'Account Settled' : 'Advance Credit');
    const balanceValueText = isSettled
        ? `${safeCurrency}0`
        : `${safeCurrency}${escapeHtml(formattedNetDue)}`;

    const payAmountNum = isNetDuePositive ? cleanNetDue.toFixed(2).replace(/\.00$/, '') : '0';
    const upiHref = (isNetDuePositive && shopUpiId)
        ? `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(shopNameStr || 'Shop')}&am=${encodeURIComponent(payAmountNum)}&cu=INR&tn=${encodeURIComponent('Khata Balance Payment')}`
        : '';

    const rowsHtml = ledgerItems.map(item => {
        const debitCell = item.isUdharDebit ? escapeHtml(item.formattedAmount) : '';
        const creditCell = !item.isUdharDebit ? escapeHtml(item.formattedAmount) : '';
        const balNum = escapeHtml(item.formattedRunningBal);
        const balClass = item.runningBal > 0
            ? 'bal-dr'
            : (item.runningBal < 0 ? 'bal-cr' : 'bal-settled');
        const balDisplay = Math.abs(item.runningBal) < 0.005
            ? 'Settled'
            : `${balNum} <span class="bal-tag">${escapeHtml(item.balanceSuffix)}</span>`;

        return `
            <tr>
                <td class="col-date">
                    ${item.isLatest ? '<div class="latest-tag">Latest</div>' : ''}
                    <div class="date-label">${escapeHtml(item.dateStr)}</div>
                    ${item.noteStr ? `<div class="note-label">${escapeHtml(item.noteStr)}</div>` : ''}
                </td>
                <td class="col-debit">${debitCell}</td>
                <td class="col-credit">${creditCell}</td>
                <td class="col-balance ${balClass}">${balDisplay}</td>
            </tr>
        `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <title>${safeCustomerName} • ${safeShopName} Passbook</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            color-scheme: light only;
            --bg-canvas: #F4F6F9;
            --surface: #FFFFFF;
            --surface-soft: #F8FAFC;
            --border-hair: #DCE3EC;
            --border-gold: #D6B97A;
            --emerald-deep: #0B5D44;
            --emerald-accent: #059669;
            --emerald-soft: #ECFDF5;
            --crimson: #C81E3A;
            --crimson-soft: #FEF2F3;
            --col-debit-bg: #FDF4F5;
            --col-credit-bg: #EEF8F1;
            --text-primary: #0F172A;
            --text-secondary: #475569;
            --text-muted: #64748B;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
        }

        html, body {
            background-color: var(--bg-canvas) !important;
            color: var(--text-primary) !important;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
        }

        .page-wrap {
            max-width: 560px;
            margin: 0 auto;
            padding: 16px 14px 44px;
        }

        /* Luxury Executive Header Card */
        .passbook-shell {
            background: var(--surface);
            border: 1px solid var(--border-hair);
            border-radius: 22px;
            box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.03);
            overflow: hidden;
            margin-bottom: 16px;
        }

        .gold-accent-bar {
            height: 4px;
            background: linear-gradient(90deg, #0B5D44 0%, #C59B43 52%, #0B5D44 100%);
        }

        .shop-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 18px 18px 14px;
            background: linear-gradient(180deg, #FFFFFF 0%, #FAFCFB 100%);
            border-bottom: 1px solid #EEF2F6;
        }

        .shop-title-block {
            min-width: 0;
            flex: 1;
        }

        .shop-eyebrow {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            color: #9A7020;
            margin-bottom: 4px;
        }

        .shop-name {
            font-size: 20px;
            font-weight: 800;
            color: var(--emerald-deep);
            line-height: 1.2;
            letter-spacing: -0.3px;
            word-break: break-word;
        }

        .shop-sub {
            margin-top: 4px;
            font-size: 12px;
            font-weight: 500;
            color: var(--text-muted);
            line-height: 1.35;
        }

        .call-owner-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            flex-shrink: 0;
            height: 42px;
            padding: 0 14px;
            border-radius: 999px;
            background: #ECFDF5;
            border: 1px solid #A7F3D0;
            color: var(--emerald-deep);
            text-decoration: none;
            font-size: 13px;
            font-weight: 700;
            box-shadow: 0 2px 8px rgba(11, 93, 68, 0.08);
            transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
        }

        .call-owner-btn:hover {
            background: #D1FAE5;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(11, 93, 68, 0.14);
        }

        .call-owner-btn:active {
            transform: scale(0.96);
        }

        .call-emoji {
            font-size: 16px;
            line-height: 1;
        }

        /* Customer & Pending Balance Section */
        .balance-section {
            padding: 18px 18px 20px;
        }

        .customer-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 14px;
        }

        .customer-name {
            font-size: 16px;
            font-weight: 800;
            color: var(--text-primary);
        }

        .customer-phone-chip {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            background: var(--surface-soft);
            border: 1px solid var(--border-hair);
            border-radius: 999px;
            padding: 4px 10px;
        }

        .due-panel {
            border-radius: 16px;
            padding: 18px 16px;
            text-align: center;
            border: 1px solid ${isNetDuePositive ? '#FAD2D7' : '#BDECD6'};
            background: ${isNetDuePositive
                ? 'linear-gradient(135deg, #FFF7F8 0%, #FFFDFD 100%)'
                : 'linear-gradient(135deg, #F2FBF6 0%, #FFFFFF 100%)'};
        }

        .due-label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.9px;
            text-transform: uppercase;
            color: ${isNetDuePositive ? '#B91C1C' : '#047857'};
            margin-bottom: 6px;
        }

        .due-amount {
            font-size: 34px;
            font-weight: 800;
            letter-spacing: -0.9px;
            font-variant-numeric: tabular-nums;
            color: ${isNetDuePositive ? 'var(--crimson)' : 'var(--emerald-deep)'};
        }

        .totals-strip {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 12px;
        }

        .total-pill {
            background: var(--surface-soft);
            border: 1px solid #E5EBF2;
            border-radius: 12px;
            padding: 9px 10px;
            text-align: center;
        }

        .total-pill-label {
            font-size: 10.5px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }

        .total-pill-val {
            margin-top: 2px;
            font-size: 14px;
            font-weight: 800;
            font-variant-numeric: tabular-nums;
        }

        .val-debit { color: var(--crimson); }
        .val-credit { color: var(--emerald-accent); }

        .actions-stack {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 16px;
        }

        .upi-pay-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 14px 18px;
            border-radius: 14px;
            background: linear-gradient(135deg, #0B5D44 0%, #059669 100%);
            color: #FFFFFF;
            text-decoration: none;
            font-size: 15px;
            font-weight: 800;
            box-shadow: 0 8px 20px rgba(5, 150, 105, 0.24);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .upi-pay-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 24px rgba(5, 150, 105, 0.30);
        }

        .upi-pay-btn:active {
            transform: scale(0.98);
        }

        .pdf-print-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 12px 16px;
            border-radius: 14px;
            background: #FFFFFF;
            border: 1.5px solid var(--border-hair);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 13.5px;
            font-weight: 700;
            cursor: pointer;
            transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .pdf-print-btn:hover {
            background: var(--surface-soft);
            border-color: #CBD5E1;
        }

        /* Luxury Light-Theme 4-Column Passbook Table */
        .table-card {
            background: var(--surface);
            border: 1px solid var(--border-hair);
            border-radius: 18px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
            overflow: hidden;
        }

        .table-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 13px 16px;
            background: #FFFFFF;
            border-bottom: 1px solid var(--border-hair);
        }

        .table-topbar-title {
            font-size: 12.5px;
            font-weight: 800;
            letter-spacing: 0.7px;
            text-transform: uppercase;
            color: var(--text-secondary);
        }

        .table-count {
            font-size: 11.5px;
            font-weight: 700;
            color: var(--emerald-deep);
            background: var(--emerald-soft);
            border: 1px solid #A7F3D0;
            border-radius: 999px;
            padding: 2px 9px;
        }

        .table-scroll {
            width: 100%;
            overflow-x: auto;
        }

        table.passbook-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            background: #FFFFFF;
        }

        .passbook-table thead th {
            background: #F3F6FA !important;
            color: #1E293B;
            font-size: 12px;
            font-weight: 800;
            padding: 11px 10px;
            border-bottom: 1px solid var(--border-hair);
            border-right: 1px solid var(--border-hair);
            text-align: right;
            white-space: nowrap;
        }

        .passbook-table thead th:first-child {
            text-align: left;
            width: 34%;
            padding-left: 12px;
        }

        .passbook-table thead th:nth-child(2) { width: 20%; }
        .passbook-table thead th:nth-child(3) { width: 21%; }
        .passbook-table thead th:last-child {
            width: 25%;
            border-right: none;
            padding-right: 12px;
        }

        .passbook-table tbody td {
            border-bottom: 1px solid var(--border-hair);
            border-right: 1px solid var(--border-hair);
            padding: 11px 10px;
            vertical-align: middle;
            font-size: 13px;
            font-variant-numeric: tabular-nums;
            color: var(--text-primary);
        }

        .passbook-table tbody tr:last-child td {
            border-bottom: none;
        }

        .passbook-table tbody td:last-child {
            border-right: none;
            padding-right: 12px;
        }

        td.col-date {
            text-align: left;
            padding-left: 12px !important;
            background: #FFFFFF;
            vertical-align: top !important;
        }

        td.col-debit {
            text-align: right;
            background: var(--col-debit-bg) !important;
            font-weight: 600;
            color: #1E293B;
        }

        td.col-credit {
            text-align: right;
            background: var(--col-credit-bg) !important;
            font-weight: 600;
            color: #1E293B;
        }

        td.col-balance {
            text-align: right;
            background: #FFFFFF;
            font-weight: 700;
            white-space: nowrap;
        }

        .latest-tag {
            display: inline-block;
            font-size: 11px;
            font-weight: 800;
            color: #B91C1C;
            margin-bottom: 2px;
            letter-spacing: 0.2px;
        }

        .date-label {
            font-size: 13px;
            font-weight: 600;
            color: #0F172A;
            line-height: 1.3;
        }

        .note-label {
            margin-top: 3px;
            font-size: 12px;
            font-weight: 400;
            color: #334155;
            line-height: 1.35;
            word-break: break-word;
        }

        .bal-dr { color: #C81E3A !important; }
        .bal-cr { color: #047857 !important; }
        .bal-settled { color: #047857 !important; font-size: 12px !important; }

        .bal-tag {
            font-size: 11.5px;
            font-weight: 600;
        }

        .empty-state {
            padding: 34px 18px;
            text-align: center;
            color: var(--text-muted);
            font-size: 13.5px;
            font-weight: 500;
        }

        .statement-footer {
            text-align: center;
            margin-top: 18px;
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 500;
        }

        .print-only-meta {
            display: none;
        }

        @media (max-width: 400px) {
            .passbook-table thead th { font-size: 11px; padding: 10px 7px; }
            .passbook-table tbody td { font-size: 12px; padding: 10px 7px; }
            td.col-date { padding-left: 9px !important; }
            .passbook-table tbody td:last-child,
            .passbook-table thead th:last-child { padding-right: 9px !important; }
            .due-amount { font-size: 29px; }
        }

        /* Executive Light-Theme PDF / Print Stylesheet */
        @page {
            size: A4 portrait;
            margin: 12mm;
        }

        @media print {
            :root, html, body {
                color-scheme: light only !important;
                background: #FFFFFF !important;
                color: #0F172A !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .no-print {
                display: none !important;
            }

            .print-only-meta {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 11.5px;
                font-weight: 700;
                color: #0B5D44;
                background: #ECFDF5 !important;
                border: 1px solid #A7F3D0;
                border-radius: 999px;
                padding: 4px 10px;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .page-wrap {
                max-width: 100%;
                padding: 0;
                margin: 0;
            }

            .passbook-shell,
            .table-card {
                box-shadow: none !important;
                border: 1px solid #CBD5E1 !important;
                background: #FFFFFF !important;
            }

            .passbook-table thead {
                display: table-header-group;
            }

            .passbook-table tbody tr {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            .passbook-table thead th {
                background: #F3F6FA !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            td.col-debit {
                background: #FDF4F5 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            td.col-credit {
                background: #EEF8F1 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>
    <div class="page-wrap">
        <div class="passbook-shell">
            <div class="gold-accent-bar"></div>

            <div class="shop-header">
                <div class="shop-title-block">
                    <div class="shop-eyebrow">Digital Khata Passbook</div>
                    <h1 class="shop-name">${safeShopName}</h1>
                    ${(safeOwnerName || safeShopAddress) ? `<div class="shop-sub">${[safeOwnerName, safeShopAddress].filter(Boolean).join(' • ')}</div>` : ''}
                </div>

                ${ownerPhoneTel ? `
                <a href="tel:${escapeHtml(ownerPhoneTel)}" class="call-owner-btn no-print" title="Call ${safeShopName}" aria-label="Call Shop Owner">
                    <span class="call-emoji" aria-hidden="true">📞</span>
                    <span>Call</span>
                </a>
                <div class="print-only-meta">📞 ${escapeHtml(ownerPhone)}</div>
                ` : ''}
            </div>

            <div class="balance-section">
                <div class="customer-meta">
                    <div class="customer-name">${safeCustomerName}</div>
                    ${safeCustomerPhone ? `<div class="customer-phone-chip">📱 ${safeCustomerPhone}</div>` : ''}
                </div>

                <div class="due-panel">
                    <div class="due-label">${statusBadgeText}</div>
                    <div class="due-amount">${balanceValueText}</div>
                    <div class="totals-strip">
                        <div class="total-pill">
                            <div class="total-pill-label">Total Debit</div>
                            <div class="total-pill-val val-debit">${safeCurrency}${escapeHtml(formattedTotalCredit)}</div>
                        </div>
                        <div class="total-pill">
                            <div class="total-pill-label">Total Credit</div>
                            <div class="total-pill-val val-credit">${safeCurrency}${escapeHtml(formattedTotalPaid)}</div>
                        </div>
                    </div>
                </div>

                <div class="actions-stack no-print">
                    ${upiHref ? `
                    <a href="${upiHref}" class="upi-pay-btn">
                        <span>💳</span>
                        <span>Pay ${safeCurrency}${escapeHtml(formattedNetDue)} Online</span>
                    </a>` : ''}

                    <button type="button" onclick="window.print()" class="pdf-print-btn">
                        <span>📄</span>
                        <span>Download / Print PDF Statement</span>
                    </button>
                </div>
            </div>
        </div>

        <div class="table-card">
            <div class="table-topbar">
                <span class="table-topbar-title">Passbook Ledger</span>
                <span class="table-count">${ledgerItems.length} ${ledgerItems.length === 1 ? 'Entry' : 'Entries'}</span>
            </div>

            ${ledgerItems.length > 0 ? `
            <div class="table-scroll">
                <table class="passbook-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Debit(-)</th>
                            <th>Credit(+)</th>
                            <th>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            ` : `
            <div class="empty-state">No ledger transactions recorded yet.</div>
            `}
        </div>

        <div class="statement-footer">
            Statement generated on ${escapeHtml(generatedAtStr)} • Powered by Finance Master
        </div>
    </div>
</body>
</html>`;
}

function renderNotFoundHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <title>Passbook Not Found</title>
    <style>
        body {
            background: #F4F6F9;
            color: #0F172A;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .card {
            background: #FFFFFF;
            border: 1px solid #DCE3EC;
            border-radius: 20px;
            padding: 32px 24px;
            text-align: center;
            max-width: 380px;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        }
        h2 { color: #0B5D44; margin-bottom: 8px; }
        p { color: #64748B; font-size: 14px; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Passbook Not Found</h2>
        <p>This customer passbook link may have expired or been removed.</p>
    </div>
</body>
</html>`;
}

module.exports = {
    renderPassbookHtml,
    renderNotFoundHtml
};
