const { getCollections } = require('../config/db');
const { getTenantIdentifiers } = require('../middleware/auth.middleware');

async function saveReminder(req, res, next) {
    try {
        const { remindersCollection } = getCollections();
        const reminder = req.body;
        reminder.ownerId = req.user.ownerId || req.user.userId || req.user.id;
        reminder.userEmail = req.user.ownerEmail || req.user.emailOrPhone;
        reminder.updatedAt = Date.now();

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

async function updateReminder(req, res, next) {
    try {
        const { remindersCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        if (!tenantIds || tenantIds.length === 0) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }

        const body = req.body || {};
        const updateFields = { updatedAt: Date.now() };
        if (body.isSent !== undefined) {
            updateFields.isSent = Boolean(body.isSent);
            if (body.isSent) updateFields.sentAt = Date.now();
        }
        if (body.scheduledTimeMillis !== undefined) {
            updateFields.scheduledTimeMillis = Number(body.scheduledTimeMillis);
        }
        if (body.messageText !== undefined) {
            updateFields.messageText = String(body.messageText);
        }
        if (body.customerName !== undefined) {
            updateFields.customerName = String(body.customerName);
        }
        if (body.phoneNumber !== undefined) {
            updateFields.phoneNumber = String(body.phoneNumber);
        }
        if (Object.keys(updateFields).length === 1) {
            // Legacy empty-body PUT marks as sent
            updateFields.isSent = true;
            updateFields.sentAt = Date.now();
        }

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
            { $set: updateFields }
        );
        console.log(`✅ MongoDB Atlas: Reminder ${req.params.id} updated`);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

async function deleteReminder(req, res, next) {
    try {
        const { remindersCollection } = getCollections();
        const tenantIds = getTenantIdentifiers(req);
        if (!tenantIds || tenantIds.length === 0) {
            return res.status(401).json({ success: false, message: "Unauthorized." });
        }

        const result = await remindersCollection.deleteOne({
            id: req.params.id,
            $or: [
                { ownerId: { $in: tenantIds } },
                { userEmail: { $in: tenantIds } },
                { emailOrPhone: { $in: tenantIds } },
                { userId: { $in: tenantIds } }
            ]
        });

        console.log(`🗑️ MongoDB Atlas: Reminder ${req.params.id} deleted (count=${result.deletedCount})`);
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveReminder,
    getReminders,
    updateReminder,
    deleteReminder
};
