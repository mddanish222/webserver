const { MongoClient } = require('mongodb');
const { MONGODB_URI } = require('./env');

const client = new MongoClient(MONGODB_URI);

let db = null;
const collections = {};

async function connectDB() {
    try {
        await client.connect();
        db = client.db("FinanceDB");

        collections.usersCollection = db.collection("users");
        collections.accountsCollection = db.collection("home_accounts");
        collections.transactionsCollection = db.collection("transactions");
        collections.customersCollection = db.collection("customers");
        collections.ledgersCollection = db.collection("customer_ledgers");
        collections.loansCollection = db.collection("loans");
        collections.remindersCollection = db.collection("reminders");
        collections.employeesCollection = db.collection("employees");
        collections.employeeTxCollection = db.collection("employee_transactions");

        console.log("⚡ Connected successfully to MongoDB Atlas Cloud Cluster!");
        console.log("📁 Database 'FinanceDB' active with collections: users, home_accounts, transactions, customers, customer_ledgers, loans, reminders, employees, employee_transactions");
        return db;
    } catch (err) {
        console.error("❌ MongoDB Atlas Connection Error:", err);
        throw err;
    }
}

function getCollections() {
    return collections;
}

function getDb() {
    return db;
}

module.exports = {
    connectDB,
    getCollections,
    getDb,
    client
};
