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
        const lowerInput = cleanInput.toLowerCase();
        const found = await usersCollection.findOne({
            $or: [
                { username: lowerInput },
                { emailOrPhone: cleanInput },
                { emailOrPhone: lowerInput },
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

        // If staff user, seamlessly inherit the owner's live business profile (Shop Name, GSTIN, Address, Bank, etc.)
        if (found.role === 'STAFF') {
            const ownerDoc = await usersCollection.findOne({
                $or: [
                    { id: found.ownerId },
                    { emailOrPhone: found.ownerEmail },
                    { emailOrPhone: found.ownerId }
                ]
            });
            if (ownerDoc) {
                found.businessName = ownerDoc.businessName || found.businessName || "";
                found.address = ownerDoc.address || found.address || "";
                found.currencyCode = ownerDoc.currencyCode || found.currencyCode || "INR";
                found.upiId = ownerDoc.upiId || found.upiId || "";
                found.gstin = ownerDoc.gstin || found.gstin || "";
                found.bankName = ownerDoc.bankName || found.bankName || "";
                found.bankAccountNumber = ownerDoc.bankAccountNumber || found.bankAccountNumber || "";
                found.bankIfsc = ownerDoc.bankIfsc || found.bankIfsc || "";
                found.bankBranch = ownerDoc.bankBranch || found.bankBranch || "";
                found.showStaffAuditBadge = ownerDoc.showStaffAuditBadge !== undefined ? ownerDoc.showStaffAuditBadge : true;
            }
        }

        const token = generateToken(found);

        res.json({
            success: true,
            user: {
                id: found.id,
                emailOrPhone: found.emailOrPhone,
                username: found.username || found.emailOrPhone || "",
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

        // If the updated user is an Owner, propagate the updated business details to all staff members
        if (updatedUser && updatedUser.role !== 'STAFF') {
            const ownerId = updatedUser.userId || updatedUser.id;
            const ownerEmail = updatedUser.emailOrPhone;
            const staffSyncFields = {
                businessName: updatedUser.businessName || "",
                address: updatedUser.address || "",
                currencyCode: updatedUser.currencyCode || "INR",
                upiId: updatedUser.upiId || "",
                gstin: updatedUser.gstin || "",
                bankName: updatedUser.bankName || "",
                bankAccountNumber: updatedUser.bankAccountNumber || "",
                bankIfsc: updatedUser.bankIfsc || "",
                bankBranch: updatedUser.bankBranch || "",
                showStaffAuditBadge: updatedUser.showStaffAuditBadge !== undefined ? updatedUser.showStaffAuditBadge : true
            };
            await usersCollection.updateMany(
                {
                    role: "STAFF",
                    $or: [
                        { ownerId: ownerId },
                        { ownerEmail: ownerEmail },
                        { ownerId: ownerEmail }
                    ]
                },
                { $set: staffSyncFields }
            );
            console.log(`⚡ MongoDB Atlas: Real-time synced owner profile to all staff under ${ownerEmail}`);
        }
        
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
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findGlobalUsernameConflict(usersCollection, rawUsername, excludeStaffId = null) {
    const clean = rawUsername.trim().toLowerCase();
    const ciRegex = new RegExp(`^${escapeRegex(clean)}$`, 'i');
    const matchExpr = {
        $or: [
            { username: clean },
            { username: ciRegex },
            { emailOrPhone: clean },
            { emailOrPhone: ciRegex }
        ]
    };
    if (excludeStaffId) {
        return usersCollection.findOne({
            $and: [
                { id: { $ne: excludeStaffId } },
                matchExpr
            ]
        });
    }
    return usersCollection.findOne(matchExpr);
}

async function generateUniqueUsernameSuggestions(usersCollection, raw) {
    const clean = raw.trim().toLowerCase();
    const candidates = [];

    // 1. If ends with digits (e.g. md124 -> md125, md126, md1240), offer close numeric variants
    const numMatch = clean.match(/^(.*?)(\d+)$/);
    if (numMatch) {
        const prefix = numMatch[1];
        const baseNum = parseInt(numMatch[2], 10);
        if (!Number.isNaN(baseNum)) {
            candidates.push(`${prefix}${baseNum + 1}`);
            candidates.push(`${prefix}${baseNum + 2}`);
        }
        if (prefix.length >= 2) {
            candidates.push(`${prefix}_${numMatch[2]}`);
        }
    }

    // 2. Classic Instagram-style suffixes & separators
    const yr = new Date().getFullYear().toString().slice(-2);
    candidates.push(
        `${clean}_01`,
        `${clean}_1`,
        `${clean}_${yr}`,
        `${clean}_shop`,
        `${clean}_staff`,
        `${clean}_pro`,
        `its_${clean}`,
        `${clean}_${Math.floor(10 + Math.random() * 89)}`,
        `${clean}${Math.floor(100 + Math.random() * 899)}`
    );

    const uniqueOrdered = [];
    for (const c of candidates) {
        if (c && c !== clean && /^[a-z0-9_]{3,30}$/.test(c) && !uniqueOrdered.includes(c)) {
            uniqueOrdered.push(c);
        }
    }

    if (uniqueOrdered.length === 0) return [];

    // Single batch query to filter out all already-taken candidates across all shops
    const existingDocs = await usersCollection.find({
        $or: [
            { username: { $in: uniqueOrdered } },
            { emailOrPhone: { $in: uniqueOrdered } }
        ]
    }).project({ username: 1, emailOrPhone: 1 }).toArray();

    const takenSet = new Set();
    for (const doc of existingDocs) {
        if (doc.username) takenSet.add(String(doc.username).trim().toLowerCase());
        if (doc.emailOrPhone) takenSet.add(String(doc.emailOrPhone).trim().toLowerCase());
    }

    return uniqueOrdered.filter(c => !takenSet.has(c)).slice(0, 5);
}

async function checkStaffUsername(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const raw = (req.params.username || "").trim().toLowerCase();
        const excludeId = req.query.excludeId ? String(req.query.excludeId).trim() : null;

        if (!raw || raw.length < 3) {
            return res.status(400).json({
                success: false,
                available: false,
                message: "Username must be at least 3 characters.",
                suggestions: []
            });
        }

        // Only lowercase alphanumeric and underscores
        if (!/^[a-z0-9_]+$/.test(raw)) {
            return res.status(400).json({
                success: false,
                available: false,
                message: "Only lowercase letters, numbers, and underscores (_) allowed.",
                suggestions: []
            });
        }

        const existing = await findGlobalUsernameConflict(usersCollection, raw, excludeId);

        if (!existing) {
            return res.json({
                success: true,
                available: true,
                message: `@${raw} is available!`,
                suggestions: []
            });
        }

        const availableSuggestions = await generateUniqueUsernameSuggestions(usersCollection, raw);

        return res.json({
            success: true,
            available: false,
            message: `@${raw} is already taken. Try one below:`,
            suggestions: availableSuggestions
        });
    } catch (err) {
        next(err);
    }
}

async function createStaff(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const owner = req.user; // Authenticated owner
        const { staffName, staffUsername, staffPhoneOrEmail, staffPin, staffRole, permissions } = req.body;

        const rawUsername = (staffUsername || staffPhoneOrEmail || "").trim().toLowerCase();

        if (!staffName || !rawUsername || !staffPin) {
            return res.status(400).json({ success: false, message: "Staff name, unique username, and PIN are required." });
        }

        if (rawUsername.length < 3 || !/^[a-z0-9_]+$/.test(rawUsername)) {
            return res.status(400).json({
                success: false,
                message: "Username must be at least 3 characters (letters, numbers, and _ only)."
            });
        }

        // Verify across entire database that username does not conflict with any shop or user
        const existing = await findGlobalUsernameConflict(usersCollection, rawUsername);

        if (existing) {
            const suggestions = await generateUniqueUsernameSuggestions(usersCollection, rawUsername);
            return res.status(409).json({
                success: false,
                available: false,
                code: "USERNAME_TAKEN",
                message: `@${rawUsername} is already taken. Please choose another username.`,
                suggestions
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(staffPin.trim(), salt);

        // Granular permissions with customer khata and billing enabled by default
        const defaultPermissions = {
            canViewCustomerKhata: true,
            canViewSupplierKhata: false,
            canViewEmployeeWages: false,
            canViewCostPrice: false,
            canViewSalesAndProfit: false,
            canCreateBills: true,
            canDeleteTransactions: false,
        };
        const staffPermissions = permissions ? { ...defaultPermissions, ...permissions } : defaultPermissions;

        const staffUser = {
            id: "stf_" + Date.now(),
            username: rawUsername,
            emailOrPhone: rawUsername,
            passwordHash: hashedPin,
            name: staffName.trim(),
            businessName: owner.businessName || "Shop",
            address: "",
            currencyCode: "INR",
            role: "STAFF",
            staffRoleTitle: (staffRole || "Cashier").trim() || "Cashier",
            ownerId: owner.userId || owner.id,
            ownerEmail: owner.emailOrPhone,
            permissions: staffPermissions,
            isProfileComplete: true,
            createdAt: Date.now()
        };

        try {
            await usersCollection.insertOne(staffUser);
        } catch (insertErr) {
            if (insertErr && insertErr.code === 11000) {
                const suggestions = await generateUniqueUsernameSuggestions(usersCollection, rawUsername);
                return res.status(409).json({
                    success: false,
                    available: false,
                    code: "USERNAME_TAKEN",
                    message: `@${rawUsername} is already taken. Please choose another username.`,
                    suggestions
                });
            }
            throw insertErr;
        }
        console.log(`✅ MongoDB Atlas: Owner ${owner.emailOrPhone} created STAFF ${staffName} (Username: ${rawUsername})`);

        res.json({
            success: true,
            message: `Staff member ${staffName} created successfully.`,
            staff: {
                id: staffUser.id,
                name: staffUser.name,
                username: staffUser.username,
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

async function updateStaffMember(req, res, next) {
    try {
        const { usersCollection } = getCollections();
        const owner = req.user;
        const staffId = req.params.id;
        const ownerId = owner.userId || owner.id;
        const { staffName, staffUsername, staffRole } = req.body;

        const cleanName = (staffName || "").trim();
        const rawUsername = (staffUsername || "").trim().toLowerCase();
        const cleanRole = (staffRole || "Cashier").trim() || "Cashier";

        if (!cleanName || !rawUsername) {
            return res.status(400).json({ success: false, message: "Staff name and username are required." });
        }

        if (rawUsername.length < 3 || !/^[a-z0-9_]+$/.test(rawUsername)) {
            return res.status(400).json({
                success: false,
                message: "Username must be at least 3 characters (letters, numbers, and _ only)."
            });
        }

        const targetStaff = await usersCollection.findOne({
            id: staffId,
            role: "STAFF",
            $or: [{ ownerId: ownerId }, { ownerEmail: owner.emailOrPhone }, { ownerId: owner.emailOrPhone }]
        });

        if (!targetStaff) {
            return res.status(404).json({ success: false, message: "Staff member not found or permission denied." });
        }

        const conflict = await findGlobalUsernameConflict(usersCollection, rawUsername, staffId);
        if (conflict) {
            const suggestions = await generateUniqueUsernameSuggestions(usersCollection, rawUsername);
            return res.status(409).json({
                success: false,
                available: false,
                code: "USERNAME_TAKEN",
                message: `@${rawUsername} is already taken. Please choose another username.`,
                suggestions
            });
        }

        const usernameChanged = (targetStaff.username || targetStaff.emailOrPhone || "").trim().toLowerCase() !== rawUsername;
        const updateOps = {
            $set: {
                name: cleanName,
                username: rawUsername,
                emailOrPhone: rawUsername,
                staffRoleTitle: cleanRole,
                updatedAt: Date.now()
            }
        };
        if (usernameChanged) {
            updateOps.$inc = { tokenVersion: 1 };
        }

        try {
            await usersCollection.updateOne({ id: staffId, role: "STAFF" }, updateOps);
        } catch (updateErr) {
            if (updateErr && updateErr.code === 11000) {
                const suggestions = await generateUniqueUsernameSuggestions(usersCollection, rawUsername);
                return res.status(409).json({
                    success: false,
                    available: false,
                    code: "USERNAME_TAKEN",
                    message: `@${rawUsername} is already taken. Please choose another username.`,
                    suggestions
                });
            }
            throw updateErr;
        }

        const updated = await usersCollection.findOne({ id: staffId, role: "STAFF" }, { projection: { passwordHash: 0 } });
        console.log(`✅ MongoDB Atlas: Owner ${owner.emailOrPhone} updated STAFF ${staffId} (@${rawUsername})`);
        res.json({
            success: true,
            message: `Staff member '${cleanName}' updated.`,
            staff: updated
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

        const normalized = staffList.map(s => ({
            ...s,
            username: s.username || s.emailOrPhone || ""
        }));

        res.json({ success: true, staff: normalized });
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

        let result = await usersCollection.deleteOne({
            id: staffId,
            role: "STAFF",
            $or: [
                { ownerId: ownerId },
                { ownerEmail: owner.emailOrPhone },
                { ownerId: owner.emailOrPhone }
            ]
        });

        if (result.deletedCount === 0) {
            // Also try fallback by id and role
            result = await usersCollection.deleteOne({ id: staffId, role: "STAFF" });
        }

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
            canViewSalesAndProfit: Boolean(permissions.canViewSalesAndProfit),
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
    checkStaffUsername,
    createStaff,
    updateStaffMember,
    getStaffMembers,
    deleteStaffMember,
    updateStaffPermissions,
    resetStaffPin
};
