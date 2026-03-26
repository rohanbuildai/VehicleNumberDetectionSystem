/**
 * AI Agent Controller
 * Handles all AI-powered endpoints
 */

const imageAnalysisAgent = require('../services/imageAnalysisAgent');
const anomalyDetectionAgent = require('../services/anomalyDetectionAgent');
const predictionAgent = require('../services/predictionAgent');
const smartProcessingAgent = require('../services/smartProcessingAgent');
const imageProcessingService = require('../services/imageProcessingService');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs');

// ─── Image Analysis Agent ───────────────────────────────────────────────────

/**
 * Analyze an image for characteristics and quality
 */
exports.analyzeImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;
    const analysis = await imageAnalysisAgent.analyze(imagePath);

    // Clean up uploaded file
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('AI Agent: analyzeImage error:', error);
    next(error);
  }
};

/**
 * Batch analyze multiple images
 */
exports.batchAnalyzeImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload images'
      });
    }

    const imagePaths = req.files.map(f => f.path);
    const results = await imageAnalysisAgent.batchAnalyze(imagePaths);

    // Clean up uploaded files
    imagePaths.forEach(p => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    res.status(200).json({
      success: true,
      data: {
        total: results.length,
        results
      }
    });
  } catch (error) {
    logger.error('AI Agent: batchAnalyzeImages error:', error);
    next(error);
  }
};

// ─── Anomaly Detection Agent ─────────────────────────────────────────────────

/**
 * Detect anomalies in an image
 */
exports.detectAnomalies = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
    
    const result = await anomalyDetectionAgent.detectAnomalies(imagePath, metadata);

    // Clean up uploaded file
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('AI Agent: detectAnomalies error:', error);
    next(error);
  }
};

/**
 * Validate detection results for anomalies
 */
exports.validateDetection = async (req, res, next) => {
  try {
    const { detectionData } = req.body;

    if (!detectionData) {
      return res.status(400).json({
        success: false,
        message: 'Detection data is required'
      });
    }

    const result = await anomalyDetectionAgent.detectAnomalies(null, detectionData);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('AI Agent: validateDetection error:', error);
    next(error);
  }
};

// ─── Smart Processing Agent ───────────────────────────────────────────────────

/**
 * Process image with intelligent decision making
 */
exports.smartProcess = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;
    const options = {
      strategy: req.body.strategy || 'balanced',
      userId: req.user.id,
      useAdvanced: req.body.useAdvanced !== false
    };

    const result = await smartProcessingAgent.process(imagePath, options);

    // Clean up uploaded file if needed
    if (fs.existsSync(imagePath)) {
      // Keep original for reference
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('AI Agent: smartProcess error:', error);
    next(error);
  }
};

/**
 * Get processing recommendations for a detection
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const { detectionId } = req.params;
    const Detection = require('../models/Detection');
    
    const detection = await Detection.findById(detectionId);
    
    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Detection not found'
      });
    }

    // Get recommendations based on processed image if available
    let recommendations;
    if (detection.processedImage) {
      const imagePath = path.join(__dirname, '..', detection.processedImage);
      recommendations = await smartProcessingAgent.getRecommendations(imagePath);
    } else if (detection.originalImage) {
      const imagePath = path.join(__dirname, '..', detection.originalImage);
      recommendations = await smartProcessingAgent.getRecommendations(imagePath);
    } else {
      recommendations = {
        message: 'No image available for analysis',
        recommendedPipeline: ['resize', 'grayscale', 'normalize']
      };
    }

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('AI Agent: getRecommendations error:', error);
    next(error);
  }
};

/**
 * Compare different processing strategies
 */
exports.compareStrategies = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = req.file.path;
    const results = await smartProcessingAgent.compareStrategies(imagePath);

    // Clean up uploaded file
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('AI Agent: compareStrategies error:', error);
    next(error);
  }
};

// ─── Prediction Agent ─────────────────────────────────────────────────────────

/**
 * Get user insights and predictions
 */
exports.getUserInsights = async (req, res, next) => {
  try {
    const insights = await predictionAgent.getUserInsights(req.user.id);

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('AI Agent: getUserInsights error:', error);
    next(error);
  }
};

/**
 * Get personalized predictions
 */
exports.getPredictions = async (req, res, next) => {
  try {
    const PredictionAgent = require('../services/predictionAgent');
    const Detection = require('../models/Detection');
    
    const detections = await Detection.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    const predictions = await PredictionAgent.generatePredictions(detections, req.user.id);

    res.status(200).json({
      success: true,
      data: predictions
    });
  } catch (error) {
    logger.error('AI Agent: getPredictions error:', error);
    next(error);
  }
};

/**
 * Get fleet analytics and risk assessment
 */
exports.getFleetAnalytics = async (req, res, next) => {
  try {
    const analytics = await predictionAgent.getFleetAnalytics(req.user.id);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('AI Agent: getFleetAnalytics error:', error);
    next(error);
  }
};

/**
 * Predict vehicle type from plate number
 */
exports.predictVehicleType = async (req, res, next) => {
  try {
    const { plateNumber, region } = req.body;

    if (!plateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Plate number is required'
      });
    }

    const prediction = await predictionAgent.predictVehicleType(plateNumber, region);

    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    logger.error('AI Agent: predictVehicleType error:', error);
    next(error);
  }
};

// ─── Agent Status ────────────────────────────────────────────────────────────

/**
 * Get AI agents status and capabilities
 */
exports.getAgentStatus = async (req, res, next) => {
  try {
    const status = {
      agents: {
        imageAnalysis: {
          name: 'Image Analysis Agent',
          status: 'active',
          capabilities: [
            'Quality assessment',
            'Brightness/contrast analysis',
            'Sharpness estimation',
            'Noise detection',
            'Dominant color extraction',
            'Processing recommendations'
          ]
        },
        anomalyDetection: {
          name: 'Anomaly Detection Agent',
          status: 'active',
          capabilities: [
            'Pattern-based anomaly detection',
            'Statistical anomaly detection',
            'Risk assessment',
            'Recommendation generation'
          ]
        },
        prediction: {
          name: 'Prediction & Insights Agent',
          status: 'active',
          capabilities: [
            'Usage pattern analysis',
            'Time-based predictions',
            'Fleet analytics',
            'Vehicle type prediction'
          ]
        },
        smartProcessing: {
          name: 'Smart Processing Agent',
          status: 'active',
          capabilities: [
            'Intelligent pipeline generation',
            'Multi-strategy comparison',
            'Automated optimization',
            'Result validation'
          ]
        }
      },
      features: {
        smartProcessing: {
          strategies: ['fast', 'balanced', 'quality'],
          defaultStrategy: 'balanced'
        },
        batchProcessing: {
          supported: true,
          maxBatchSize: 10
        },
        realTimeAnalysis: {
          supported: true
        }
      },
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('AI Agent: getAgentStatus error:', error);
    next(error);
  }
};

/**
 * Get AI agents capabilities (public endpoint)
 */
exports.getCapabilities = async (req, res, next) => {
  try {
    const capabilities = {
      supportedFeatures: [
        'image-analysis',
        'anomaly-detection',
        'smart-processing',
        'predictions',
        'fleet-analytics',
        'batch-processing',
        'recommendations',
        'vehicle-prediction'
      ],
      imageFormats: ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff'],
      maxImageSize: '10MB',
      processingStrategies: {
        fast: 'Quick processing with minimal enhancements',
        balanced: 'Standard processing with recommended enhancements',
        quality: 'Full processing with all enhancements'
      },
      rateLimits: {
        analyze: '60/hour',
        smartProcess: '30/hour',
        insights: '120/hour'
      }
    };

    res.status(200).json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    logger.error('AI Agent: getCapabilities error:', error);
    next(error);
  }
};