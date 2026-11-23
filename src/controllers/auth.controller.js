const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getCollections } = require('../config/db');
const { JWT_SECRET, JWT_ACCESS_EXPIRY } = require('../config/env');

function generateToken(user) {
    const payload = {
        userId: user.id,
        id: user.id,
        emailOrPhone: user.emailOrPhone,
        name: user.name || '',
        businessName: user.businessName || '',
        role: user.role || 'OWNER',
        ownerId: user.ownerId || user.id,
        ownerEmail: user.ownerEmail || user.emailOrPhone,
        tokenVersion: user.tokenVersion || 1
    };
    if (JWT_ACCESS_EXPIRY && JWT_ACCESS_EXPIRY !== 'never' && JWT_ACCESS_EXPIRY !== 'forever') {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
    }
    // Permanent session: Stays logged in indefinitely until manual logout or tokenVersion revocation
    return jwt.sign(payload, JWT_SECRET);
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
                gstin: found.gstin || "",
                bankName: found.bankName || "",
                bankAccountNumber: found.bankAccountNumber || "",
                bankIfsc: found.bankIfsc || "",
                bankBranch: found.bankBranch || "",
                showStaffAuditBadge: found.showStaffAuditBadge !== undefined ? found.showStaffAuditBadge : true,
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
        const {
            emailOrPhone,
            name,
            businessName,
            address,
            currencyCode,
            upiId,
            gstin,
            bankName,
            bankAccountNumber,
            bankIfsc,
            bankBranch,
            showStaffAuditBadge
        } = req.body;
        const targetEmail = (emailOrPhone || (req.user && req.user.emailOrPhone) || "").trim();

        if (!targetEmail) {
            return res.status(400).json({ success: false, message: "Email required for profile update" });
        }

        const updateFields = {
            name: name || "",
            businessName: businessName || "",
            address: address || "",
            currencyCode: currencyCode || "INR",
            upiId: upiId || "",
            isProfileComplete: true
        };
        if (gstin !== undefined) updateFields.gstin = gstin.trim();
        if (bankName !== undefined) updateFields.bankName = bankName.trim();
        if (bankAccountNumber !== undefined) updateFields.bankAccountNumber = bankAccountNumber.trim();
        if (bankIfsc !== undefined) updateFields.bankIfsc = bankIfsc.trim();
        if (bankBranch !== undefined) updateFields.bankBranch = bankBranch.trim();
        if (showStaffAuditBadge !== undefined) updateFields.showStaffAuditBadge = Boolean(showStaffAuditBadge);

        await usersCollection.updateOne(
            { emailOrPhone: targetEmail },
            { $set: updateFields },
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
                gstin: updatedUser.gstin || "",
                bankName: updatedUser.bankName || "",
                bankAccountNumber: updatedUser.bankAccountNumber || "",
                bankIfsc: updatedUser.bankIfsc || "",
                bankBranch: updatedUser.bankBranch || "",
                showStaffAuditBadge: updatedUser.showStaffAuditBadge !== undefined ? updatedUser.showStaffAuditBadge : true,
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

        // Default permissions: Customer khata and billing enabled by default, rest restricted
        const defaultPermissions = {
            canViewCustomerKhata: true,
            canViewSupplierKhata: false,
            canViewEmployeeWages: false,
            canViewCostPrice: false,
            canCreateBills: true,
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
            canViewCustomerKhata: permissions.canViewCustomerKhata !== undefined ? Boolean(permissions.canViewCustomerKhata) : true,
            canViewSupplierKhata: Boolean(permissions.canViewSupplierKhata),
            canViewEmployeeWages: Boolean(permissions.canViewEmployeeWages),
            canViewCostPrice: Boolean(permissions.canViewCostPrice),
            canCreateBills: permissions.canCreateBills !== undefined ? Boolean(permissions.canCreateBills) : true,
            canDeleteTransactions: Boolean(permissions.canDeleteTransactions),
        };

        const result = await usersCollection.updateOne(
            {
                id: staffId,
                role: "STAFF",
                $or: [{ ownerId: ownerId }, { ownerEmail: owner.emailOrPhone }]
            },
            {
                $set: { permissions: sanitized },
                $inc: { tokenVersion: 1 }
            }
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

async function resetStaffPin(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const owner = req.user;
        const staffId = req.params.id;
        const { newPin } = req.body;
        const ownerId = owner.userId || owner.id;

        if (!newPin || newPin.trim().length < 4) {
            return res.status(400).json({ success: false, message: "New PIN must be at least 4 digits" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(newPin.trim(), salt);

        const result = await usersCollection.updateOne(
            {
                id: staffId,
                role: "STAFF",
                $or: [{ ownerId: ownerId }, { ownerEmail: owner.emailOrPhone }]
            },
            {
                $set: { passwordHash: hashedPin, pinUpdatedBy: owner.emailOrPhone, pinUpdatedAt: Date.now() },
                $inc: { tokenVersion: 1 }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Staff member not found or permission denied." });
        }

        console.log(`🔒 Owner ${owner.emailOrPhone} reset PIN for STAFF ${staffId}`);
        res.json({ success: true, message: "Staff PIN reset successfully." });
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
    updateStaffPermissions,
    resetStaffPin
};
