const { getCollections } = require('../config/db');

async function saveReminder(req, res, next) {
    try {
        const { remindersCollection } = getCollections();
        const reminder = req.body;
        await remindersCollection.updateOne({ id: reminder.id }, { $set: reminder }, { upsert: true });
        console.log(`✅ MongoDB Atlas: Reminder saved for ${reminder.customerName} at ${reminder.scheduledTimeMillis}`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function getReminders(req, res, next) {
    try {
        const { remindersCollection } = getCollections();
        const email = (req.query.emailOrPhone || req.query.userEmail || req.query.email || "").trim();
        const query = email ? { $or: [{ emailOrPhone: email }, { userEmail: email }] } : {};
        const reminders = await remindersCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${reminders.length} reminders for ${email}`);
        res.json({ success: true, reminders: reminders });
    } catch (err) {
        next(err);
    }
}

async function markReminderSent(req, res, next) {
    try {
        const { remindersCollection } = getCollections();
        await remindersCollection.updateOne(
            { id: req.params.id },
            { $set: { isSent: true, sentAt: Date.now() } }
        );
        console.log(`✅ MongoDB Atlas: Reminder ${req.params.id} marked as sent`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveReminder,
    getReminders,
    markReminderSent
};
