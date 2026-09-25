const express = require('express');
const cors = require('cors');
const { PORT } = require('./src/config/env');
const { connectDB, client } = require('./src/config/db');
const requestLogger = require('./src/middleware/requestLogger');
const errorHandler = require('./src/middleware/errorHandler');

const apiRouter = require('./src/routes/index');
const publicRouter = require('./src/routes/public.routes');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routing Mounts
app.use('/api', apiRouter);
app.use('/p', publicRouter);

// Centralized Error Handling
app.use(errorHandler);

// Bootstrap Server
async function startServer() {
    try {
        await connectDB();
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Finance Backend Server running on http://0.0.0.0:${PORT}`);
        });

        const shutdown = async () => {
            console.log("\n🛑 Gracefully shutting down Finance Backend Server...");
            server.close(async () => {
                if (client) {
                    await client.close();
                    console.log("🔒 MongoDB connection closed.");
                }
                process.exit(0);
            });
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    } catch (err) {
        console.error("❌ Failed to start server:", err);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
