/**
 * Enhanced OCR Service - Optimized for performance
 * 
 * Simplified detection pipeline with efficient processing
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
    return this.detectPlatesFast(imagePath, options);
  }

  /**
   * Fast detection with single OCR pass
   */
  async detectPlatesFast(inputPath, options = {}) {
    const startTime = Date.now();
    
    logger.info('Starting fast plate detection...');
    
    try {
      // Preprocess image for best OCR results
      const preprocessed = await this.preprocessImage(inputPath);
      
      // Single OCR pass with optimized settings
      const result = await this.performOCR(preprocessed, {
        psm: 6, // Assume uniform block of text
        whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
      });
      
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
   * Preprocess image for OCR
   */
  async preprocessImage(inputPath) {
    const outputPath = path.join(this.tempDir, `prep_${uuidv4()}.jpg`);
    await fs.mkdir(this.tempDir, { recursive: true });
    
    await sharp(inputPath)
      .grayscale()
      .linear(1.5, -40)  // Moderate contrast
      .sharpen({ sigma: 1.5, m1: 0.5, m2: 0.5 })
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Perform OCR with Tesseract
   */
  async performOCR(imagePath, options = {}) {
    const { psm = 6, whitelist } = options;
    
    const worker = await tesseract.createWorker('eng', 1);
    
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
      
      // Check valid Indian plate patterns
      const patterns = [
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/,  // MH01AB1234
        /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,     // MH12AB1234
        /^[A-Z]{2}[0-9]{1,2}[A-Z][0-9]{4}$/,      // MH1A1234
        /^[A-Z]{2}[0-9]{2}[0-9]{4}$/,             // MH121234
      ];
      
      for (let i = 0; i < patterns.length; i++) {
        if (patterns[i].test(cleaned)) {
          plates.push({
            plateText: cleaned,
            rawText: line,
            confidence: confidence,
            boundingBox: { x: 0, y: 0, width: 100, height: 30 },
            isValid: true,
            region: this.extractState(cleaned),
            validationDetails: { format: ['new', 'new_letters', 'old', 'classic'][i], country: 'India' },
            country: 'India',
          });
          break;
        }
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
    };
    return states[plate.substring(0, 2)] || null;
  }

  /**
   * Extract text from image (for smart processing agent)
   */
  async extractText(imagePath, options = {}) {
    const result = await this.detectPlatesFast(imagePath, options);
    
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
