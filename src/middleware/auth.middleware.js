const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    let token = null;

    if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim();
        } else {
            token = authHeader.trim();
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication token missing. Please sign in to access your data."
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, emailOrPhone, role, ownerId, name }
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session token. Please sign in again."
        });
    }
}

function requireRole(allowedRoles = ['OWNER']) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        const userRole = req.user.role || 'OWNER';
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Permission denied. This operation requires ${allowedRoles.join(' or ')} privileges.`
            });
        }
        next();
    };
}

// Helper to determine the organization/tenant ID for querying
function getTenantId(req) {
    // If staff, their organization is their ownerId; if owner, their organization is their userId or emailOrPhone
    if (req.user && req.user.role === 'STAFF' && req.user.ownerId) {
        return req.user.ownerId;
    }
    return req.user ? (req.user.userId || req.user.id || req.user.emailOrPhone) : null;
}

// Helper to get tenant emails/identifiers for mongo $or query
function getTenantIdentifiers(req) {
    const ids = [];
    if (!req.user) return ids;

    if (req.user.role === 'STAFF' && req.user.ownerId) {
        ids.push(req.user.ownerId);
        if (req.user.ownerEmail) ids.push(req.user.ownerEmail);
    } else {
        if (req.user.userId) ids.push(req.user.userId);
        if (req.user.id) ids.push(req.user.id);
        if (req.user.emailOrPhone) ids.push(req.user.emailOrPhone);
    }
    return ids;
}

module.exports = {
    authenticateToken,
    requireRole,
    getTenantId,
    getTenantIdentifiers
};
