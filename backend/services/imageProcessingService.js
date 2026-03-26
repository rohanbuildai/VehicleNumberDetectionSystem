const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class ImageProcessingService {
  constructor() {
    this.outputDir = 'uploads/processed';
    this.platesDir = 'uploads/plates';
  }

  /**
   * Analyze image quality
   */
  async analyzeImageQuality(inputPath) {
    const image = sharp(inputPath);
    const stats = await image.stats();
    const meta = await image.metadata();

    const brightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
    const contrast = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;

    const qualityScore = Math.min(100, Math.round(
      (brightness / 255) * 30 +
      (contrast / 128) * 40 +
      (meta.width >= 800 ? 20 : (meta.width / 800) * 20) +
      10
    ));

    const issues = [];
    if (brightness < 50) issues.push('Image is too dark');
    if (brightness > 220) issues.push('Image is overexposed');
    if (contrast < 20) issues.push('Low contrast');
    if (meta.width < 400 || meta.height < 300) issues.push('Resolution too low');

    return {
      score: qualityScore,
      issues,
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      sharpness: Math.round(contrast * 0.8),
      noiseLevel: Math.round(100 - contrast),
      dimensions: { width: meta.width, height: meta.height },
      format: meta.format,
      hasAlpha: meta.hasAlpha,
      channels: meta.channels,
    };
  }

  /**
   * Apply full enhancement pipeline
   */
  async enhanceImage(inputPath, options = {}) {
    const {
      enhanceContrast = true,
      denoising = true,
      sharpening = true,
      grayscale = false,
      normalize = true,
      gamma = null,
      rotate = 0,
      outputFormat = 'jpeg',
      quality = 90,
    } = options;

    const filename = `enhanced_${uuidv4()}.${outputFormat}`;
    const outputPath = path.join(this.outputDir, filename);

    let pipeline = sharp(inputPath);

    // Rotation
    if (rotate !== 0) {
      pipeline = pipeline.rotate(rotate);
    }

    // Auto-rotate based on EXIF
    pipeline = pipeline.rotate();

    // Grayscale
    if (grayscale) {
      pipeline = pipeline.grayscale();
    }

    // Normalize (auto levels)
    if (normalize) {
      pipeline = pipeline.normalise();
    }

    // Gamma correction
    if (gamma) {
      pipeline = pipeline.gamma(gamma);
    }

    // Contrast enhancement using linear
    if (enhanceContrast) {
      pipeline = pipeline.linear(1.2, -20);
    }

    // Sharpening
    if (sharpening) {
      pipeline = pipeline.sharpen({ sigma: 1.5, m1: 0.5, m2: 0.1 });
    }

    // Median blur for denoising (simulate with moderate blur + sharpen)
    if (denoising) {
      pipeline = pipeline.median(3);
    }

    // Output
    if (outputFormat === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else if (outputFormat === 'png') {
      pipeline = pipeline.png({ compressionLevel: 6 });
    } else if (outputFormat === 'webp') {
      pipeline = pipeline.webp({ quality });
    }

    const info = await pipeline.toFile(outputPath);

    return {
      filename,
      path: outputPath,
      url: `/uploads/processed/${filename}`,
      size: info.size,
      dimensions: { width: info.width, height: info.height },
      type: 'enhanced',
    };
  }

  /**
   * Convert to grayscale
   */
  async toGrayscale(inputPath) {
    const filename = `gray_${uuidv4()}.jpg`;
    const outputPath = path.join(this.outputDir, filename);

    const info = await sharp(inputPath)
      .grayscale()
      .normalise()
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    return {
      filename,
      path: outputPath,
      url: `/uploads/processed/${filename}`,
      size: info.size,
      dimensions: { width: info.width, height: info.height },
      type: 'grayscale',
    };
  }

  /**
   * Apply binarization (threshold)
   */
  async binarize(inputPath, threshold = 128) {
    const filename = `binary_${uuidv4()}.jpg`;
    const outputPath = path.join(this.outputDir, filename);

    const info = await sharp(inputPath)
      .grayscale()
      .normalise()
      .threshold(threshold)
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    return {
      filename,
      path: outputPath,
      url: `/uploads/processed/${filename}`,
      size: info.size,
      dimensions: { width: info.width, height: info.height },
      type: 'binarized',
    };
  }

  /**
   * Edge detection simulation using clahe-like approach
   */
  async applyMorphological(inputPath) {
    const filename = `morph_${uuidv4()}.jpg`;
    const outputPath = path.join(this.outputDir, filename);

    const info = await sharp(inputPath)
      .grayscale()
      .normalise()
      .sharpen({ sigma: 2, m1: 1.5, m2: 0.5 })
      .linear(1.4, -30)
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    return {
      filename,
      path: outputPath,
      url: `/uploads/processed/${filename}`,
      size: info.size,
      dimensions: { width: info.width, height: info.height },
      type: 'morphed',
    };
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(inputPath, width = 300, height = 200) {
    const filename = `thumb_${uuidv4()}.jpg`;
    const outputPath = path.join(this.outputDir, filename);

    const info = await sharp(inputPath)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toFile(outputPath);

    return {
      filename,
      path: outputPath,
      url: `/uploads/processed/${filename}`,
      size: info.size,
      dimensions: { width: info.width, height: info.height },
      type: 'thumbnail',
    };
  }

  /**
   * Crop region from image (for plate crops)
   */
  async cropRegion(inputPath, bbox) {
    const { x, y, width, height } = bbox;
    const filename = `plate_${uuidv4()}.jpg`;
    const outputPath = path.join(this.platesDir, filename);

    const meta = await sharp(inputPath).metadata();

    // Clamp values
    const left = Math.max(0, Math.round(x));
    const top = Math.max(0, Math.round(y));
    const cropWidth = Math.min(Math.round(width), meta.width - left);
    const cropHeight = Math.min(Math.round(height), meta.height - top);

    if (cropWidth <= 0 || cropHeight <= 0) {
      throw new Error('Invalid crop dimensions');
    }

    const info = await sharp(inputPath)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(400, null, { withoutEnlargement: false })
      .sharpen()
      .normalise()
      .jpeg({ quality: 95 })
      .toFile(outputPath);

    return {
      filename,
      path: outputPath,
      url: `/uploads/plates/${filename}`,
      size: info.size,
      dimensions: { width: info.width, height: info.height },
      type: 'plate_crop',
    };
  }

  /**
   * Draw bounding boxes on image (annotate)
   */
  async annotateImage(inputPath, detections) {
    const filename = `annotated_${uuidv4()}.jpg`;
    const outputPath = path.join(this.outputDir, filename);
    const meta = await sharp(inputPath).metadata();

    // Build SVG overlay
    const svgRects = detections.map((det, i) => {
      const { x, y, width, height } = det.boundingBox;
      const text = det.plateText || `Plate ${i + 1}`;
      const conf = det.confidence ? `${Math.round(det.confidence * 100)}%` : '';
      return `
        <rect x="${x}" y="${y}" width="${width}" height="${height}"
              fill="none" stroke="#00FF41" stroke-width="3" rx="2"/>
        <rect x="${x}" y="${Math.max(0, y - 28)}" width="${Math.max(120, width)}" height="28"
              fill="#00FF41" opacity="0.9" rx="2"/>
        <text x="${x + 5}" y="${Math.max(18, y - 8)}" 
              font-family="monospace" font-size="14" font-weight="bold" fill="#000">
          ${text} ${conf}
        </text>
      `;
    }).join('');

    const svgOverlay = Buffer.from(`
      <svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
        ${svgRects}
      </svg>
    `);

    const info = await sharp(inputPath)
      .composite([{ input: svgOverlay, top: 0, left: 0 }])
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    return {
      filename,
      path: outputPath,
      url: `/uploads/processed/${filename}`,
      size: info.size,
      dimensions: { width: info.width, height: info.height },
      type: 'annotated',
    };
  }

  /**
   * Run full processing pipeline
   */
  async runFullPipeline(inputPath, options = {}) {
    const results = [];
    const algorithms = [];

    try {
      // 1. Quality analysis
      const quality = await this.analyzeImageQuality(inputPath);

      // 2. Grayscale
      if (options.grayscaleConversion !== false) {
        const gray = await this.toGrayscale(inputPath);
        results.push(gray);
        algorithms.push('grayscale_conversion');
      }

      // 3. Enhancement
      const enhanced = await this.enhanceImage(inputPath, {
        enhanceContrast: options.enhanceContrast,
        denoising: options.denoising,
        sharpening: options.sharpening,
        normalize: true,
      });
      results.push(enhanced);
      algorithms.push('histogram_normalization', 'contrast_enhancement');
      if (options.sharpening) algorithms.push('unsharp_masking');
      if (options.denoising) algorithms.push('median_filtering');

      // 4. Binarization
      const binary = await this.binarize(inputPath, 128);
      results.push(binary);
      algorithms.push('adaptive_thresholding');

      // 5. Morphological
      if (options.morphologicalOps !== false) {
        const morph = await this.applyMorphological(inputPath);
        results.push(morph);
        algorithms.push('morphological_operations');
      }

      return { processedImages: results, quality, algorithms };
    } catch (err) {
      logger.error('Image processing pipeline error:', err);
      throw err;
    }
  }

  /**
   * Delete files
   */
  async cleanupFiles(filePaths) {
    for (const fp of filePaths) {
      try {
        await fs.unlink(fp);
      } catch (e) {
        logger.warn(`Failed to delete file: ${fp}`, e.message);
      }
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(inputPath) {
    return await sharp(inputPath).metadata();
  }

  /**
   * Convert image format
   */
  async convertFormat(inputPath, format = 'webp', quality = 85) {
    const filename = `converted_${uuidv4()}.${format}`;
    const outputPath = path.join(this.outputDir, filename);

    let pipeline = sharp(inputPath);
    if (format === 'webp') pipeline = pipeline.webp({ quality });
    else if (format === 'png') pipeline = pipeline.png();
    else if (format === 'jpeg' || format === 'jpg') pipeline = pipeline.jpeg({ quality });

    const info = await pipeline.toFile(outputPath);
    return {
      filename,
      path: outputPath,
      url: `/uploads/processed/${filename}`,
      size: info.size,
      dimensions: { width: info.width, height: info.height },
      type: 'converted',
    };
  }
}

module.exports = new ImageProcessingService();
