require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Resilient JWT Secret resolution: accepts any user key or falls back safely to 60-char secure key
const resolvedJwtSecret = (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0)
    ? process.env.JWT_SECRET.trim()
    : "FinanceMaster_Secret_JwtKey_#2026_Enterprise_SecureAuthToken";

module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/FinanceDB",
    DEFAULT_UPI_ID: (process.env.DEFAULT_UPI_ID || '').trim(),
    JWT_SECRET: resolvedJwtSecret,
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || 'never'
};
