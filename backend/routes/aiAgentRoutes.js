/**
 * AI Agent Routes
 * Advanced AI-powered endpoints for intelligent processing and insights
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload, memoryUpload } = require('../middleware/upload');
const aiAgentController = require('../controllers/aiAgentController');

// ─── Image Analysis Agent ───────────────────────────────────────────────────

/**
 * POST /api/v1/ai/analyze
 * Analyze an image for characteristics and quality
 * @body {file} image - Image file to analyze
 */
router.post('/analyze', protect, upload.single('image'), aiAgentController.analyzeImage);

/**
 * POST /api/v1/ai/analyze-batch
 * Batch analyze multiple images
 * @body {file[]} images - Array of images to analyze
 */
router.post('/analyze-batch', protect, upload.array('images', 10), aiAgentController.batchAnalyzeImages);

// ─── Anomaly Detection Agent ─────────────────────────────────────────────────

/**
 * POST /api/v1/ai/detect-anomalies
 * Detect anomalies in an image
 * @body {file} image - Image file to check for anomalies
 */
router.post('/detect-anomalies', protect, upload.single('image'), aiAgentController.detectAnomalies);

/**
 * POST /api/v1/ai/validate
 * Validate detection results for anomalies
 * @body {Object} detectionData - Detection results to validate
 */
router.post('/validate', protect, aiAgentController.validateDetection);

// ─── Smart Processing Agent ───────────────────────────────────────────────────

/**
 * POST /api/v1/ai/smart-process
 * Process image with intelligent decision making
 * @body {file} image - Image to process
 * @body {string} strategy - Processing strategy (fast/balanced/quality)
 */
router.post('/smart-process', protect, upload.single('image'), aiAgentController.smartProcess);

/**
 * GET /api/v1/ai/recommendations/:detectionId
 * Get processing recommendations for a detection
 */
router.get('/recommendations/:detectionId', protect, aiAgentController.getRecommendations);

/**
 * POST /api/v1/ai/compare-strategies
 * Compare different processing strategies
 * @body {file} image - Image to test
 */
router.post('/compare-strategies', protect, upload.single('image'), aiAgentController.compareStrategies);

// ─── Prediction Agent ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/ai/insights
 * Get user insights and predictions
 */
router.get('/insights', protect, aiAgentController.getUserInsights);

/**
 * GET /api/v1/ai/predictions
 * Get personalized predictions
 */
router.get('/predictions', protect, aiAgentController.getPredictions);

/**
 * GET /api/v1/ai/fleet-analytics
 * Get fleet analytics and risk assessment
 */
router.get('/fleet-analytics', protect, aiAgentController.getFleetAnalytics);

/**
 * POST /api/v1/ai/predict-vehicle-type
 * Predict vehicle type from plate number
 * @body {string} plateNumber - Plate number to analyze
 * @body {string} region - Region code
 */
router.post('/predict-vehicle-type', protect, aiAgentController.predictVehicleType);

// ─── Agent Status ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/ai/status
 * Get AI agents status and capabilities
 */
router.get('/status', protect, aiAgentController.getAgentStatus);

/**
 * GET /api/v1/ai/capabilities
 * Get AI agents capabilities
 */
router.get('/capabilities', aiAgentController.getCapabilities);

module.exports = router;