function renderPassbookHtml({ customer, shopNameStr, shopUpiId, ledgerItems, netDue, isNetDuePositive, formattedNetDue }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>${customer.name} - Khata Statement</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; line-height: 1.5; padding: 12px; }
        .container { max-width: 600px; margin: 0 auto; }
        
        .card { background: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.06); padding: 20px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
        
        .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; }
        .shop-name { font-size: 20px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
        .sub-title { font-size: 13px; color: #64748b; font-weight: 500; margin-top: 2px; }
        
        .cust-details { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .cust-name { font-size: 18px; font-weight: 700; color: #1e293b; }
        .cust-phone { font-size: 13px; color: #64748b; font-weight: 500; }
        .cust-address { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        
        .balance-box { background: ${isNetDuePositive ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${isNetDuePositive ? '#fecaca' : '#bbf7d0'}; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 16px; }
        .balance-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${isNetDuePositive ? '#991b1b' : '#166534'}; }
        .balance-amount { font-size: 28px; font-weight: 800; color: ${isNetDuePositive ? '#dc2626' : '#16a34a'}; margin: 4px 0; }
        .balance-sub { font-size: 12px; color: ${isNetDuePositive ? '#b91c1c' : '#15803d'}; font-weight: 500; }

        .timeline-title { font-size: 15px; font-weight: 700; color: #334155; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
        .count-badge { background: #e0e7ff; color: #4338ca; font-size: 12px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }

        .statement-list { list-style: none; }
        .item-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; transition: transform 0.1s; }
        .item-info { flex: 1; padding-right: 10px; }
        .item-note { font-size: 14px; font-weight: 600; color: #1e293b; word-break: break-word; }
        .item-date { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        
        .item-amounts { text-align: right; }
        .amt-credit { font-size: 15px; font-weight: 700; color: #dc2626; }
        .amt-paid { font-size: 15px; font-weight: 700; color: #16a34a; }
        .running-bal { font-size: 11px; color: #64748b; font-weight: 500; margin-top: 2px; }

        .upi-btn { display: block; width: 100%; background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; text-align: center; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px; border-radius: 12px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25); margin-top: 16px; }
        .upi-btn:active { transform: scale(0.98); }
        .print-btn { display: block; width: 100%; background: #ffffff; color: #475569; border: 1px solid #cbd5e1; text-align: center; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px; border-radius: 12px; margin-top: 10px; cursor: pointer; }

        .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; padding-bottom: 24px; }

        @media print {
            body { background: white; padding: 0; }
            .upi-btn, .print-btn { display: none; }
            .card { box-shadow: none; border: 1px solid #ccc; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="shop-name">📖 ${shopNameStr.toUpperCase()} - KHATA PASSBOOK</div>
                <div class="sub-title">Live Transaction History & Account Statement</div>
            </div>

            <div class="cust-details">
                <div>
                    <div class="cust-name">👤 ${customer.name}</div>
                    <div class="cust-phone">📞 ${customer.phoneNumber || 'N/A'}</div>
                    ${customer.address ? `<div class="cust-address">📍 ${customer.address}</div>` : ''}
                </div>
            </div>

            <div class="balance-box">
                <div class="balance-label">${isNetDuePositive ? 'Total Pending Balance Due' : 'Advance Credit Balance'}</div>
                <div class="balance-amount">₹${formattedNetDue}</div>
                <div class="balance-sub">${isNetDuePositive ? 'Kindly pay the pending due balance' : 'No pending dues'}</div>
            </div>

            ${isNetDuePositive ? `
                <a href="upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(shopNameStr)}&am=${netDue}&cu=INR&tn=${encodeURIComponent('Khata Balance Payment')}" class="upi-btn">
                    💳 Pay ₹${formattedNetDue} via UPI (GPay / PhonePe / Paytm)
                </a>
            ` : ''}
            
            <button onclick="window.print()" class="print-btn">🖨️ Download / Print PDF Statement</button>
        </div>

        <div class="timeline-title">
            <span>📋 All Transactions (${ledgerItems.length})</span>
            <span class="count-badge">From Start to Recent</span>
        </div>

        <ul class="statement-list">
            ${ledgerItems.length === 0 ? `
                <li class="card" style="text-align:center; color:#94a3b8; padding:30px;">
                    No transactions recorded yet.
                </li>
            ` : ledgerItems.slice().reverse().map(item => `
                <li class="item-card">
                    <div class="item-info">
                        <div class="item-note">${item.isCredit ? '🔴 ' : '🟢 '}${item.note}</div>
                        <div class="item-date">📅 ${item.dateStr}</div>
                    </div>
                    <div class="item-amounts">
                        <div class="${item.isCredit ? 'amt-credit' : 'amt-paid'}">
                            ${item.isCredit ? '+ ₹' : '- ₹'}${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div class="running-bal">Bal: ₹${item.runningBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                </li>
            `).join('')}
        </ul>

        <div class="footer">
            Generated automatically by Smart Finance Ledger System.<br>
            Protected & Verified Live Data.
        </div>
    </div>
</body>
</html>`;
}

function renderNotFoundHtml() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Customer Not Found</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; text-align: center; padding: 50px 20px; color: #334155; }
        .card { background: white; max-width: 400px; margin: 0 auto; padding: 30px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        h2 { color: #ef4444; margin-top: 0; }
    </style>
</head>
<body>
    <div class="card">
        <h2>⚠️ Statement Not Found</h2>
        <p>The requested customer statement link is invalid or has expired.</p>
    </div>
</body>
</html>`;
}

module.exports = {
    renderPassbookHtml,
    renderNotFoundHtml
};
