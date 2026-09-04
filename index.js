require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI || "mongodb+srv://noor04aysha_db_user:SFQdNBtEEEaPdliG@moneymanager.lbu1gkg.mongodb.net/FinanceDB?retryWrites=true&w=majority";
const client = new MongoClient(mongoUri);

let db, usersCollection, accountsCollection, transactionsCollection, customersCollection, ledgersCollection, loansCollection, remindersCollection, employeesCollection, employeeTxCollection;

async function initMongoDB() {
    try {
        await client.connect();
        db = client.db("FinanceDB");
        usersCollection = db.collection("users");
        accountsCollection = db.collection("home_accounts");
        transactionsCollection = db.collection("transactions");
        customersCollection = db.collection("customers");
        ledgersCollection = db.collection("customer_ledgers");
        loansCollection = db.collection("loans");
        remindersCollection = db.collection("reminders");
        employeesCollection = db.collection("employees");
        employeeTxCollection = db.collection("employee_transactions");

        console.log("⚡ Connected successfully to MongoDB Atlas Cloud Cluster!");
        console.log("📁 Database 'FinanceDB' active with collections: users, home_accounts, transactions, customers, customer_ledgers, loans, reminders, employees, employee_transactions");
    } catch (err) {
        console.error("❌ MongoDB Atlas Connection Error:", err);
    }
}

initMongoDB();

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: "Server is running" });
});

// 1. Account Registration (Create Account)
app.post('/api/register', async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;
        if (!emailOrPhone || !password) {
            return res.status(400).json({ success: false, message: "Email/Phone and password required" });
        }

        const existing = await usersCollection.findOne({ emailOrPhone: emailOrPhone.trim() });
        if (existing) {
            return res.json({ success: true, user: existing });
        }

        const newUser = {
            id: "usr_" + Date.now(),
            emailOrPhone: emailOrPhone.trim(),
            passwordHash: password,
            name: "",
            businessName: "",
            currencyCode: "INR",
            isProfileComplete: false,
            createdAt: Date.now()
        };

        await usersCollection.insertOne(newUser);
        console.log(`✅ MongoDB Atlas: Registered new user -> ${newUser.emailOrPhone}`);
        res.json({ success: true, user: newUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Account Login
app.post('/api/login', async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;
        const found = await usersCollection.findOne({
            emailOrPhone: emailOrPhone.trim(),
            passwordHash: password
        });

        if (found) {
            console.log(`✅ MongoDB Atlas: Login verified -> ${found.emailOrPhone}`);
            res.json({ success: true, user: found });
        } else {
            console.log(`❌ MongoDB Atlas: Login failed for -> ${emailOrPhone}`);
            res.json({ success: false, message: "User not found or invalid password" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Complete Profile & Currency Setup
app.post('/api/profile', async (req, res) => {
    try {
        const { emailOrPhone, name, businessName, currencyCode, upiId } = req.body;
        await usersCollection.updateOne(
            { emailOrPhone: emailOrPhone },
            {
                $set: {
                    name,
                    businessName,
                    currencyCode,
                    upiId: upiId || "",
                    isProfileComplete: true
                }
            },
            { upsert: true }
        );

        const updatedUser = await usersCollection.findOne({ emailOrPhone: emailOrPhone });
        console.log(`✅ MongoDB Atlas: Profile updated for ${name} (${emailOrPhone})`);
        res.json({ success: true, user: updatedUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== HOME ACCOUNTS ====================

app.post('/api/accounts', async (req, res) => {
    try {
        const acc = req.body;
        await accountsCollection.updateOne({ id: acc.id }, { $set: acc }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Account saved -> ${acc.title}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/accounts?emailOrPhone=user@email.com
app.get('/api/accounts', async (req, res) => {
    try {
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const accounts = await accountsCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${accounts.length} accounts for ${email}`);
        res.json({ success: true, accounts: accounts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/accounts/:id', async (req, res) => {
    try {
        await accountsCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted account ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== TRANSACTIONS ====================

app.post('/api/transactions', async (req, res) => {
    try {
        const tx = req.body;
        await transactionsCollection.updateOne({ id: tx.id }, { $set: tx }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Transaction saved -> ${tx.category} (${tx.amount})`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/transactions?emailOrPhone=user@email.com
app.get('/api/transactions', async (req, res) => {
    try {
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const transactions = await transactionsCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${transactions.length} transactions for ${email}`);
        res.json({ success: true, transactions: transactions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    try {
        await transactionsCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted transaction ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== CUSTOMERS ====================

app.post('/api/customers', async (req, res) => {
    try {
        const cust = req.body;
        await customersCollection.updateOne({ id: cust.id }, { $set: cust }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Customer saved -> ${cust.name}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/customers?emailOrPhone=user@email.com
app.get('/api/customers', async (req, res) => {
    try {
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const customers = await customersCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${customers.length} customers for ${email}`);
        res.json({ success: true, customers: customers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await customersCollection.deleteOne({ id: req.params.id });
        await ledgersCollection.deleteMany({ customerId: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted customer ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== CUSTOMER LEDGERS ====================

app.post('/api/customer_ledgers', async (req, res) => {
    try {
        const entry = req.body;
        await ledgersCollection.updateOne({ id: entry.id }, { $set: entry }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Customer ledger logged -> ${entry.amount}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/customer_ledgers?emailOrPhone=user@email.com
app.get('/api/customer_ledgers', async (req, res) => {
    try {
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const ledgers = await ledgersCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${ledgers.length} ledger entries for ${email}`);
        res.json({ success: true, ledgers: ledgers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== LOANS ====================

app.post('/api/loans', async (req, res) => {
    try {
        const loan = req.body;
        await loansCollection.updateOne({ id: loan.id }, { $set: loan }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Loan tracker saved -> ${loan.title}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/loans?emailOrPhone=user@email.com
app.get('/api/loans', async (req, res) => {
    try {
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const loans = await loansCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${loans.length} loans for ${email}`);
        res.json({ success: true, loans: loans });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/loans/:id', async (req, res) => {
    try {
        await loansCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted loan ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== REMINDERS ====================

app.post('/api/reminders', async (req, res) => {
    try {
        const reminder = req.body;
        await remindersCollection.updateOne({ id: reminder.id }, { $set: reminder }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Reminder saved for ${reminder.customerName} at ${reminder.scheduledTimeMillis}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/reminders?emailOrPhone=user@email.com
app.get('/api/reminders', async (req, res) => {
    try {
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const reminders = await remindersCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${reminders.length} reminders for ${email}`);
        res.json({ success: true, reminders: reminders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/reminders/:id  — mark as sent
app.put('/api/reminders/:id', async (req, res) => {
    try {
        await remindersCollection.updateOne(
            { id: req.params.id },
            { $set: { isSent: true, sentAt: Date.now() } }
        );
        console.log(`✅ MongoDB Atlas: Reminder ${req.params.id} marked as sent`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== EMPLOYEES ====================

app.post('/api/employees', async (req, res) => {
    try {
        const emp = req.body;
        await employeesCollection.updateOne({ id: emp.id }, { $set: emp }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Employee saved ${emp.name}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/employees', async (req, res) => {
    try {
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const employees = await employeesCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${employees.length} employees for ${email}`);
        res.json({ success: true, employees: employees });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    try {
        await employeesCollection.deleteOne({ id: req.params.id });
        await employeeTxCollection.deleteMany({ employeeId: req.params.id });
        console.log(`✅ MongoDB Atlas: Employee ${req.params.id} deleted`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== EMPLOYEE TRANSACTIONS ====================

app.post('/api/employee-transactions', async (req, res) => {
    try {
        const tx = req.body;
        await employeeTxCollection.updateOne({ id: tx.id }, { $set: tx }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Employee Tx saved ${tx.type} for employee ${tx.employeeId}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/employee-transactions', async (req, res) => {
    try {
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const txs = await employeeTxCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${txs.length} employee transactions for ${email}`);
        res.json({ success: true, employeeTransactions: txs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/employee-transactions/:id', async (req, res) => {
    try {
        await employeeTxCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Employee Tx ${req.params.id} deleted`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== PUBLIC WEB PASSBOOK STATEMENT ====================

app.get('/p/:customerId', async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const customer = await customersCollection.findOne({ id: customerId });
        
        if (!customer) {
            return res.status(404).send(`
                <!DOCTYPE html>
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
                </html>
            `);
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

        const shopUpiId = (req.query.upi || (owner && owner.upiId) || process.env.DEFAULT_UPI_ID || '').trim();
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
            const dateStr = entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
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

        // HTML Response
        res.send(`
<!DOCTYPE html>
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
</html>
        `);
    } catch (err) {
        console.error("❌ Error serving web passbook:", err);
        res.status(500).send("Server Error generating passbook statement.");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Finance Backend Server running on http://0.0.0.0:${PORT}`);
});

