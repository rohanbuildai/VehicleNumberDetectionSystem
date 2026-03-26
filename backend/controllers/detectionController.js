const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const Detection = require('../models/Detection');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const imageProcessingService = require('../services/imageProcessingService');
const ocrService = require('../services/enhancedOCR'); // Use enhanced OCR for better accuracy
const { fetchVehicleDetails } = require('../services/governmentVehicleLookup');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require("../config/redis");
const logger = require('../config/logger');

// @desc    Submit image for detection
// @route   POST /api/v1/detection/detect
exports.detectPlate = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('Please upload an image file', 400));

  const jobId = uuidv4();
  const io = req.app.get('io');
  const userId = req.user._id.toString();
  const startTime = Date.now();

  // Parse options
  const options = {
    enhanceContrast: req.body.enhanceContrast !== 'false',
    denoising: req.body.denoising !== 'false',
    sharpening: req.body.sharpening !== 'false',
    grayscaleConversion: req.body.grayscaleConversion !== 'false',
    morphologicalOps: req.body.morphologicalOps !== 'false',
    outputAnnotated: req.body.outputAnnotated !== 'false',
    outputCroppedPlates: req.body.outputCroppedPlates !== 'false',
  };

  const inputImageMeta = await imageProcessingService.getMetadata(req.file.path);

  // Create detection record
  const detection = await Detection.create({
    user: req.user._id,
    jobId,
    status: 'processing',
    inputImage: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      url: `/uploads/original/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype,
      dimensions: { width: inputImageMeta.width, height: inputImageMeta.height },
    },
    processingOptions: options,
    performance: { startTime: new Date() },
  });

  // Respond immediately with job ID
  res.status(202).json({
    success: true,
    jobId,
    detectionId: detection._id,
    message: 'Detection job started',
    status: 'processing',
  });

  // Process asynchronously
  setTimeout(async () => {
    try {
      io?.emitDetectionProgress(userId, { jobId, stage: 'analyzing', progress: 15 });

      // Step 1: Quick OCR - skip full pipeline for speed
      io?.emitDetectionProgress(userId, { jobId, stage: 'detecting', progress: 50 });

      // Step 2: OCR & plate detection - direct, no preprocessing
      const detectionData = await ocrService.detectPlates(req.file.path, options);
      
      io?.emitDetectionProgress(userId, { jobId, stage: 'annotating', progress: 75 });

      // Step 3: Simple annotation if plates found
      let processedImages = [];
      let annotatedResult = null;
      
      if (detectionData.plates.length > 0 && options.outputAnnotated) {
        try {
          annotatedResult = await imageProcessingService.annotateImage(req.file.path, detectionData.plates);
          processedImages.push(annotatedResult);
        } catch(e) {
          logger.warn('Annotation failed:', e.message);
        }
      }

      // Step 4: Crop plates if found
      if (detectionData.plates.length > 0 && options.outputCroppedPlates) {
        for (const plate of detectionData.plates) {
          if (plate.boundingBox) {
            try {
              const cropped = await imageProcessingService.cropRegion(req.file.path, plate.boundingBox);
              processedImages.push(cropped);
              plate.plateImageUrl = cropped.url;
            } catch(e) {}
          }
        }
      }

      io?.emitDetectionProgress(userId, { jobId, stage: 'saving', progress: 90 });

      const endTime = Date.now();

      // Update detection record
      await Detection.findByIdAndUpdate(detection._id, {
        status: 'completed',
        processedImages,
        detectionResults: {
          platesDetected: detectionData.plates.length,
          plates: detectionData.plates,
          vehicleDetails: [],
          processingMetadata: {
            algorithmsUsed: detectionData.algorithmsUsed || [],
            ocrEngine: detectionData.ocrEngine,
            detectionModel: 'PlateDetect-v2',
          },
        },
        performance: {
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          processingTimeMs: endTime - startTime,
          detectionTimeMs: detectionData.detectionTimeMs,
        },
      });

      // Update user usage
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          'usage.detectionsThisMonth': 1,
          'usage.totalDetections': 1,
          'usage.storageUsed': req.file.size,
        },
      });

      // Upsert vehicle record
      if (detectionData.plates.length > 0) {
        for (const plate of detectionData.plates) {
          try {
            await Vehicle.findOneAndUpdate(
              { plateNumber: plate.plateText, user: req.user._id },
              {
                $set: { lastSeen: new Date(), country: plate.country, region: plate.region },
                $inc: { seenCount: 1 },
                $push: { detections: detection._id },
                $setOnInsert: { plateNumber: plate.plateText, user: req.user._id, firstSeen: new Date() },
              },
              { upsert: true, new: true }
            );
          } catch (ve) {
            logger.warn('Vehicle upsert failed:', ve.message);
          }
        }
      }

      await cacheDelPattern(`detections:${userId}*`);
      await cacheDel(`analytics:dashboard:${userId}`);
      await cacheDel(`stats:${userId}`);

      const finalDetection = await Detection.findById(detection._id);
      io?.emitDetectionResult(userId, {
        jobId,
        detectionId: detection._id,
        status: 'completed',
        data: finalDetection,
        progress: 100,
      });

      logger.info(`Detection ${jobId} completed in ${endTime - startTime}ms, found ${detectionData.plates.length} plate(s)`);
    } catch (err) {
      logger.error(`Detection ${jobId} failed:`, err);
      await Detection.findByIdAndUpdate(detection._id, {
        status: 'failed',
        errorInfo: { code: err.code || 'DETECTION_ERROR', message: err.message, stack: err.stack },
        'performance.endTime': new Date(),
      });
      io?.emitDetectionResult(userId, {
        jobId,
        status: 'failed',
        error: err.message,
        progress: 0,
      });
    }
  }, 600);
});

// @desc    Get detection result by jobId
// @route   GET /api/v1/detection/job/:jobId
exports.getJobStatus = asyncHandler(async (req, res, next) => {
  const detection = await Detection.findOne({
    jobId: req.params.jobId,
    user: req.user._id,
  });
  if (!detection) return next(new ErrorResponse('Job not found', 404));
  res.status(200).json({ success: true, data: detection });
});

// @desc    Get all detections for user
// @route   GET /api/v1/detection
exports.getDetections = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status;
  const search = req.query.search;

  const query = { user: req.user._id };
  if (status) query.status = status;
  if (search) {
    query['detectionResults.plates.plateText'] = { $regex: search, $options: 'i' };
  }

  const [detections, total] = await Promise.all([
    Detection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-processedImages.path -inputImage.path'),
    Detection.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: detections,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// @desc    Get single detection
// @route   GET /api/v1/detection/:id
exports.getDetection = asyncHandler(async (req, res, next) => {
  const detection = await Detection.findOne({ _id: req.params.id, user: req.user._id });
  if (!detection) return next(new ErrorResponse('Detection not found', 404));
  res.status(200).json({ success: true, data: detection });
});

// @desc    Delete detection
// @route   DELETE /api/v1/detection/:id
exports.deleteDetection = asyncHandler(async (req, res, next) => {
  const detection = await Detection.findOne({ _id: req.params.id, user: req.user._id });
  if (!detection) return next(new ErrorResponse('Detection not found', 404));

  // Cleanup files
  const filesToDelete = [
    detection.inputImage?.path,
    ...((detection.processedImages || []).map(i => i.path)),
  ].filter(Boolean);
  await imageProcessingService.cleanupFiles(filesToDelete);

  await detection.deleteOne();
  await cacheDelPattern(`detections:${req.user._id}*`);

  res.status(200).json({ success: true, message: 'Detection deleted' });
});

// @desc    Toggle favorite
// @route   PATCH /api/v1/detection/:id/favorite
exports.toggleFavorite = asyncHandler(async (req, res, next) => {
  const detection = await Detection.findOne({ _id: req.params.id, user: req.user._id });
  if (!detection) return next(new ErrorResponse('Detection not found', 404));
  detection.isFavorite = !detection.isFavorite;
  await detection.save();
  res.status(200).json({ success: true, data: detection });
});

// @desc    Process image only (no detection)
// @route   POST /api/v1/detection/process
exports.processImageOnly = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('Please upload an image file', 400));

  const processType = req.body.processType || 'enhance';
  let result;

  switch (processType) {
    case 'grayscale':
      result = await imageProcessingService.toGrayscale(req.file.path);
      break;
    case 'binarize':
      result = await imageProcessingService.binarize(req.file.path, parseInt(req.body.threshold) || 128);
      break;
    case 'morphological':
      result = await imageProcessingService.applyMorphological(req.file.path);
      break;
    case 'thumbnail':
      result = await imageProcessingService.generateThumbnail(req.file.path);
      break;
    case 'convert':
      result = await imageProcessingService.convertFormat(req.file.path, req.body.format || 'webp');
      break;
    default:
      result = await imageProcessingService.enhanceImage(req.file.path, {
        enhanceContrast: true,
        denoising: true,
        sharpening: true,
      });
  }

  const quality = await imageProcessingService.analyzeImageQuality(req.file.path);

  res.status(200).json({
    success: true,
    data: { processed: result, quality },
  });
});

// @desc    Get detection analytics summary
// @route   GET /api/v1/detection/stats
exports.getDetectionStats = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const cacheKey = `stats:${userId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.status(200).json({ success: true, data: cached });

  const [stats] = await Detection.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalPlates: { $sum: '$detectionResults.platesDetected' },
        avgProcessingTime: { $avg: '$performance.processingTimeMs' },
        avgConfidence: { $avg: { $avg: '$detectionResults.plates.confidence' } },
      },
    },
  ]);

  const recentByDay = await Detection.aggregate([
    { $match: { user: userId, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        plates: { $sum: '$detectionResults.platesDetected' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const data = { summary: stats || {}, dailyActivity: recentByDay };
  await cacheSet(cacheKey, data, 300);
  res.status(200).json({ success: true, data });
});
