const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/profile', authController.updateProfile);

// Staff management routes (Protected, Owner only)
router.post('/staff', authenticateToken, requireRole(['OWNER']), authController.createStaff);
router.get('/staff', authenticateToken, requireRole(['OWNER']), authController.getStaffMembers);
router.delete('/staff/:id', authenticateToken, requireRole(['OWNER']), authController.deleteStaffMember);
router.put('/staff/:id/permissions', authenticateToken, requireRole(['OWNER']), authController.updateStaffPermissions);

module.exports = router;
