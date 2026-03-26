/**
 * Enhanced OCR Service - Optimized for performance
 * 
 * Improved detection pipeline with plate localization for distant/far images
 */

const tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class EnhancedOCRService {
  constructor() {
    this.tempDir = 'uploads/temp';
  }

  /**
   * Detect plates - main entry point
   */
  async detectPlates(imagePath, options = {}) {
    return this.detectPlatesWithLocalization(imagePath, options);
  }

  /**
   * Enhanced detection with plate localization for distant images
   */
  async detectPlatesWithLocalization(inputPath, options = {}) {
    const startTime = Date.now();
    
    logger.info('Starting enhanced plate detection with localization...');
    
    try {
      // Step 1: Find potential plate regions (localization)
      const regions = await this.locatePotentialPlates(inputPath);
      
      logger.info(`Found ${regions.length} potential plate regions`);
      
      // Step 2: Process each potential region
      let allPlates = [];
      
      for (const region of regions) {
        try {
          // Preprocess the region with multiple methods
          const preprocessed = await this.preprocessForOCR(region.path, 'quality');
          
          // OCR with multiple PSM modes
          const ocrResult = await this.performOCRWithFallback(preprocessed);
          
          // Parse results
          const plates = this.parseOCRResults(ocrResult.text, ocrResult.confidence);
          
          // Adjust bounding box to original image coordinates
          plates.forEach(plate => {
            if (plate.boundingBox) {
              plate.boundingBox.x += region.x;
              plate.boundingBox.y += region.y;
            }
          });
          
          allPlates = [...allPlates, ...plates];
          
          // Cleanup temp region
          try { await fs.unlink(region.path); } catch(e) {}
          try { await fs.unlink(preprocessed); } catch(e) {}
          
        } catch (err) {
          logger.warn(`Failed to process region: ${err.message}`);
        }
      }
      
      // Step 3: If no plates found, try whole image processing
      if (allPlates.length === 0) {
        logger.info('No plates found in regions, trying full image...');
        return this.detectPlatesFast(inputPath, options);
      }
      
      // Remove duplicates
      const uniquePlates = this.deduplicatePlates(allPlates);
      
      logger.info(`Found ${uniquePlates.length} plates in ${Date.now() - startTime}ms`);
      return {
        plates: uniquePlates,
        detectionTimeMs: Date.now() - startTime,
        algorithmsUsed: ['plate-localization', 'multi-region-ocr', 'preprocessing'],
        ocrEngine: 'tesseract',
      };
      
    } catch (error) {
      logger.error('Detection failed:', error.message);
      // Fallback to basic detection
      return this.detectPlatesFast(inputPath, options);
    }
  }

  /**
   * Locate potential license plate regions using image processing
   */
  async locatePotentialPlates(inputPath) {
    const regions = [];
    
    try {
      // Get image metadata
      const metadata = await sharp(inputPath).metadata();
      const width = metadata.width;
      const height = metadata.height;
      
      // Generate multiple crops at different scales for detecting plates at various distances
      // This helps detect plates that are small/far in the image
      const scales = [1, 0.75, 0.5, 0.35, 0.25];
      
      for (const scale of scales) {
        const scaledWidth = Math.floor(width * scale);
        const scaledHeight = Math.floor(height * scale);
        
        // Create multiple overlapping crops
        const cropRows = Math.ceil(scaledHeight / (scaledHeight * 0.5));
        const cropCols = Math.ceil(scaledWidth / (scaledWidth * 0.5));
        
        for (let row = 0; row < cropRows; row++) {
          for (let col = 0; col < cropCols; col++) {
            const x = Math.floor((col * scaledWidth * 0.5));
            const y = Math.floor((row * scaledHeight * 0.5));
            const cropWidth = Math.min(scaledWidth - x, scaledWidth);
            const cropHeight = Math.min(scaledHeight - y, scaledHeight);
            
            // Only process reasonable sized regions
            if (cropWidth > 100 && cropHeight > 30) {
              const cropPath = path.join(this.tempDir, `region_${uuidv4()}.jpg`);
              await fs.mkdir(this.tempDir, { recursive: true });
              
              await sharp(inputPath)
                .extract({
                  left: Math.floor(x / scale),
                  top: Math.floor(y / scale),
                  width: Math.floor(cropWidth / scale),
                  height: Math.floor(cropHeight / scale)
                })
                .resize(800, null, { fit: 'inside' })
                .toFile(cropPath);
              
              // Check if this region looks like it might contain a plate (edge density)
              const hasPotential = await this.hasPotentialPlateFeatures(cropPath);
              
              if (hasPotential) {
                regions.push({
                  path: cropPath,
                  x: Math.floor(x / scale),
                  y: Math.floor(y / scale),
                  width: Math.floor(cropWidth / scale),
                  height: Math.floor(cropHeight / scale)
                });
              } else {
                // Cleanup non-promising regions
                try { await fs.unlink(cropPath); } catch(e) {}
              }
            }
          }
        }
      }
      
      // Also add center region as it's often where plates appear
      const centerPath = path.join(this.tempDir, `center_${uuidv4()}.jpg`);
      await fs.mkdir(this.tempDir, { recursive: true });
      
      const centerSize = Math.min(width, height) * 0.6;
      await sharp(inputPath)
        .extract({
          left: Math.floor((width - centerSize) / 2),
          top: Math.floor((height - centerSize) / 2),
          width: Math.floor(centerSize),
          height: Math.floor(centerSize)
        })
        .resize(800, null)
        .toFile(centerPath);
      
      regions.push({
        path: centerPath,
        x: Math.floor((width - centerSize) / 2),
        y: Math.floor((height - centerSize) / 2),
        width: Math.floor(centerSize),
        height: Math.floor(centerSize)
      });
      
    } catch (error) {
      logger.warn('Plate localization error:', error.message);
    }
    
    // If no regions found, return the whole image as one region
    if (regions.length === 0) {
      const fullPath = path.join(this.tempDir, `full_${uuidv4()}.jpg`);
      await fs.mkdir(this.tempDir, { recursive: true });
      await sharp(inputPath).resize(1200, null).toFile(fullPath);
      regions.push({ path: fullPath, x: 0, y: 0, width: 1200, height: 800 });
    }
    
    return regions;
  }

  /**
   * Check if image region has potential plate-like features
   */
  async hasPotentialPlateFeatures(imagePath) {
    try {
      const stats = await sharp(imagePath).stats();
      
      // Check contrast - plates usually have high contrast edges
      const contrast = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
      
      // Check if there are both light and dark pixels (potential edges)
      const hasRange = stats.channels.every(ch => ch.max - ch.min > 100);
      
      return contrast > 15 && hasRange;
    } catch (error) {
      return true; // Assume potential if can't analyze
    }
  }

  /**
   * Preprocess image for OCR with multiple quality levels
   */
  async preprocessForOCR(inputPath, quality = 'balanced') {
    const outputPath = path.join(this.tempDir, `prep_${uuidv4()}.jpg`);
    await fs.mkdir(this.tempDir, { recursive: true });
    
    let pipeline = sharp(inputPath);
    
    if (quality === 'quality') {
      // Highest quality preprocessing for distant/small plates
      pipeline = pipeline
        .grayscale()
        .normalize()
        .linear(1.8, -50)
        .sharpen({ sigma: 2.0, m1: 0.8, m2: 0.3 })
        .threshold(128);
    } else if (quality === 'balanced') {
      // Balanced preprocessing
      pipeline = pipeline
        .grayscale()
        .linear(1.5, -40)
        .sharpen({ sigma: 1.5, m1: 0.5, m2: 0.5 });
    } else {
      // Fast preprocessing
      pipeline = pipeline.grayscale();
    }
    
    await pipeline.toFile(outputPath);
    return outputPath;
  }

  /**
   * Perform OCR with fallback for different PSM modes
   */
  async performOCRWithFallback(imagePath) {
    const psmModes = [6, 4, 3, 11]; // Try different page segmentation modes
    
    for (const psm of psmModes) {
      try {
        const result = await this.performOCR(imagePath, { 
          psm, 
          whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
          oem: 3 // Use LSTM OCR engine
        });
        
        // If we found something, return it
        if (result.text && result.text.trim().length > 0) {
          return result;
        }
      } catch (err) {
        logger.debug(`PSM ${psm} failed: ${err.message}`);
      }
    }
    
    // Last resort: basic OCR
    return this.performOCR(imagePath, { psm: 6 });
  }

  /**
   * Fast detection with single OCR pass
   */
  async detectPlatesFast(inputPath, options = {}) {
    const startTime = Date.now();
    
    logger.info('Starting fast plate detection...');
    
    try {
      // Preprocess image for best OCR results
      const preprocessed = await this.preprocessForOCR(inputPath, 'quality');
      
      // Single OCR pass with optimized settings
      const result = await this.performOCRWithFallback(preprocessed);
      
      // Parse results for plate patterns
      const plates = this.parseOCRResults(result.text, result.confidence);
      
      // Cleanup
      try { await fs.unlink(preprocessed); } catch(e) {}
      
      if (plates.length > 0) {
        logger.info(`Found ${plates.length} plates in ${Date.now() - startTime}ms`);
        return {
          plates,
          detectionTimeMs: Date.now() - startTime,
          algorithmsUsed: ['preprocessing', 'single-pass-ocr'],
          ocrEngine: 'tesseract',
        };
      }
      
      // Fallback to standard OCR
      logger.info('No plates found, falling back...');
      const fallback = require('./ocrService');
      return fallback.detectPlates(inputPath, options);
      
    } catch (error) {
      logger.error('Detection failed:', error.message);
      const fallback = require('./ocrService');
      return fallback.detectPlates(inputPath, options);
    }
  }

  /**
   * Preprocess image for OCR (legacy)
   */
  async preprocessImage(inputPath) {
    return this.preprocessForOCR(inputPath, 'balanced');
  }

  /**
   * Perform OCR with Tesseract
   */
  async performOCR(imagePath, options = {}) {
    const { psm = 6, whitelist, oem = 1 } = options;
    
    const worker = await tesseract.createWorker('eng', oem);
    
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      ...(whitelist && { tessedit_char_whitelist: whitelist }),
    });
    
    const { data } = await worker.recognize(imagePath);
    await worker.terminate();
    
    return {
      text: data.text,
      confidence: data.confidence / 100,
    };
  }

  /**
   * Parse OCR text for valid plate patterns
   */
  parseOCRResults(text, confidence) {
    const plates = [];
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    
    for (const line of lines) {
      const cleaned = line.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
      
      // Skip very short or very long strings
      if (cleaned.length < 4 || cleaned.length > 20) continue;
      
      // Check valid plate patterns (expanded for better detection)
      const patterns = [
        // Indian plates - new format
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/,  // MH01AB1234
        /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,     // MH12AB1234
        /^[A-Z]{2}[0-9]{1,2}[A-Z][0-9]{4}$/,      // MH1A1234
        /^[A-Z]{2}[0-9]{2}[0-9]{4}$/,             // MH121234
        // Indian plates - old format
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{3}$/, // MH01AB123
        /^[A-Z]{2}[0-9]{2}[A-Z][0-9]{3}$/,       // MH12A123
        // Generic plate patterns
        /^[A-Z0-9]{5,15}$/i,
      ];
      
      let matchedPattern = -1;
      for (let i = 0; i < patterns.length; i++) {
        if (patterns[i].test(cleaned)) {
          matchedPattern = i;
          break;
        }
      }
      
      if (matchedPattern >= 0) {
        const isIndianFormat = matchedPattern < 6;
        
        plates.push({
          plateText: cleaned,
          rawText: line,
          confidence: Math.min(confidence * 1.2, 0.95), // Boost confidence slightly
          boundingBox: { x: 0, y: 0, width: 100, height: 30 },
          isValid: true,
          region: isIndianFormat ? this.extractState(cleaned) : null,
          validationDetails: { 
            format: isIndianFormat ? ['new', 'new_letters', 'old', 'classic', 'old_letters', 'old_single'][matchedPattern] : 'generic',
            country: isIndianFormat ? 'India' : 'Unknown'
          },
          country: isIndianFormat ? 'India' : 'Unknown',
        });
      }
    }
    
    return plates;
  }

  /**
   * Extract state from registration number
   */
  extractState(plate) {
    const states = {
      'MH': 'Maharashtra', 'DL': 'Delhi', 'KA': 'Karnataka', 'TN': 'Tamil Nadu',
      'KL': 'Kerala', 'RJ': 'Rajasthan', 'UP': 'Uttar Pradesh', 'WB': 'West Bengal',
      'GJ': 'Gujarat', 'MP': 'Madhya Pradesh', 'AP': 'Andhra Pradesh', 'TG': 'Telangana',
      'HR': 'Haryana', 'PB': 'Punjab', 'CH': 'Chandigarh', 'OR': 'Odisha',
      'BR': 'Bihar', 'JH': 'Jharkhand', 'UK': 'Uttarakhand', 'HP': 'Himachal Pradesh',
      'JK': 'Jammu & Kashmir', 'AS': 'Assam', 'AR': 'Arunachal Pradesh', 'MN': 'Manipur',
      'ML': 'Meghalaya', 'MZ': 'Mizoram', 'NL': 'Nagaland', 'PY': 'Puducherry',
      'GA': 'Goa', 'DN': 'Dadra & Nagar Haveli', 'DD': 'Daman & Diu', 'AN': 'Andaman & Nicobar',
    };
    return states[plate.substring(0, 2)] || null;
  }

  /**
   * Remove duplicate plate detections
   */
  deduplicatePlates(plates) {
    const seen = new Map();
    
    for (const plate of plates) {
      const key = plate.plateText.substring(0, 8); // Use first 8 chars as key
      if (!seen.has(key) || plate.confidence > seen.get(key).confidence) {
        seen.set(key, plate);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Extract text from image (for smart processing agent)
   */
  async extractText(imagePath, options = {}) {
    const result = await this.detectPlatesWithLocalization(imagePath, options);
    
    if (result.plates.length === 0) {
      return { text: '', confidence: 0, plates: [] };
    }
    
    const primary = result.plates[0];
    return {
      text: primary.plateText,
      confidence: primary.confidence,
      plates: result.plates,
    };
  }
}

module.exports = new EnhancedOCRService();
