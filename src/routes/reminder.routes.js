const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder.controller');

router.post('/', reminderController.saveReminder);
router.get('/', reminderController.getReminders);
router.put('/:id', reminderController.updateReminder);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;
