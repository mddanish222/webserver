require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Strict Fail-Fast Validation: Never allow unconfigured deployments in production
if (isProduction && !process.env.MONGODB_URI) {
    console.error("FATAL: MONGODB_URI environment variable must be set in production.");
    process.exit(1);
}

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    console.error("FATAL: JWT_SECRET must be set and at least 32 characters in production.");
    process.exit(1);
}

module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/FinanceDB",
    DEFAULT_UPI_ID: (process.env.DEFAULT_UPI_ID || '').trim(),
    JWT_SECRET: process.env.JWT_SECRET || "FinanceMaster_Secret_JwtKey_#2026_Enterprise_SecureAuthToken",
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '7d'
};
