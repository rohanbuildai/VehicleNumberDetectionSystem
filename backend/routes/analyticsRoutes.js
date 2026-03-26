// analyticsRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { auth } = require('../middleware/auth');
const Detection = require('../models/Detection');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { cacheGet, cacheSet } = require('../config/cache');

router.use(auth);

router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const cacheKey = `analytics:dashboard:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.status(200).json({ success: true, data: cached });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [detectionStats, vehicleCount, recentDetections, topPlates, dailyActivity] = await Promise.all([
    Detection.aggregate([
      { $match: { user: userId } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalPlates: { $sum: '$detectionResults.platesDetected' },
        avgConfidence: { $avg: { $avg: '$detectionResults.plates.confidence' } },
        avgProcessingTime: { $avg: '$performance.processingTimeMs' },
      }},
    ]),
    Vehicle.countDocuments({ user: userId }),
    Detection.find({ user: userId }).sort({ createdAt: -1 }).limit(5).select('status createdAt detectionResults.platesDetected detectionResults.plates.plateText inputImage.originalName'),
    Detection.aggregate([
      { $match: { user: userId, status: 'completed' } },
      { $unwind: '$detectionResults.plates' },
      { $group: { _id: '$detectionResults.plates.plateText', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Detection.aggregate([
      { $match: { user: userId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        detections: { $sum: 1 },
        plates: { $sum: '$detectionResults.platesDetected' },
      }},
      { $sort: { _id: 1 } },
    ]),
  ]);

  const user = await User.findById(userId).select('usage limits plan');

  const data = {
    summary: detectionStats[0] || { total: 0, completed: 0, failed: 0, totalPlates: 0 },
    vehicleCount,
    recentDetections,
    topPlates,
    dailyActivity,
    usage: user?.usage,
    limits: user?.limits,
    plan: user?.plan,
  };

  await cacheSet(cacheKey, data, 180);
  res.status(200).json({ success: true, data });
}));

module.exports = router;
