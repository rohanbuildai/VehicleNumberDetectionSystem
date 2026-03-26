// userRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const { cacheDel } = require('../config/cache');
const ErrorResponse = require('../utils/errorResponse');

router.use(protect);

router.get('/profile', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, data: user });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const fields = ['name', 'preferences'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  await cacheDel(`user:${req.user._id}`);
  res.status(200).json({ success: true, data: user });
}));

router.get('/', authorize('admin'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const users = await User.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  const total = await User.countDocuments();
  res.status(200).json({ success: true, data: users, pagination: { page, limit, total } });
}));

router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.status(200).json({ success: true, message: 'User deactivated' });
}));

module.exports = router;
