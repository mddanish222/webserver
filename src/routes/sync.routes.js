const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');

// Mobile Delta Sync Endpoint: GET /api/sync/delta?since=<timestamp>
router.get('/delta', syncController.getDelta);

module.exports = router;
