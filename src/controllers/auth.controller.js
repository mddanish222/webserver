const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getCollections } = require('../config/db');
const { JWT_SECRET } = require('../config/env');

function generateToken(user) {
    const payload = {
        userId: user.id,
        id: user.id,
        emailOrPhone: user.emailOrPhone,
        name: user.name || '',
        businessName: user.businessName || '',
        role: user.role || 'OWNER',
        ownerId: user.ownerId || user.id,
        ownerEmail: user.ownerEmail || user.emailOrPhone
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '60d' });
}

async function register(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const { emailOrPhone, password, name, businessName } = req.body;
        if (!emailOrPhone || !password) {
            return res.status(400).json({ success: false, message: "Email/Phone and password required" });
        }

        const cleanEmail = emailOrPhone.trim();
        const existing = await usersCollection.findOne({ emailOrPhone: cleanEmail });
        if (existing) {
            // If already registered, return with token
            const token = generateToken(existing);
            return res.json({
                success: true,
                message: "User already exists. Logged in successfully.",
                user: {
                    id: existing.id,
                    emailOrPhone: existing.emailOrPhone,
                    name: existing.name || '',
                    businessName: existing.businessName || '',
                    address: existing.address || '',
                    currencyCode: existing.currencyCode || 'INR',
                    upiId: existing.upiId || '',
                    role: existing.role || 'OWNER',
                    ownerId: existing.ownerId || existing.id,
                    isProfileComplete: existing.isProfileComplete || false,
                    token: token
                },
                token
            });
        }

        // Hash password with bcrypt (10 rounds)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            id: "usr_" + Date.now(),
            emailOrPhone: cleanEmail,
            passwordHash: hashedPassword,
            name: name || "",
            businessName: businessName || "",
            address: "",
            currencyCode: "INR",
            role: "OWNER",
            ownerId: "usr_" + Date.now(),
            isProfileComplete: false,
            createdAt: Date.now()
        };

        await usersCollection.insertOne(newUser);
        console.log(`✅ MongoDB Atlas: Registered new OWNER (bcrypt hashed) -> ${newUser.emailOrPhone}`);

        const token = generateToken(newUser);
        res.json({
            success: true,
            user: {
                id: newUser.id,
                emailOrPhone: newUser.emailOrPhone,
                name: newUser.name,
                businessName: newUser.businessName,
                address: newUser.address,
                currencyCode: newUser.currencyCode,
                upiId: "",
                role: newUser.role,
                ownerId: newUser.ownerId,
                isProfileComplete: newUser.isProfileComplete,
                token: token
            },
            token
        });
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const { emailOrPhone, password } = req.body;
        if (!emailOrPhone || !password) {
            return res.status(400).json({ success: false, message: "Credentials missing" });
        }

        const cleanInput = emailOrPhone.trim();
        const found = await usersCollection.findOne({
            $or: [
                { emailOrPhone: cleanInput },
                { id: cleanInput }
            ]
        });

        if (!found) {
            console.log(`❌ MongoDB Atlas: User not found -> ${cleanInput}`);
            return res.status(401).json({ success: false, message: "User not found or invalid credentials" });
        }

        // Verify password using bcrypt or legacy plain-text fallback
        let isMatch = false;
        const storedHash = found.passwordHash || "";

        if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
            isMatch = await bcrypt.compare(password, storedHash);
        } else {
            // Legacy plain-text fallback
            if (storedHash === password) {
                isMatch = true;
                // Auto-upgrade legacy password to bcrypt hash in the database
                try {
                    const salt = await bcrypt.genSalt(10);
                    const upgradedHash = await bcrypt.hash(password, salt);
                    await usersCollection.updateOne({ _id: found._id }, { $set: { passwordHash: upgradedHash } });
                    console.log(`🔒 Auto-upgraded user ${found.emailOrPhone} password to secure bcrypt hash`);
                } catch (migrateErr) {
                    console.error("Notice password migration:", migrateErr.message);
                }
            }
        }

        if (!isMatch) {
            console.log(`❌ MongoDB Atlas: Password mismatch for -> ${cleanInput}`);
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        console.log(`✅ MongoDB Atlas: Login verified -> ${found.emailOrPhone} (Role: ${found.role || 'OWNER'})`);
        const token = generateToken(found);

        res.json({
            success: true,
            user: {
                id: found.id,
                emailOrPhone: found.emailOrPhone,
                name: found.name || "",
                businessName: found.businessName || "",
                address: found.address || "",
                currencyCode: found.currencyCode || "INR",
                upiId: found.upiId || "",
                role: found.role || "OWNER",
                staffRoleTitle: found.staffRoleTitle || (found.role === "STAFF" ? "Cashier" : "Owner"),
                ownerId: found.ownerId || found.id,
                ownerEmail: found.ownerEmail || found.emailOrPhone,
                permissions: found.permissions || null,
                isProfileComplete: found.isProfileComplete || false,
                token: token
            },
            token
        });
    } catch (err) {
        next(err);
    }
}

async function updateProfile(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const { emailOrPhone, name, businessName, address, currencyCode, upiId } = req.body;
        const targetEmail = (emailOrPhone || (req.user && req.user.emailOrPhone) || "").trim();

        if (!targetEmail) {
            return res.status(400).json({ success: false, message: "Email required for profile update" });
        }

        await usersCollection.updateOne(
            { emailOrPhone: targetEmail },
            {
                $set: {
                    name: name || "",
                    businessName: businessName || "",
                    address: address || "",
                    currencyCode: currencyCode || "INR",
                    upiId: upiId || "",
                    isProfileComplete: true
                }
            },
            { upsert: true }
        );

        const updatedUser = await usersCollection.findOne({ emailOrPhone: targetEmail });
        console.log(`✅ MongoDB Atlas: Profile updated for ${name} (${targetEmail})`);
        
        const token = generateToken(updatedUser);
        res.json({
            success: true,
            user: {
                id: updatedUser.id,
                emailOrPhone: updatedUser.emailOrPhone,
                name: updatedUser.name,
                businessName: updatedUser.businessName,
                address: updatedUser.address,
                currencyCode: updatedUser.currencyCode,
                upiId: updatedUser.upiId,
                role: updatedUser.role || "OWNER",
                ownerId: updatedUser.ownerId || updatedUser.id,
                isProfileComplete: true,
                token: token
            },
            token
        });
    } catch (err) {
        next(err);
    }
}

// ── Staff Management Endpoints (Owner Only) ──────────────────────────
async function createStaff(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const owner = req.user; // Authenticated owner
        const { staffName, staffPhoneOrEmail, staffPin, staffRole, permissions } = req.body;

        if (!staffName || !staffPhoneOrEmail || !staffPin) {
            return res.status(400).json({ success: false, message: "Staff name, phone/email, and PIN are required." });
        }

        const cleanInput = staffPhoneOrEmail.trim();
        const existing = await usersCollection.findOne({ emailOrPhone: cleanInput });
        if (existing) {
            return res.status(400).json({ success: false, message: `An account with ${cleanInput} already exists.` });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(staffPin.trim(), salt);

        // Default permissions: everything restricted/off by default for security
        const defaultPermissions = {
            canViewEmployeeWages: false,
            canViewSupplierKhata: false,
            canViewCostPrice: false,
            canDeleteTransactions: false,
        };
        const staffPermissions = permissions ? { ...defaultPermissions, ...permissions } : defaultPermissions;

        const staffUser = {
            id: "stf_" + Date.now(),
            emailOrPhone: cleanInput,
            passwordHash: hashedPin,
            name: staffName.trim(),
            businessName: owner.businessName || "Shop",
            address: "",
            currencyCode: "INR",
            role: "STAFF",
            staffRoleTitle: staffRole || "Cashier",
            ownerId: owner.userId || owner.id,
            ownerEmail: owner.emailOrPhone,
            permissions: staffPermissions,
            isProfileComplete: true,
            createdAt: Date.now()
        };

        await usersCollection.insertOne(staffUser);
        console.log(`✅ MongoDB Atlas: Owner ${owner.emailOrPhone} created STAFF ${staffName} (${cleanInput})`);

        res.json({
            success: true,
            message: `Staff member ${staffName} created successfully.`,
            staff: {
                id: staffUser.id,
                name: staffUser.name,
                emailOrPhone: staffUser.emailOrPhone,
                role: staffUser.role,
                staffRoleTitle: staffUser.staffRoleTitle,
                ownerId: staffUser.ownerId,
                permissions: staffUser.permissions,
                createdAt: staffUser.createdAt
            }
        });
    } catch (err) {
        next(err);
    }
}

async function getStaffMembers(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const owner = req.user;
        const ownerId = owner.userId || owner.id;

        const staffList = await usersCollection.find({
            role: "STAFF",
            $or: [
                { ownerId: ownerId },
                { ownerEmail: owner.emailOrPhone }
            ]
        }).project({ passwordHash: 0 }).toArray();

        res.json({ success: true, staff: staffList });
    } catch (err) {
        next(err);
    }
}

async function deleteStaffMember(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const owner = req.user;
        const staffId = req.params.id;
        const ownerId = owner.userId || owner.id;

        const result = await usersCollection.deleteOne({
            id: staffId,
            role: "STAFF",
            $or: [
                { ownerId: ownerId },
                { ownerEmail: owner.emailOrPhone }
            ]
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Staff member not found or permission denied." });
        }

        console.log(`✅ MongoDB Atlas: Owner ${owner.emailOrPhone} deleted STAFF ${staffId}`);
        res.json({ success: true, message: "Staff member removed." });
    } catch (err) {
        next(err);
    }
}

async function updateStaffPermissions(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const owner = req.user;
        const staffId = req.params.id;
        const ownerId = owner.userId || owner.id;
        const { permissions } = req.body;

        if (!permissions || typeof permissions !== 'object') {
            return res.status(400).json({ success: false, message: "Permissions object required." });
        }

        const sanitized = {
            canViewEmployeeWages: Boolean(permissions.canViewEmployeeWages),
            canViewSupplierKhata: Boolean(permissions.canViewSupplierKhata),
            canViewCostPrice: Boolean(permissions.canViewCostPrice),
            canDeleteTransactions: Boolean(permissions.canDeleteTransactions),
        };

        const result = await usersCollection.updateOne(
            {
                id: staffId,
                role: "STAFF",
                $or: [{ ownerId: ownerId }, { ownerEmail: owner.emailOrPhone }]
            },
            { $set: { permissions: sanitized } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Staff member not found or permission denied." });
        }

        console.log(`✅ MongoDB Atlas: Owner ${owner.emailOrPhone} updated permissions for STAFF ${staffId}`);
        res.json({ success: true, message: "Staff permissions updated.", permissions: sanitized });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    register,
    login,
    updateProfile,
    createStaff,
    getStaffMembers,
    deleteStaffMember,
    updateStaffPermissions
};
