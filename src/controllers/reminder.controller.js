const { getCollections } = require('../config/db');
const { getTenantIdentifiers } = require('../middleware/auth.middleware');

async function saveReminder(req, res, next) {
    try {
        const { remindersCollection } = getCollections();
        const reminder = req.body;
        reminder.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        reminder.userEmail = req.user.ownerEmail || req.user.emailOrPhone;

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
        const tenantIds = getTenantIdentifiers(req);

        if (!tenantIds || tenantIds.length === 0) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }

        const query = {
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        };

        const reminders = await remindersCollection.find(query).toArray();
        console.log(`✅ MongoDB Atlas: Fetched ${reminders.length} scoped reminders for tenant [${tenantIds.join(', ')}]`);
        res.json({ success: true, reminders: reminders });
    } catch (err) {
        next(err);
    }
}

async function markReminderSent(req, res, next) {
    try {
        const { remindersCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);

        await remindersCollection.updateOne(
            {
                id: req.params.id,
                $or: [
                    { ownerId: { $in: tenantIds } },
                    { userEmail: { $in: tenantIds } },
                    { emailOrPhone: { $in: tenantIds } },
                    { userId: { $in: tenantIds } }
                ]
            },
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
