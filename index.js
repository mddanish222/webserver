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
        const { emailOrPhone, name, businessName, currencyCode } = req.body;
        await usersCollection.updateOne(
            { emailOrPhone: emailOrPhone },
            {
                $set: {
                    name,
                    businessName,
                    currencyCode,
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Finance Backend Server running on http://0.0.0.0:${PORT}`);
});
