const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const sendEmail = require('../utils/sendEmail');
const { cacheSet, cacheDel } = require('../config/cache');
const logger = require('../config/logger');

const sendTokenResponse = async (user, statusCode, res, req) => {
  const token = user.getSignedJwtToken();
  const refreshToken = user.getRefreshToken();

  // Store refresh token
  if (!user.refreshTokens) user.refreshTokens = [];
  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > 5) user.refreshTokens.shift(); // keep max 5
  user.lastLogin = new Date();
  user.loginHistory.push({
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    success: true,
  });
  if (user.loginHistory.length > 20) user.loginHistory.shift();
  await user.save({ validateBeforeSave: false });

  const cookieOptions = {
    expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        preferences: user.preferences,
        usage: user.usage,
        limits: user.limits,
      },
    });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  let user = await User.findOne({ email });
  if (user) return next(new ErrorResponse('Email already registered', 400));

  user = await User.create({ name, email, password });

  // Send verification email
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Welcome to PlateDetect AI - Verify your email',
      template: 'verification',
      data: { name: user.name, verifyUrl },
    });
  } catch (err) {
    logger.warn('Verification email failed to send:', err.message);
  }

  sendTokenResponse(user, 201, res, req);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new ErrorResponse('Please provide email and password', 400));

  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user) return next(new ErrorResponse('Invalid credentials', 401));

  if (user.isLocked) {
    return next(new ErrorResponse(`Account locked until ${user.lockUntil.toLocaleString()}. Too many failed attempts.`, 423));
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    await user.incLoginAttempts();
    user.loginHistory.push({ ip: req.ip, userAgent: req.headers['user-agent'], success: false });
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  if (!user.isActive) return next(new ErrorResponse('Account is deactivated. Contact support.', 401));

  // Reset login attempts on success
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  sendTokenResponse(user, 200, res, req);
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
exports.logout = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: refreshToken },
    });
  }

  await cacheDel(`user:${req.user._id}`);

  res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, data: user });
});

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new ErrorResponse('Refresh token required', 400));

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return next(new ErrorResponse('Invalid refresh token', 401));
    }

    const newToken = user.getSignedJwtToken();
    const newRefreshToken = user.getRefreshToken();

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, token: newToken, refreshToken: newRefreshToken });
  } catch (err) {
    return next(new ErrorResponse('Invalid or expired refresh token', 401));
  }
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // Don't reveal if email exists
    return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'PlateDetect AI - Password Reset',
      template: 'resetPassword',
      data: { name: user.name, resetUrl },
    });
    res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) return next(new ErrorResponse('Invalid or expired reset token', 400));

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshTokens = []; // invalidate all sessions
  await user.save();

  await cacheDel(`user:${user._id}`);
  sendTokenResponse(user, 200, res, req);
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const emailVerificationToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) return next(new ErrorResponse('Invalid or expired verification token', 400));

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  res.status(200).json({ success: true, message: 'Email verified successfully' });
});

// @desc    Update password
// @route   PUT /api/v1/auth/update-password
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }
  user.password = req.body.newPassword;
  await user.save();
  await cacheDel(`user:${user._id}`);
  sendTokenResponse(user, 200, res, req);
});

// @desc    Generate API key
// @route   POST /api/v1/auth/generate-api-key
exports.generateApiKey = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const apiKey = user.generateApiKey();
  await user.save();
  res.status(200).json({ success: true, apiKey });
});
