require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI || "mongodb+srv://noor04aysha_db_user:SFQdNBtEEEaPdliG@moneymanager.lbu1gkg.mongodb.net/FinanceDB?retryWrites=true&w=majority";
const client = new MongoClient(mongoUri);

let db, usersCollection, accountsCollection, transactionsCollection, customersCollection, ledgersCollection, loansCollection;

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

        console.log("⚡ Connected successfully to MongoDB Atlas Cloud Cluster!");
        console.log("📁 Database 'FinanceDB' active with collections: users, home_accounts, transactions, customers, customer_ledgers, loans");
    } catch (err) {
        console.error("❌ MongoDB Atlas Connection Error:", err);
    }
}

initMongoDB();

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

// Transactions Sync
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

app.delete('/api/transactions/:id', async (req, res) => {
    try {
        await transactionsCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted transaction ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Customers Sync
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

// Customer Ledgers Sync
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

// Loans Sync
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

app.delete('/api/loans/:id', async (req, res) => {
    try {
        await loansCollection.deleteOne({ id: req.params.id });
        console.log(`✅ MongoDB Atlas: Deleted loan ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Finance Backend Server running on http://0.0.0.0:${PORT}`);
});
