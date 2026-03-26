/**
 * Enhanced OCR Service - Fast and simple
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
   * Detect plates - simple fast detection
   */
  async detectPlates(imagePath, options = {}) {
    return this.detectPlatesFast(imagePath, options);
  }

  /**
   * Fast single-pass detection
   */
  async detectPlatesFast(inputPath, options = {}) {
    const startTime = Date.now();
    
    try {
      // Simple preprocessing
      const preprocessed = await this.preprocessImage(inputPath);
      
      // Single OCR pass - most reliable settings
      const worker = await tesseract.createWorker('eng', 1);
      await worker.setParameters({
        tessedit_pageseg_mode: 6,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- '
      });
      
      const { data } = await worker.recognize(preprocessed);
      await worker.terminate();
      
      // Parse results
      const plates = this.parseResults(data.text, data.confidence / 100);
      
      // Cleanup
      try { await fs.unlink(preprocessed); } catch(e) {}
      
      if (plates.length > 0) {
        logger.info(`Found: ${plates[0].plateText} in ${Date.now() - startTime}ms`);
        return {
          plates: [plates[0]],
          detectionTimeMs: Date.now() - startTime,
          algorithmsUsed: ['preprocessing', 'ocr'],
          ocrEngine: 'tesseract',
        };
      }
      
      return { plates: [], detectionTimeMs: Date.now() - startTime, algorithmsUsed: [], ocrEngine: 'tesseract' };
      
    } catch (error) {
      logger.error('Detection failed:', error.message);
      return { plates: [], detectionTimeMs: 0, algorithmsUsed: [], ocrEngine: 'tesseract' };
    }
  }

  /**
   * Simple preprocessing
   */
  async preprocessImage(inputPath) {
    const outputPath = path.join(this.tempDir, `prep_${uuidv4()}.jpg`);
    await fs.mkdir(this.tempDir, { recursive: true });
    
    await sharp(inputPath)
      .grayscale()
      .resize(1200, null, { fit: 'inside' })
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Parse OCR results
   */
  parseResults(text, confidence) {
    const plates = [];
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    
    for (const line of lines) {
      const cleaned = line.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
      
      if (cleaned.length < 4 || cleaned.length > 15) continue;
      
      // Simple patterns
      const patterns = [
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/,
        /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
        /^[A-Z]{2}[0-9]{1,2}[A-Z][0-9]{4}$/,
        /^[A-Z]{2}[0-9]{2}[0-9]{4}$/,
        /^[A-Z0-9]{5,15}$/i,
      ];
      
      let matched = false;
      for (const pattern of patterns) {
        if (pattern.test(cleaned)) {
          matched = true;
          break;
        }
      }
      
      if (matched) {
        const isIndian = /^[A-Z]{2}/.test(cleaned) && /[0-9]{4}$/.test(cleaned);
        
        plates.push({
          plateText: cleaned,
          rawText: line,
          confidence: Math.min(confidence * 1.2, 0.95),
          boundingBox: { x: 0, y: 0, width: 100, height: 30 },
          isValid: true,
          region: isIndian ? this.extractState(cleaned) : null,
          validationDetails: { country: isIndian ? 'India' : 'Unknown' },
          country: isIndian ? 'India' : 'Unknown',
        });
        
        if (plates.length >= 1) break; // Return only 1
      }
    }
    
    return plates;
  }

  extractState(plate) {
    const states = {
      'MH': 'Maharashtra', 'DL': 'Delhi', 'KA': 'Karnataka', 'TN': 'Tamil Nadu',
      'KL': 'Kerala', 'RJ': 'Rajasthan', 'UP': 'Uttar Pradesh', 'WB': 'West Bengal',
      'GJ': 'Gujarat', 'MP': 'Madhya Pradesh', 'AP': 'Andhra Pradesh', 'TG': 'Telangana',
      'HR': 'Haryana', 'PB': 'Punjab', 'CH': 'Chandigarh', 'OR': 'Odisha',
    };
    return states[plate.substring(0, 2)] || null;
  }

  // Legacy compatibility
  async detectPlatesOptimized(inputPath, options = {}) {
    return this.detectPlatesFast(inputPath, options);
  }

  async detectPlatesWithLocalization(inputPath, options = {}) {
    return this.detectPlatesFast(inputPath, options);
  }

  async detectPlatesUltraAccurate(inputPath, options = {}) {
    return this.detectPlatesFast(inputPath, options);
  }

  async extractText(imagePath, options = {}) {
    const result = await this.detectPlatesFast(imagePath, options);
    if (result.plates.length === 0) {
      return { text: '', confidence: 0, plates: [] };
    }
    return {
      text: result.plates[0].plateText,
      confidence: result.plates[0].confidence,
      plates: result.plates,
    };
  }
}

module.exports = new EnhancedOCRService();