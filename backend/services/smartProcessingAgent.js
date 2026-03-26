/**
 * AI Agent: Smart Processing Agent
 * Orchestrates intelligent processing by coordinating other agents
 * Makes decisions about optimal processing paths based on image characteristics
 */

const imageAnalysisAgent = require('./imageAnalysisAgent');
const anomalyDetectionAgent = require('./anomalyDetectionAgent');
const predictionAgent = require('./predictionAgent');
const imageProcessingService = require('./imageProcessingService');
const ocrService = require('./enhancedOCR'); // Use enhanced OCR
const logger = require('../config/logger');

class SmartProcessingAgent {
  constructor() {
    this.processingStrategies = {
      fast: { enhance: false, denoise: false, sharpen: false },
      balanced: { enhance: true, denoise: false, sharpen: false },
      quality: { enhance: true, denoise: true, sharpen: true }
    };
  }

  /**
   * Process an image with intelligent decision making
   * @param {string} imagePath - Path to the image
   * @param {Object} options - Processing options
   * @returns {Object} - Processing result
   */
  async process(imagePath, options = {}) {
    const startTime = Date.now();
    const context = {
      imagePath,
      startTime,
      strategy: options.strategy || 'balanced',
      userId: options.userId,
      useAdvanced: options.useAdvanced !== false
    };

    try {
      logger.info('SmartProcessingAgent: Starting intelligent processing');

      // Step 1: Analyze the image
      context.analysis = await imageAnalysisAgent.analyze(imagePath);
      logger.info(`Image analyzed: quality=${context.analysis.quality}, brightness=${context.analysis.brightness}`);

      // Step 2: Detect anomalies
      context.anomalies = await anomalyDetectionAgent.detectAnomalies(imagePath, context.analysis);
      logger.info(`Anomalies detected: ${context.anomalies.anomalies.length} found, risk=${context.anomalies.riskLevel}`);

      // Step 3: Generate processing pipeline
      context.pipeline = this.generatePipeline(context);
      logger.info(`Generated pipeline: ${context.pipeline.join(', ')}`);

      // Step 4: Process image
      const processedPath = await this.executePipeline(imagePath, context.pipeline);
      context.processedPath = processedPath;

      // Step 5: Perform OCR
      const ocrResult = await ocrService.extractText(processedPath, {
        ...options,
        imageAnalysis: context.analysis
      });
      context.ocrResult = ocrResult;

      // Step 6: Validate results
      context.validation = this.validateResults(ocrResult, context.analysis);

      // Step 7: Generate response
      const result = this.formatResult(context, options);

      logger.info(`SmartProcessingAgent: Completed in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      logger.error('SmartProcessingAgent error:', error);
      return this.getErrorResult(error, context);
    }
  }

  generatePipeline(context) {
    const pipeline = [];
    const { analysis, anomalies, strategy } = context;
    const strategyConfig = this.processingStrategies[strategy] || this.processingStrategies.balanced;

    // Always start with basic processing
    pipeline.push('resize');

    // Add enhancements based on analysis
    if (strategyConfig.enhance) {
      // Brightness correction
      if (analysis.brightness < 80 || analysis.brightness > 200) {
        pipeline.push('brightness');
      }

      // Contrast enhancement
      if (analysis.contrast < 100) {
        pipeline.push('contrast');
      }
    }

    // Denoise based on noise level or anomalies
    if (strategyConfig.denoise || analysis.noiseLevel > 40) {
      if (anomalies.anomalies.some(a => a.name === 'noise' || a.type === 'quality')) {
        pipeline.push('denoise');
      }
    }

    // Sharpen based on sharpness or anomalies
    if (strategyConfig.sharpen || analysis.sharpness < 40) {
      if (anomalies.anomalies.some(a => a.type === 'focus')) {
        pipeline.push('sharpen');
      }
    }

    // Handle specific anomalies
    for (const anomaly of anomalies.anomalies) {
      if (anomaly.severity === 'high') {
        switch (anomaly.name) {
          case 'over_exposed':
          case 'under_exposed':
            if (!pipeline.includes('brightness')) {
              pipeline.push('brightness');
            }
            break;
          case 'motion_blur':
          case 'focus_issues':
            if (!pipeline.includes('sharpen')) {
              pipeline.push('sharpen');
            }
            break;
        }
      }
    }

    // Always convert to optimal format for OCR
    pipeline.push('grayscale');
    pipeline.push('normalize');

    return pipeline;
  }

  async executePipeline(imagePath, pipeline) {
    let currentPath = imagePath;

    for (const step of pipeline) {
      switch (step) {
        case 'resize':
          currentPath = await imageProcessingService.resizeImage(currentPath, 1920, 1080);
          break;
        case 'brightness':
          currentPath = await imageProcessingService.adjustBrightness(currentPath, 1.2);
          break;
        case 'contrast':
          currentPath = await imageProcessingService.adjustContrast(currentPath, 1.3);
          break;
        case 'denoise':
          currentPath = await imageProcessingService.reduceNoise(currentPath);
          break;
        case 'sharpen':
          currentPath = await imageProcessingService.sharpenImage(currentPath);
          break;
        case 'grayscale':
          currentPath = await imageProcessingService.convertToGrayscale(currentPath);
          break;
        case 'normalize':
          currentPath = await imageProcessingService.normalizeImage(currentPath);
          break;
      }
    }

    return currentPath;
  }

  validateResults(ocrResult, analysis) {
    const validation = {
      isValid: true,
      warnings: [],
      suggestions: []
    };

    // Check if plate was detected
    if (!ocrResult.text || ocrResult.text.length < 2) {
      validation.warnings.push('No text detected in image');
      validation.isValid = false;
    }

    // Check confidence
    if (ocrResult.confidence && ocrResult.confidence < 50) {
      validation.warnings.push('Low OCR confidence');
      validation.suggestions.push('Try using a clearer image');
    }

    // Check if result matches expected format
    if (ocrResult.text && !this.isValidPlateFormat(ocrResult.text)) {
      validation.warnings.push('Detected text does not match standard plate format');
      validation.suggestions.push('Manual review recommended');
    }

    // Check image quality impact
    if (analysis.quality < 40) {
      validation.suggestions.push('Image quality may affect accuracy');
    }

    return validation;
  }

  isValidPlateFormat(text) {
    // Basic validation - alphanumeric with common plate characters
    const platePattern = /^[A-Z0-9\s\-]{4,20}$/i;
    return platePattern.test(text.replace(/[\s\-]/g, ''));
  }

  formatResult(context, options) {
    const { analysis, anomalies, pipeline, ocrResult, validation } = context;
    
    return {
      // Original image info
      original: {
        path: context.imagePath,
        dimensions: analysis.dimensions,
        format: analysis.format
      },
      // Analysis results
      analysis: {
        quality: analysis.quality,
        brightness: analysis.brightness,
        contrast: analysis.contrast,
        sharpness: analysis.sharpness,
        noiseLevel: analysis.noiseLevel,
        confidence: analysis.confidence,
        recommendations: analysis.recommendations
      },
      // Anomaly detection results
      anomalies: {
        detected: anomalies.anomalies.length > 0,
        riskLevel: anomalies.riskLevel,
        severityScore: anomalies.severityScore,
        items: anomalies.anomalies,
        recommendations: anomalies.recommendations
      },
      // Processing info
      processing: {
        pipeline,
        strategy: context.strategy,
        processingTime: Date.now() - context.startTime
      },
      // OCR results
      result: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        region: ocrResult.region,
        format: ocrResult.format,
        boundingBox: ocrResult.boundingBox
      },
      // Validation
      validation,
      // User insights (if enabled)
      ...(options.userId && options.useAdvanced ? {
        predictions: null // Would call prediction agent here
      } : {})
    };
  }

  getErrorResult(error, context) {
    return {
      success: false,
      error: error.message,
      context: {
        processingTime: context.startTime ? Date.now() - context.startTime : 0,
        stage: context.stage || 'unknown'
      },
      suggestions: [
        'Try with a different image',
        'Ensure the image contains a clear license plate',
        'Check that the image is not corrupted'
      ]
    };
  }

  /**
   * Batch process multiple images
   */
  async batchProcess(imagePaths, options = {}) {
    const results = await Promise.all(
      imagePaths.map(async (path, index) => {
        try {
          const result = await this.process(path, {
            ...options,
            batchIndex: index
          });
          return { path, ...result };
        } catch (error) {
          return { path, success: false, error: error.message };
        }
      })
    );

    return {
      total: imagePaths.length,
      successful: results.filter(r => r.success !== false).length,
      failed: results.filter(r => r.success === false).length,
      results
    };
  }

  /**
   * Get processing recommendations for an image without processing it
   */
  async getRecommendations(imagePath) {
    const analysis = await imageAnalysisAgent.analyze(imagePath);
    const anomalies = await anomalyDetectionAgent.detectAnomalies(imagePath, analysis);
    const pipeline = this.generatePipeline({ analysis, anomalies, strategy: 'balanced' });

    return {
      recommendedPipeline: pipeline,
      estimatedQuality: analysis.quality,
      detectedAnomalies: anomalies.anomalies,
      riskLevel: anomalies.riskLevel,
      enhancements: analysis.recommendations
    };
  }

  /**
   * Compare multiple processing strategies
   */
  async compareStrategies(imagePath) {
    const results = {};

    for (const [strategyName, _] of Object.entries(this.processingStrategies)) {
      try {
        const result = await this.process(imagePath, { strategy: strategyName });
        results[strategyName] = {
          quality: result.analysis.quality,
          processingTime: result.processing.processingTime,
          confidence: result.result.confidence,
          pipelineLength: result.processing.pipeline.length
        };
      } catch (error) {
        results[strategyName] = { error: error.message };
      }
    }

    return results;
  }
}

module.exports = new SmartProcessingAgent();