/**
 * AI Agent: Image Analysis Agent
 * Analyzes images for quality, characteristics, defects, and optimal processing paths
 */

const sharp = require('sharp');
const path = require('path');

class ImageAnalysisAgent {
  constructor() {
    this.analysisCache = new Map();
  }

  /**
   * Analyze an image and return comprehensive characteristics
   */
  async analyze(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await this.getImageStats(imagePath);
      
      const analysis = {
        dimensions: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.width / metadata.height
        },
        format: metadata.format,
        colorSpace: metadata.space,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
        density: metadata.density,
        quality: this.assessQuality(stats),
        brightness: this.calculateBrightness(stats),
        contrast: this.calculateContrast(stats),
        sharpness: await this.estimateSharpness(imagePath),
        noiseLevel: this.estimateNoise(stats),
        histogram: stats.histogram,
        dominantColors: await this.extractDominantColors(imagePath),
        recommendations: this.generateRecommendations(stats, metadata),
        confidence: this.calculateConfidence(stats)
      };

      return analysis;
    } catch (error) {
      console.error('ImageAnalysisAgent error:', error);
      return this.getDefaultAnalysis();
    }
  }

  async getImageStats(imagePath) {
    const image = sharp(imagePath);
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const stats = {
      min: [255, 255, 255],
      max: [0, 0, 0],
      sum: [0, 0, 0],
      sumSq: [0, 0, 0],
      histogram: { r: [], g: [], b: [] }
    };

    const pixels = info.width * info.height;
    const channels = info.channels;

    for (let i = 0; i < pixels; i++) {
      for (let c = 0; c < channels; c++) {
        const value = data[i * channels + c];
        stats.min[c] = Math.min(stats.min[c], value);
        stats.max[c] = Math.max(stats.max[c], value);
        stats.sum[c] += value;
        stats.sumSq[c] += value * value;
      }
    }

    // Calculate histogram (simplified)
    for (let c = 0; c < 3; c++) {
      stats.histogram[c] = Array(256).fill(0);
    }

    // Build histogram
    const buffer = await sharp(imagePath)
      .raw()
      .toBuffer();
    
    for (let i = 0; i < buffer.length; i += channels) {
      if (channels >= 3) {
        stats.histogram[0][buffer[i]]++;
        stats.histogram[1][buffer[i + 1]]++;
        stats.histogram[2][buffer[i + 2]]++;
      }
    }

    return stats;
  }

  assessQuality(stats) {
    const { min, max, sum, sumSq } = stats;
    let qualityScore = 0;

    // Dynamic range contribution
    for (let c = 0; c < 3; c++) {
      const range = max[c] - min[c];
      qualityScore += Math.min(range / 255, 1) * 25;
    }

    // Contrast contribution
    for (let c = 0; c < 3; c++) {
      const mean = sum[c] / (stats.histogram.r.length || 1);
      const variance = (sumSq[c] / (stats.histogram.r.length || 1)) - (mean * mean);
      const stdDev = Math.sqrt(Math.max(variance, 0));
      qualityScore += Math.min(stdDev / 128, 1) * 25;
    }

    // Distribution contribution
    const totalPixels = stats.histogram.r.reduce((a, b) => a + b, 0);
    const distributionScore = this.assessHistogramDistribution(stats.histogram, totalPixels);
    qualityScore += distributionScore * 25;

    return Math.round(qualityScore);
  }

  assessHistogramDistribution(histogram, totalPixels) {
    let score = 0;
    const threshold = totalPixels * 0.01;

    for (let c = 0; c < 3; c++) {
      const hist = histogram[c];
      let emptyBuckets = 0;
      
      for (let i = 0; i < 256; i += 16) {
        let bucketSum = 0;
        for (let j = i; j < i + 16 && j < 256; j++) {
          bucketSum += hist[j];
        }
        if (bucketSum < threshold) emptyBuckets++;
      }
      
      score += (1 - emptyBuckets / 16);
    }

    return score / 3;
  }

  calculateBrightness(stats) {
    const { sum } = stats;
    const totalPixels = stats.histogram.r.reduce((a, b) => a + b, 1);
    const brightness = ((sum[0] + sum[1] + sum[2]) / 3) / totalPixels;
    return Math.round(brightness);
  }

  calculateContrast(stats) {
    const { min, max } = stats;
    let totalContrast = 0;
    for (let c = 0; c < 3; c++) {
      totalContrast += (max[c] - min[c]);
    }
    return Math.round(totalContrast / 3);
  }

  async estimateSharpness(imagePath) {
    try {
      const { data, info } = await sharp(imagePath)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      let laplacianSum = 0;
      const width = info.width;
      const height = info.height;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          const pixel = data[idx];
          
          const neighbors = [
            data[(y - 1) * width + x],
            data[(y + 1) * width + x],
            data[y * width + (x - 1)],
            data[y * width + (x + 1)]
          ];

          const laplacian = Math.abs(4 * pixel - neighbors.reduce((a, b) => a + b, 0));
          laplacianSum += laplacian;
        }
      }

      const sharpness = (laplacianSum / ((width - 2) * (height - 2))) / 255;
      return Math.round(Math.min(sharpness * 100, 100));
    } catch (error) {
      return 50;
    }
  }

  estimateNoise(stats) {
    const { min, max, sum, sumSq } = stats;
    let noiseScore = 0;
    const totalPixels = stats.histogram.r.reduce((a, b) => a + b, 1);

    for (let c = 0; c < 3; c++) {
      const mean = sum[c] / totalPixels;
      const variance = (sumSq[c] / totalPixels) - (mean * mean);
      const stdDev = Math.sqrt(Math.max(variance, 0));
      
      // Higher stdDev relative to mean suggests more noise
      const normalizedNoise = stdDev / (mean + 1);
      noiseScore += normalizedNoise;
    }

    const noiseLevel = Math.min((noiseScore / 3) * 50, 100);
    return Math.round(noiseLevel);
  }

  async extractDominantColors(imagePath, count = 5) {
    try {
      const { data, info } = await sharp(imagePath)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer();

      const colorMap = new Map();
      const pixelCount = info.width * info.height;

      for (let i = 0; i < pixelCount; i += 3) {
        if (info.channels >= 3) {
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i + 1] / 32) * 32;
          const b = Math.round(data[i + 2] / 32) * 32;
          const key = `${r},${g},${b}`;
          
          colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }
      }

      const sorted = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([color, freq]) => {
          const [r, g, b] = color.split(',').map(Number);
          return {
            rgb: { r, g, b },
            hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
            frequency: Math.round((freq / pixelCount) * 100)
          };
        });

      return sorted;
    } catch (error) {
      return [];
    }
  }

  generateRecommendations(stats, metadata) {
    const recommendations = [];
    const quality = this.assessQuality(stats);
    const brightness = this.calculateBrightness(stats);
    const contrast = this.calculateContrast(stats);
    const sharpness = 50; // Would need async call to get real value
    const noise = this.estimateNoise(stats);

    if (quality < 50) {
      recommendations.push({
        type: 'enhancement',
        priority: 'high',
        action: 'apply_denoise',
        reason: 'Low image quality detected'
      });
    }

    if (brightness < 80) {
      recommendations.push({
        type: 'enhancement',
        priority: 'medium',
        action: 'increase_brightness',
        reason: 'Image is too dark'
      });
    } else if (brightness > 200) {
      recommendations.push({
        type: 'enhancement',
        priority: 'medium',
        action: 'decrease_brightness',
        reason: 'Image is too bright'
      });
    }

    if (contrast < 100) {
      recommendations.push({
        type: 'enhancement',
        priority: 'medium',
        action: 'increase_contrast',
        reason: 'Low contrast detected'
      });
    }

    if (noise > 40) {
      recommendations.push({
        type: 'preprocessing',
        priority: 'high',
        action: 'apply_noise_reduction',
        reason: 'High noise level detected'
      });
    }

    if (metadata.width < 800 || metadata.height < 600) {
      recommendations.push({
        type: 'warning',
        priority: 'low',
        action: 'warn_low_resolution',
        reason: 'Low resolution may affect OCR accuracy'
      });
    }

    return recommendations;
  }

  calculateConfidence(stats) {
    // Calculate confidence based on various factors
    const totalPixels = stats.histogram.r.reduce((a, b) => a + b, 1);
    const entropy = this.calculateEntropy(stats.histogram, totalPixels);
    
    // Normalize entropy (0-1 range, higher is better)
    const normalizedEntropy = Math.min(entropy / 8, 1);
    
    return Math.round(normalizedEntropy * 100);
  }

  calculateEntropy(histogram, totalPixels) {
    let entropy = 0;
    
    for (let c = 0; c < 3; c++) {
      for (let i = 0; i < 256; i++) {
        const p = histogram[c][i] / totalPixels;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }
    }
    
    return entropy / 3;
  }

  getDefaultAnalysis() {
    return {
      dimensions: { width: 0, height: 0, aspectRatio: 1 },
      format: 'unknown',
      colorSpace: 'unknown',
      quality: 50,
      brightness: 128,
      contrast: 100,
      sharpness: 50,
      noiseLevel: 30,
      recommendations: [],
      confidence: 50
    };
  }

  /**
   * Batch analyze multiple images
   */
  async batchAnalyze(imagePaths) {
    const results = await Promise.all(
      imagePaths.map(async (path) => ({
        path,
        analysis: await this.analyze(path)
      }))
    );
    return results;
  }

  /**
   * Get processing recommendation based on analysis
   */
  getProcessingRecommendation(analysis) {
    const pipeline = [];

    if (analysis.noiseLevel > 40) {
      pipeline.push('denoise');
    }

    if (analysis.brightness < 80) {
      pipeline.push('brightness');
    } else if (analysis.brightness > 200) {
      pipeline.push('brightness');
    }

    if (analysis.contrast < 100) {
      pipeline.push('contrast');
    }

    if (analysis.sharpness < 40) {
      pipeline.push('sharpen');
    }

    return pipeline;
  }
}

module.exports = new ImageAnalysisAgent();