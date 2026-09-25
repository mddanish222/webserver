/**
 * Entrypoint for Finance Backend Server
 * Delegates to the modular server architecture in server.js
 */
const { startServer, app } = require('./server');

if (require.main === module) {
    startServer();
}

module.exports = app;
