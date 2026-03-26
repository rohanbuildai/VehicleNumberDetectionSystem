const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { cacheGet, cacheSet } = require('../config/cache');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('./asyncHandler');
const logger = require('../config/logger');

// Protect routes - JWT auth
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try cache first
    const cacheKey = `user:${decoded.id}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      user = await User.findById(decoded.id).select('-password -refreshTokens');
      if (!user) {
        return next(new ErrorResponse('User not found', 401));
      }
      await cacheSet(cacheKey, user.toObject(), 300); // 5 min cache
    }

    if (!user.isActive) {
      return next(new ErrorResponse('Account is deactivated', 401));
    }

    if (user.isLocked) {
      return next(new ErrorResponse('Account is temporarily locked', 423));
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn('JWT verification failed:', err.message);
    if (err.name === 'TokenExpiredError') {
      return next(new ErrorResponse('Token expired, please login again', 401));
    }
    return next(new ErrorResponse('Not authorized, token invalid', 401));
  }
});

// API Key auth
const apiKeyAuth = asyncHandler(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return next();

  try {
    const cacheKey = `apikey:${apiKey}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      user = await User.findOne({ apiKey }).select('-password -refreshTokens');
      if (!user) {
        return next(new ErrorResponse('Invalid API key', 401));
      }
      await cacheSet(cacheKey, user.toObject(), 600);
    }

    if (!user.isActive) {
      return next(new ErrorResponse('Account is deactivated', 401));
    }

    req.user = user;
    req.isApiKeyAuth = true;
    next();
  } catch (err) {
    return next(new ErrorResponse('API key authentication failed', 401));
  }
});

// Combined auth (JWT or API key)
const auth = asyncHandler(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return apiKeyAuth(req, res, next);
  }
  return protect(req, res, next);
});

// Role authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`Role '${req.user.role}' is not authorized to access this route`, 403));
    }
    next();
  };
};

// Check usage limits
const checkUsageLimit = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  await user.resetMonthlyUsage();

  if (user.usage.detectionsThisMonth >= user.limits.detectionsPerMonth) {
    return next(new ErrorResponse(
      `Monthly detection limit of ${user.limits.detectionsPerMonth} reached. Upgrade your plan.`,
      429
    ));
  }

  req.userDoc = user;
  next();
});

module.exports = { protect, authorize, apiKeyAuth, auth, checkUsageLimit };
