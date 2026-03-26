/**
 * AI Agent: Anomaly Detection Agent
 * Detects unusual patterns, potential issues, and anomalies in images and detection results
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class AnomalyDetectionAgent {
  constructor() {
    this.anomalyPatterns = this.initializePatterns();
    this.baselineStats = {
      quality: { mean: 70, std: 15 },
      brightness: { mean: 128, std: 40 },
      contrast: { mean: 120, std: 30 },
      sharpness: { mean: 60, std: 20 }
    };
  }

  initializePatterns() {
    return {
      // Common plate anomalies
      plateAnomalies: [
        {
          name: 'occluded_plate',
          pattern: /occluded|blocked|partial/i,
          severity: 'high',
          description: 'Plate may be partially visible or obstructed'
        },
        {
          name: 'angled_plate',
          pattern: /angled|rotated|tilted/i,
          severity: 'medium',
          description: 'Plate is at an unusual angle'
        },
        {
          name: 'dirty_plate',
          pattern: /dirty|obscured|muddy/i,
          severity: 'medium',
          description: 'Plate appears dirty or obscured'
        },
        {
          name: 'damaged_plate',
          pattern: /damaged|bent|broken/i,
          severity: 'high',
          description: 'Plate appears physically damaged'
        },
        {
          name: 'faded_characters',
          pattern: /faded|worn|illegible/i,
          severity: 'medium',
          description: 'Characters appear faded or worn'
        }
      ],
      // Image quality anomalies
      imageAnomalies: [
        {
          name: 'motion_blur',
          indicators: ['blur', 'streaking'],
          threshold: { sharpness: 30 },
          severity: 'high',
          description: 'Image may have motion blur'
        },
        {
          name: 'focus_issues',
          indicators: ['blurry', 'unclear'],
          threshold: { sharpness: 25 },
          severity: 'high',
          description: 'Image appears out of focus'
        },
        {
          name: 'over_exposure',
          indicators: ['washed', 'bright'],
          threshold: { brightness: 220 },
          severity: 'medium',
          description: 'Image may be over-exposed'
        },
        {
          name: 'under_exposure',
          indicators: ['dark', 'shadow'],
          threshold: { brightness: 50 },
          severity: 'medium',
          description: 'Image may be under-exposed'
        },
        {
          name: 'noise',
          indicators: ['grainy', 'noisy'],
          threshold: { noise: 50 },
          severity: 'medium',
          description: 'High noise level detected'
        },
        {
          name: 'compression_artifacts',
          indicators: ['artifact', 'distorted'],
          threshold: { quality: 40 },
          severity: 'low',
          description: 'Compression artifacts detected'
        }
      ],
      // Detection anomalies
      detectionAnomalies: [
        {
          name: 'low_confidence',
          threshold: { confidence: 60 },
          severity: 'medium',
          description: 'Detection confidence is low'
        },
        {
          name: 'multiple_plates',
          threshold: { count: 1 },
          severity: 'info',
          description: 'Multiple plates detected in image'
        },
        {
          name: 'no_plate_detected',
          pattern: /no.*plate|not.*found/i,
          severity: 'warning',
          description: 'No license plate detected'
        },
        {
          name: 'invalid_format',
          pattern: /invalid|unknown/i,
          severity: 'high',
          description: 'Detected text does not match known plate format'
        }
      ]
    };
  }

  /**
   * Analyze an image for anomalies
   */
  async detectAnomalies(imagePath, metadata = {}) {
    try {
      const imageAnalysis = await this.analyzeImageForAnomalies(imagePath);
      const patternAnomalies = this.detectPatternAnomalies(metadata);
      const statisticalAnomalies = this.detectStatisticalAnomalies(metadata);
      
      const allAnomalies = [
        ...imageAnalysis.anomalies,
        ...patternAnomalies,
        ...statisticalAnomalies
      ];

      const severityScore = this.calculateAnomalySeverity(allAnomalies);
      const recommendations = this.generateAnomalyRecommendations(allAnomalies);

      return {
        anomalies: allAnomalies,
        severityScore,
        riskLevel: this.determineRiskLevel(severityScore),
        recommendations,
        isAnomalous: allAnomalies.some(a => a.severity === 'high'),
        confidence: this.calculateDetectionConfidence(allAnomalies)
      };
    } catch (error) {
      console.error('AnomalyDetectionAgent error:', error);
      return this.getDefaultAnomalyResult();
    }
  }

  async analyzeImageForAnomalies(imagePath) {
    const anomalies = [];
    
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await this.getBasicStats(imagePath);

      // Check resolution
      if (metadata.width < 640 || metadata.height < 480) {
        anomalies.push({
          type: 'resolution',
          name: 'low_resolution',
          severity: 'medium',
          message: `Image resolution (${metadata.width}x${metadata.height}) may be too low for accurate detection`,
          value: { width: metadata.width, height: metadata.height }
        });
      }

      // Check aspect ratio
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio > 4 || aspectRatio < 0.25) {
        anomalies.push({
          type: 'composition',
          name: 'unusual_aspect_ratio',
          severity: 'low',
          message: `Unusual aspect ratio: ${aspectRatio.toFixed(2)}`,
          value: aspectRatio
        });
      }

      // Check for potential compression issues
      if (stats.entropy < 3) {
        anomalies.push({
          type: 'quality',
          name: 'low_entropy',
          severity: 'medium',
          message: 'Image may be heavily compressed',
          value: stats.entropy
        });
      }

      // Check for potential over/under exposure
      if (stats.meanBrightness > 230) {
        anomalies.push({
          type: 'exposure',
          name: 'over_exposed',
          severity: 'high',
          message: 'Image appears over-exposed',
          value: stats.meanBrightness
        });
      } else if (stats.meanBrightness < 30) {
        anomalies.push({
          type: 'exposure',
          name: 'under_exposed',
          severity: 'high',
          message: 'Image appears under-exposed',
          value: stats.meanBrightness
        });
      }

    } catch (error) {
      console.error('Image analysis error:', error);
    }

    return { anomalies };
  }

  async getBasicStats(imagePath) {
    const { data, info } = await sharp(imagePath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sum = 0;
    let min = 255;
    let max = 0;
    let entropy = 0;
    const histogram = new Array(256).fill(0);

    const pixelCount = info.width * info.height;
    const channelCount = info.channels;

    for (let i = 0; i < data.length; i += channelCount) {
      const value = data[i];
      sum += value;
      min = Math.min(min, value);
      max = Math.max(max, value);
      histogram[value]++;
    }

    const meanBrightness = sum / (pixelCount || 1);

    // Calculate entropy
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        const p = histogram[i] / pixelCount;
        entropy -= p * Math.log2(p);
      }
    }

    return {
      meanBrightness: Math.round(meanBrightness),
      min,
      max,
      range: max - min,
      entropy: Math.round(entropy * 100) / 100
    };
  }

  detectPatternAnomalies(metadata) {
    const anomalies = [];

    // Check detected text for anomalies
    if (metadata.detectedText) {
      const text = metadata.detectedText.toLowerCase();
      
      for (const anomaly of this.anomalyPatterns.detectionAnomalies) {
        if (anomaly.pattern && anomaly.pattern.test(text)) {
          anomalies.push({
            type: 'detection',
            name: anomaly.name,
            severity: anomaly.severity,
            message: anomaly.description,
            value: metadata.detectedText
          });
        }

        if (anomaly.threshold) {
          if (anomaly.threshold.confidence && metadata.confidence < anomaly.threshold.confidence) {
            anomalies.push({
              type: 'detection',
              name: anomaly.name,
              severity: anomaly.severity,
              message: `${anomaly.description} (${metadata.confidence}% confidence)`,
              value: metadata.confidence
            });
          }
        }
      }
    }

    return anomalies;
  }

  detectStatisticalAnomalies(metadata) {
    const anomalies = [];

    // Check against baseline statistics
    if (metadata.quality !== undefined) {
      const zScore = this.calculateZScore(
        metadata.quality,
        this.baselineStats.quality.mean,
        this.baselineStats.quality.std
      );

      if (Math.abs(zScore) > 2) {
        anomalies.push({
          type: 'statistical',
          name: 'quality_anomaly',
          severity: zScore < 0 ? 'high' : 'low',
          message: `Quality score (${metadata.quality}) is ${zScore < 0 ? 'below' : 'above'} normal`,
          value: { zScore: Math.round(zScore * 100) / 100, quality: metadata.quality }
        });
      }
    }

    if (metadata.brightness !== undefined) {
      const zScore = this.calculateZScore(
        metadata.brightness,
        this.baselineStats.brightness.mean,
        this.baselineStats.brightness.std
      );

      if (Math.abs(zScore) > 2) {
        anomalies.push({
          type: 'statistical',
          name: 'brightness_anomaly',
          severity: 'medium',
          message: `Brightness (${metadata.brightness}) is unusual`,
          value: { zScore: Math.round(zScore * 100) / 100, brightness: metadata.brightness }
        });
      }
    }

    return anomalies;
  }

  calculateZScore(value, mean, std) {
    return std > 0 ? (value - mean) / std : 0;
  }

  calculateAnomalySeverity(anomalies) {
    const severityWeights = {
      high: 10,
      medium: 5,
      low: 2,
      info: 1,
      warning: 3
    };

    const totalWeight = anomalies.reduce((sum, a) => {
      return sum + (severityWeights[a.severity] || 1);
    }, 0);

    const maxPossible = anomalies.length * 10;
    return Math.round((totalWeight / maxPossible) * 100);
  }

  determineRiskLevel(severityScore) {
    if (severityScore >= 50) return 'critical';
    if (severityScore >= 30) return 'high';
    if (severityScore >= 15) return 'medium';
    return 'low';
  }

  generateAnomalyRecommendations(anomalies) {
    const recommendations = [];

    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
    const mediumSeverityAnomalies = anomalies.filter(a => a.severity === 'medium');

    if (highSeverityAnomalies.some(a => a.type === 'exposure')) {
      recommendations.push({
        action: 'adjust_exposure',
        priority: 'high',
        description: 'Adjust image exposure before processing'
      });
    }

    if (highSeverityAnomalies.some(a => a.name === 'low_resolution')) {
      recommendations.push({
        action: 'upscale_image',
        priority: 'high',
        description: 'Image resolution too low - consider upscaling or requesting higher resolution image'
      });
    }

    if (mediumSeverityAnomalies.some(a => a.type === 'quality')) {
      recommendations.push({
        action: 'enhance_image',
        priority: 'medium',
        description: 'Apply image enhancement to improve quality'
      });
    }

    if (anomalies.some(a => a.name === 'low_confidence')) {
      recommendations.push({
        action: 'retry_detection',
        priority: 'medium',
        description: 'Re-attempt detection with different parameters'
      });
    }

    if (anomalies.length === 0) {
      recommendations.push({
        action: 'proceed_normal',
        priority: 'info',
        description: 'No anomalies detected - proceed with normal processing'
      });
    }

    return recommendations;
  }

  calculateDetectionConfidence(anomalies) {
    const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;
    const totalCount = anomalies.length;
    
    // Higher anomaly count reduces confidence
    const confidence = Math.max(100 - (highSeverityCount * 15) - (totalCount * 3), 20);
    return Math.round(confidence);
  }

  getDefaultAnomalyResult() {
    return {
      anomalies: [],
      severityScore: 0,
      riskLevel: 'low',
      recommendations: [{
        action: 'proceed_normal',
        priority: 'info',
        description: 'Unable to analyze - proceeding with default processing'
      }],
      isAnomalous: false,
      confidence: 50
    };
  }

  /**
   * Update baseline stats with new data (learning)
   */
  updateBaseline(newStats) {
    // Simple moving average update
    const alpha = 0.1;
    
    this.baselineStats.quality.mean = 
      alpha * newStats.quality + (1 - alpha) * this.baselineStats.quality.mean;
    this.baselineStats.brightness.mean = 
      alpha * newStats.brightness + (1 - alpha) * this.baselineStats.brightness.mean;
    this.baselineStats.contrast.mean = 
      alpha * newStats.contrast + (1 - alpha) * this.baselineStats.contrast.mean;
  }

  /**
   * Detect anomalies in batch
   */
  async batchDetect(imagePaths) {
    const results = await Promise.all(
      imagePaths.map(async (path) => ({
        path,
        result: await this.detectAnomalies(path)
      }))
    );
    return results;
  }
}

module.exports = new AnomalyDetectionAgent();