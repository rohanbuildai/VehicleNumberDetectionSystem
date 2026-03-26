const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  },
  avatar: {
    type: String,
    default: null,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    select: false,
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  },
  usage: {
    detectionsThisMonth: { type: Number, default: 0 },
    totalDetections: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }, // bytes
    lastReset: { type: Date, default: Date.now },
  },
  limits: {
    detectionsPerMonth: { type: Number, default: 50 },
    maxFileSize: { type: Number, default: 5242880 }, // 5MB
    storageLimit: { type: Number, default: 104857600 }, // 100MB
  },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  refreshTokens: [{ type: String, select: false }],
  lastLogin: Date,
  loginHistory: [{
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
    success: Boolean,
  }],
  preferences: {
    notifications: { type: Boolean, default: true },
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    language: { type: String, default: 'en' },
    defaultProcessing: {
      enhanceContrast: { type: Boolean, default: true },
      denoising: { type: Boolean, default: true },
      sharpening: { type: Boolean, default: true },
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
userSchema.index({ createdAt: -1 });

// Virtual
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save: hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Sign JWT
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Sign Refresh Token
userSchema.methods.getRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '90d',
  });
};

// Get Reset Password Token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 min
  return resetToken;
};

// Get Email Verification Token
userSchema.methods.getEmailVerificationToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate API Key
userSchema.methods.generateApiKey = function () {
  const apiKey = `pk_${process.env.NODE_ENV === 'production' ? 'live' : 'test'}_${crypto.randomBytes(24).toString('hex')}`;
  this.apiKey = apiKey;
  return apiKey;
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  return this.updateOne(updates);
};

// Reset monthly usage
userSchema.methods.resetMonthlyUsage = async function () {
  const now = new Date();
  const lastReset = this.usage.lastReset;
  if (!lastReset || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.usage.detectionsThisMonth = 0;
    this.usage.lastReset = now;
    await this.save();
  }
};

module.exports = mongoose.model('User', userSchema);
