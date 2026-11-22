require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://noor04aysha_db_user:SFQdNBtEEEaPdliG@moneymanager.lbu1gkg.mongodb.net/FinanceDB?retryWrites=true&w=majority",
    DEFAULT_UPI_ID: (process.env.DEFAULT_UPI_ID || '').trim(),
    JWT_SECRET: process.env.JWT_SECRET || "FinanceMaster_Secret_JwtKey_#2026_Enterprise_SecureAuthToken"
};
