const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, refreshToken, forgotPassword, resetPassword, verifyEmail, updatePassword, generateApiKey } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

router.post('/register', authLimiter, [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validate, register);

router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, login);

router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.put('/reset-password/:token', [
  body('password').isLength({ min: 8 }),
], validate, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.put('/update-password', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], validate, updatePassword);
router.post('/generate-api-key', protect, generateApiKey);

module.exports = router;
