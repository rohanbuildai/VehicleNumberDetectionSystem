const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const imageProcessingService = require('../services/imageProcessingService');
const ErrorResponse = require('../utils/errorResponse');

router.use(auth);

router.post('/analyze', upload.single('image'), asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('Image required', 400));
  const quality = await imageProcessingService.analyzeImageQuality(req.file.path);
  const meta = await imageProcessingService.getMetadata(req.file.path);
  res.status(200).json({ success: true, data: { quality, metadata: meta, url: `/uploads/original/${req.file.filename}` } });
}));

router.post('/enhance', upload.single('image'), asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('Image required', 400));
  const result = await imageProcessingService.enhanceImage(req.file.path, {
    enhanceContrast: req.body.enhanceContrast !== 'false',
    denoising: req.body.denoising !== 'false',
    sharpening: req.body.sharpening !== 'false',
    grayscale: req.body.grayscale === 'true',
  });
  res.status(200).json({ success: true, data: result });
}));

router.post('/convert', upload.single('image'), asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('Image required', 400));
  const format = req.body.format || 'webp';
  const result = await imageProcessingService.convertFormat(req.file.path, format);
  res.status(200).json({ success: true, data: result });
}));

module.exports = router;
