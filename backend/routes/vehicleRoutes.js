const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { auth } = require('../middleware/auth');
const Vehicle = require('../models/Vehicle');
const ErrorResponse = require('../utils/errorResponse');

router.use(auth);

// Search: escape regex special chars to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // cap at 100
  const search = req.query.search;
  const query = { user: req.user._id };
  if (search) query.plateNumber = { $regex: escapeRegex(search.toUpperCase()), $options: 'i' };
  const [vehicles, total] = await Promise.all([
    Vehicle.find(query).sort({ lastSeen: -1 }).skip((page - 1) * limit).limit(limit),
    Vehicle.countDocuments(query),
  ]);
  res.status(200).json({ success: true, data: vehicles, pagination: { page, limit, total } });
}));

router.get('/:id', asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user._id })
    .populate('detections', 'createdAt status detectionResults.platesDetected');
  if (!vehicle) return next(new ErrorResponse('Vehicle not found', 404));
  res.status(200).json({ success: true, data: vehicle });
}));

router.put('/:id', asyncHandler(async (req, res, next) => {
  // Whitelist allowed fields — prevents mass assignment / user/isFlagged tampering
  const allowed = ['make', 'model', 'year', 'color', 'type', 'country', 'state',
                   'registrationExpiry', 'notes', 'region'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (Object.keys(updates).length === 0) {
    return next(new ErrorResponse('No valid fields to update', 400));
  }

  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!vehicle) return next(new ErrorResponse('Vehicle not found', 404));
  res.status(200).json({ success: true, data: vehicle });
}));

router.post('/:id/alerts', asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user._id });
  if (!vehicle) return next(new ErrorResponse('Vehicle not found', 404));

  // Whitelist alert fields
  const { type, message, severity } = req.body;
  const validTypes = ['stolen', 'wanted', 'expired', 'custom'];
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validTypes.includes(type)) return next(new ErrorResponse('Invalid alert type', 400));
  if (severity && !validSeverities.includes(severity)) return next(new ErrorResponse('Invalid severity', 400));

  vehicle.alerts.push({ type, message: String(message || '').substring(0, 500), severity: severity || 'low' });
  await vehicle.save();
  res.status(200).json({ success: true, data: vehicle });
}));

router.delete('/:id', asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!vehicle) return next(new ErrorResponse('Vehicle not found', 404));
  res.status(200).json({ success: true, message: 'Vehicle deleted' });
}));

module.exports = router;
