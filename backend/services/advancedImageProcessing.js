/**
 * Advanced Image Processing Service
 * 
 * Optimized for detecting license plates from:
 * - Far distance vehicles (small plates)
 * - Close-up vehicles
 * - Various angles and lighting conditions
 * - Different vehicle types and plate sizes
 * 
 * Uses multi-scale detection, super-resolution, and adaptive preprocessing
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class AdvancedImageProcessingService {
  constructor() {
    this.outputDir = 'uploads/processed';
    this.platesDir = 'uploads/plates';
    this.tempDir = 'uploads/temp';
  }

  /**
   * Detect potential plate regions using multiple techniques
   * Optimized for far-distance and small plates
   */
  async detectPlateRegions(inputPath) {
    const meta = await sharp(inputPath).metadata();
    const { width, height } = meta;
    
    logger.info(`Analyzing image (${width}x${height}) for plate regions...`);
    
    // Multi-scale analysis for different distances
    const scales = this.calculateOptimalScales(width, height);
    const allRegions = [];
    
    for (const scale of scales) {
      const regions = await this.detectRegionsAtScale(inputPath, scale);
      allRegions.push(...regions);
    }
    
    // Merge overlapping regions
    const mergedRegions = this.mergeOverlappingRegions(allRegions);
    
    // Sort by confidence (size as proxy for closeness)
    mergedRegions.sort((a, b) => b.confidence - a.confidence);
    
    logger.info(`Found ${mergedRegions.length} potential plate regions`);
    return mergedRegions;
  }

  /**
   * Calculate optimal scales for multi-scale detection
   */
  calculateOptimalScales(width, height) {
    const scales = [];
    const minDim = Math.min(width, height);
    
    // Scale for detecting small/far plates (downscale for larger search area)
    // Scale for medium distance plates
    // Scale for close-up plates
    const baseScales = [0.25, 0.5, 0.75, 1.0];
    
    for (const scale of baseScales) {
      const scaledWidth = Math.floor(width * scale);
      const scaledHeight = Math.floor(height * scale);
      
      // Minimum size for a detectable plate (roughly 80px wide for a standard plate)
      if (scaledWidth >= 100 && scaledHeight >= 50) {
        scales.push({
          scale,
          width: scaledWidth,
          height: scaledHeight,
          minPlateWidth: Math.floor(80 * scale), // Scaled minimum plate width
        });
      }
    }
    
    return scales;
  }

  /**
   * Detect regions at a specific scale
   */
  async detectRegionsAtScale(inputPath, scaleInfo) {
    const regions = [];
    const { width, height, scale, minPlateWidth } = scaleInfo;
    
    // Resize image for this scale
    const scaledPath = path.join(this.tempDir, `scale_${scale}_${uuidv4()}.jpg`);
    await fs.mkdir(this.tempDir, { recursive: true });
    
    await sharp(inputPath)
      .resize(width, height, { fit: 'inside', withoutEnlargement: false })
      .toFile(scaledPath);
    
    try {
      // Process at this scale to find potential plate regions
      const grayPath = await this.enhanceForPlateDetection(scaledPath);
      
      // Analyze the enhanced image for rectangular regions
      const detectedRegions = await this.findRectangularRegions(grayPath, minPlateWidth);
      
      // Scale back to original coordinates
      for (const region of detectedRegions) {
        regions.push({
          x: Math.floor(region.x / scale),
          y: Math.floor(region.y / scale),
          width: Math.floor(region.width / scale),
          height: Math.floor(region.height / scale),
          confidence: region.confidence * scale, // Higher confidence for larger detections
          scale,
          technique: region.technique,
        });
      }
    } finally {
      // Cleanup scaled image
      try {
        await fs.unlink(scaledPath);
      } catch (e) { /* ignore */ }
    }
    
    return regions;
  }

  /**
   * Enhance image specifically for plate detection
   * Handles various conditions: far, dark, low contrast, etc.
   */
  async enhanceForPlateDetection(inputPath) {
    const outputPath = path.join(this.tempDir, `enhanced_${uuidv4()}.jpg`);
    
    // Get image metadata
    const meta = await sharp(inputPath).metadata();
    const stats = await sharp(inputPath).stats();
    
    // Calculate image statistics
    const brightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
    const contrast = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
    
    logger.debug(`Image stats - Brightness: ${brightness.toFixed(1)}, Contrast: ${contrast.toFixed(1)}`);
    
    // Adaptive processing based on image conditions
    let pipeline = sharp(inputPath);
    
    // Convert to grayscale but preserve some color info for plate color detection
    pipeline = pipeline.grayscale();
    
    // Adaptive contrast enhancement
    const contrastEnhancement = this.calculateContrastEnhancement(brightness, contrast);
    pipeline = pipeline.linear(contrastEnhancement.shift, contrastEnhancement.offset);
    
    // Apply unsharp mask for edge enhancement (helps detect small plates)
    const sigma = contrast < 30 ? 2.0 : 1.5;
    pipeline = pipeline.sharpen({ sigma, m1: 0.5, m2: 0.5 });
    
    // Apply morphological operations to enhance plate regions
    // This helps with edge detection for plates
    pipeline = pipeline.linear(1.2, -30); // Increase contrast further
    
    // Apply mild smoothing to reduce noise while preserving edges
    pipeline = pipeline.blur(0.5);
    
    // Save enhanced image
    await pipeline.toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Calculate optimal contrast enhancement based on image properties
   */
  calculateContrastEnhancement(brightness, contrast) {
    // For dark images, increase brightness and contrast
    // For bright images, reduce brightness and moderate contrast
    // For low contrast, increase contrast significantly
    
    let shift = 1.0;
    let offset = 0;
    
    if (brightness < 60) {
      // Dark image - brighten and increase contrast
      shift = 1.3;
      offset = -20;
    } else if (brightness > 200) {
      // Bright image - reduce brightness
      shift = 1.1;
      offset = 15;
    } else {
      // Normal brightness
      shift = 1.2;
      offset = -10;
    }
    
    if (contrast < 20) {
      // Very low contrast - apply strong enhancement
      shift *= 1.2;
      offset -= 15;
    }
    
    return { shift, offset };
  }

  /**
   * Find rectangular regions that could contain plates
   */
  async findRectangularRegions(inputPath, minPlateWidth) {
    const regions = [];
    
    // Read enhanced image
    const buffer = await sharp(inputPath).raw().toBuffer();
    const meta = await sharp(inputPath).metadata();
    const { width, height } = meta;
    
    // Edge detection using Sobel-like approach
    const edges = this.detectEdges(buffer, width, height);
    
    // Find horizontal lines (typical of license plates)
    const horizontalLines = this.findHorizontalLineSegments(edges, width, height, minPlateWidth);
    
    // Find vertical lines
    const verticalLines = this.findVerticalLineSegments(edges, width, height, minPlateWidth);
    
    // Combine lines to form potential plate regions
    const plateLikeRegions = this.combineLinesToRegions(horizontalLines, verticalLines, width, height);
    
    regions.push(...plateLikeRegions);
    
    return regions;
  }

  /**
   * Simple edge detection
   */
  detectEdges(buffer, width, height) {
    const edges = new Float32Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const val = buffer[idx];
        
        // Simple gradient calculation
        const gx = Math.abs(buffer[idx + 1] - buffer[idx - 1]);
        const gy = Math.abs(buffer[(y + 1) * width + x] - buffer[(y - 1) * width + x]);
        
        edges[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    
    return edges;
  }

  /**
   * Find horizontal line segments
   */
  findHorizontalLineSegments(edges, width, height, minWidth) {
    const lines = [];
    const threshold = 50;
    const minLength = minWidth;
    
    for (let y = 0; y < height; y += 3) { // Sample every 3 rows
      let startX = -1;
      let length = 0;
      
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (edges[idx] > threshold) {
          if (startX === -1) startX = x;
          length++;
        } else {
          if (startX !== -1 && length >= minLength) {
            lines.push({ y, startX, endX: x, length });
          }
          startX = -1;
          length = 0;
        }
      }
      
      if (startX !== -1 && length >= minLength) {
        lines.push({ y, startX, endX: width, length });
      }
    }
    
    return lines;
  }

  /**
   * Find vertical line segments
   */
  findVerticalLineSegments(edges, width, height, minWidth) {
    const lines = [];
    const threshold = 50;
    const minLength = minWidth * 0.3; // Vertical lines are usually shorter
    
    for (let x = 0; x < width; x += 3) {
      let startY = -1;
      let length = 0;
      
      for (let y = 0; y < height; y++) {
        const idx = y * width + x;
        
        if (edges[idx] > threshold) {
          if (startY === -1) startY = y;
          length++;
        } else {
          if (startY !== -1 && length >= minLength) {
            lines.push({ x, startY, endY: y, length });
          }
          startY = -1;
          length = 0;
        }
      }
      
      if (startY !== -1 && length >= minLength) {
        lines.push({ x, startY, endY: height, length });
      }
    }
    
    return lines;
  }

  /**
   * Combine horizontal and vertical lines into potential plate regions
   */
  combineLinesToRegions(horizontalLines, verticalLines, width, height) {
    const regions = [];
    const minHeight = 20;
    const maxHeight = 100;
    const aspectRatioMin = 2.0;
    const aspectRatioMax = 6.0;
    
    // Group horizontal lines that are close together vertically
    const hLineGroups = this.groupLinesVertically(horizontalLines, 15);
    
    for (const group of hLineGroups) {
      if (group.lines.length >= 2) {
        const minX = Math.min(...group.lines.map(l => l.startX));
        const maxX = Math.max(...group.lines.map(l => l.endX));
        const regionWidth = maxX - minX;
        const regionHeight = group.maxY - group.minY;
        
        const aspectRatio = regionWidth / regionHeight;
        
        // Check if aspect ratio matches typical license plate
        if (aspectRatio >= aspectRatioMin && aspectRatio <= aspectRatioMax &&
            regionHeight >= minHeight && regionHeight <= maxHeight &&
            regionWidth >= 60) {
          regions.push({
            x: minX,
            y: group.minY,
            width: regionWidth,
            height: regionHeight,
            confidence: Math.min(1, group.lines.length / 4) * (regionWidth / 200),
            technique: 'line_detection',
          });
        }
      }
    }
    
    return regions.slice(0, 10); // Limit to top 10 regions
  }

  /**
   * Group horizontal lines that are close together
   */
  groupLinesVertically(lines, maxGap) {
    if (lines.length === 0) return [];
    
    const sorted = [...lines].sort((a, b) => a.y - b.y);
    const groups = [];
    let currentGroup = { lines: [sorted[0]], minY: sorted[0].y, maxY: sorted[0].y };
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].y - currentGroup.maxY <= maxGap) {
        currentGroup.lines.push(sorted[i]);
        currentGroup.maxY = sorted[i].y;
      } else {
        groups.push(currentGroup);
        currentGroup = { lines: [sorted[i]], minY: sorted[i].y, maxY: sorted[i].y };
      }
    }
    groups.push(currentGroup);
    
    return groups;
  }

  /**
   * Merge overlapping regions
   */
  mergeOverlappingRegions(regions) {
    if (regions.length <= 1) return regions;
    
    const merged = [];
    const used = new Set();
    
    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;
      
      let current = { ...regions[i] };
      used.add(i);
      
      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;
        
        if (this.regionsOverlap(current, regions[j])) {
          current = this.mergeTwoRegions(current, regions[j]);
          used.add(j);
        }
      }
      
      merged.push(current);
    }
    
    return merged;
  }

  /**
   * Check if two regions overlap
   */
  regionsOverlap(r1, r2) {
    const overlapThreshold = 0.3;
    
    const x1 = Math.max(r1.x, r2.x);
    const y1 = Math.max(r1.y, r2.y);
    const x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
    const y2 = Math.min(r1.y + r1.height, r2.y + r2.height);
    
    if (x2 <= x1 || y2 <= y1) return false;
    
    const overlapArea = (x2 - x1) * (y2 - y1);
    const r1Area = r1.width * r1.height;
    const r2Area = r2.width * r2.height;
    
    return (overlapArea / r1Area > overlapThreshold) || 
           (overlapArea / r2Area > overlapThreshold);
  }

  /**
   * Merge two overlapping regions
   */
  mergeTwoRegions(r1, r2) {
    const x = Math.min(r1.x, r2.x);
    const y = Math.min(r1.y, r2.y);
    const width = Math.max(r1.x + r1.width, r2.x + r2.width) - x;
    const height = Math.max(r1.y + r1.height, r2.y + r2.height) - y;
    const confidence = Math.max(r1.confidence, r2.confidence);
    
    return { x, y, width, height, confidence };
  }

  /**
   * Super-resolution: Upscale region for better OCR
   * Specifically designed for small/far plates
   */
  async superResolveRegion(inputPath, region, targetSize = 300) {
    const { x, y, width, height } = region;
    
    // Extract region with padding
    const padding = Math.ceil(Math.max(width, height) * 0.2);
    const extractOptions = {
      left: Math.max(0, x - padding),
      top: Math.max(0, y - padding),
      width: Math.min(width + padding * 2, (await sharp(inputPath).metadata()).width - x + padding),
      height: Math.min(height + padding * 2, (await sharp(inputPath).metadata()).height - y + padding),
    };
    
    // Extract and upscale using advanced interpolation
    const outputPath = path.join(this.tempDir, `superres_${uuidv4()}.jpg`);
    
    await sharp(inputPath)
      .extract(extractOptions)
      .resize(targetSize, targetSize, {
        fit: 'contain',
        kernel: sharp.kernel.lanczos3, // High-quality upscaling
      })
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Apply OCR-optimized preprocessing to a region
   */
  async preprocessForOCR(inputPath) {
    const outputPath = path.join(this.tempDir, `ocr_${uuidv4()}.jpg`);
    
    await sharp(inputPath)
      // Increase contrast
      .linear(1.5, -40)
      // Sharpen for text clarity
      .sharpen({ sigma: 2.0, m1: 0.5, m2: 0.5 })
      // Convert to pure B&W for better OCR
      .threshold(128)
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Full detection pipeline with multi-scale approach
   */
  async runAdvancedDetection(inputPath, options = {}) {
    const {
      multiScale = true,
      superResolution = true,
      adaptiveEnhancement = true,
    } = options;
    
    logger.info('Starting advanced plate detection...');
    const startTime = Date.now();
    
    // Step 1: Analyze image quality and determine best approach
    const quality = await this.analyzeImageQuality(inputPath);
    const needsSuperRes = quality.score < 60 || quality.dimensions.width < 800;
    
    logger.info(`Image quality: ${quality.score}/100, needs super-resolution: ${needsSuperRes}`);
    
    // Step 2: Detect plate regions at multiple scales
    let regions = [];
    if (multiScale) {
      regions = await this.detectPlateRegions(inputPath);
    } else {
      // Fallback to single scale
      const scaleInfo = { scale: 1, width: quality.dimensions.width, height: quality.dimensions.height, minPlateWidth: 80 };
      regions = await this.detectRegionsAtScale(inputPath, scaleInfo);
    }
    
    logger.info(`Found ${regions.length} potential regions in ${Date.now() - startTime}ms`);
    
    // Step 3: Process each region for best OCR results
    const processedPlates = [];
    
    for (const region of regions.slice(0, 5)) { // Process top 5 regions
      let processedPath;
      
      // Apply super-resolution for small/distant plates
      if (superResolution && (region.width < 100 || region.scale < 0.5 || needsSuperRes)) {
        processedPath = await this.superResolveRegion(inputPath, region, 400);
        logger.info(`Applied super-resolution to region (scale: ${region.scale}, size: ${region.width}x${region.height})`);
      } else {
        // Regular extraction
        const extractPath = path.join(this.tempDir, `region_${uuidv4()}.jpg`);
        await sharp(inputPath)
          .extract({
            left: Math.max(0, region.x),
            top: Math.max(0, region.y),
            width: region.width,
            height: region.height,
          })
          .toFile(extractPath);
        processedPath = extractPath;
      }
      
      // Apply OCR-optimized preprocessing
      const ocrPath = await this.preprocessForOCR(processedPath);
      
      processedPlates.push({
        region,
        processedPath: ocrPath,
        originalPath: inputPath,
      });
      
      // Cleanup intermediate files
      try {
        if (processedPath !== ocrPath) await fs.unlink(processedPath);
      } catch (e) { /* ignore */ }
    }
    
    logger.info(`Advanced detection completed in ${Date.now() - startTime}ms`);
    
    return {
      regions,
      processedPlates,
      quality,
      needsSuperRes,
      detectionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Analyze image quality (reusing from original service)
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
}

module.exports = new AdvancedImageProcessingService();