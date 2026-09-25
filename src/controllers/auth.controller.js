const { getCollections } = require('../config/db');

async function register(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const { emailOrPhone, password } = req.body;
        if (!emailOrPhone || !password) {
            return res.status(400).json({ success: false, message: "Email/Phone and password required" });
        }

        const existing = await usersCollection.findOne({ emailOrPhone: emailOrPhone.trim() });
        if (existing) {
            return res.json({ success: true, user: existing });
        }

        const newUser = {
            id: "usr_" + Date.now(),
            emailOrPhone: emailOrPhone.trim(),
            passwordHash: password,
            name: "",
            businessName: "",
            currencyCode: "INR",
            isProfileComplete: false,
            createdAt: Date.now()
        };

        await usersCollection.insertOne(newUser);
        console.log(`✅ MongoDB Atlas: Registered new user -> ${newUser.emailOrPhone}`);
        res.json({ success: true, user: newUser });
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const { emailOrPhone, password } = req.body;
        const found = await usersCollection.findOne({
            emailOrPhone: emailOrPhone.trim(),
            passwordHash: password
        });

        if (found) {
            console.log(`✅ MongoDB Atlas: Login verified -> ${found.emailOrPhone}`);
            res.json({ success: true, user: found });
        } else {
            console.log(`❌ MongoDB Atlas: Login failed for -> ${emailOrPhone}`);
            res.json({ success: false, message: "User not found or invalid password" });
        }
    } catch (err) {
        next(err);
    }
}

async function updateProfile(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const { emailOrPhone, name, businessName, currencyCode, upiId } = req.body;
        await usersCollection.updateOne(
            { emailOrPhone: emailOrPhone },
            {
                $set: {
                    name,
                    businessName,
                    currencyCode,
                    upiId: upiId || "",
                    isProfileComplete: true
                }
            },
            { upsert: true }
        );

        const updatedUser = await usersCollection.findOne({ emailOrPhone: emailOrPhone });
        console.log(`✅ MongoDB Atlas: Profile updated for ${name} (${emailOrPhone})`);
        res.json({ success: true, user: updatedUser });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    register,
    login,
    updateProfile
};
