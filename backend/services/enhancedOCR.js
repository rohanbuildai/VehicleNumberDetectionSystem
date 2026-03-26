/**
 * Enhanced OCR Service - Balanced accuracy and speed
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
   * Detect plates - main entry
   */
  async detectPlates(imagePath, options = {}) {
    return this.detectPlatesAccurate(imagePath, options);
  }

  /**
   * Accurate detection with smart preprocessing
   */
  async detectPlatesAccurate(inputPath, options = {}) {
    const startTime = Date.now();
    
    try {
      // Step 1: Create enhanced preprocessing - multiple versions
      const preprocessedPaths = await this.createEnhancedPreprocessing(inputPath);
      
      // Step 2: Run OCR on each preprocessing version
      let allPlates = [];
      let bestConfidence = 0;
      
      for (const prepPath of preprocessedPaths) {
        try {
          // Use LSTM for accuracy (OEM 3)
          const worker = await tesseract.createWorker('eng', 3);
          await worker.setParameters({
            tessedit_pageseg_mode: 6,
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- '
          });
          
          const { data } = await worker.recognize(prepPath);
          await worker.terminate();
          
          const plates = this.parseResults(data.text, data.confidence / 100);
          
          if (plates.length > 0 && plates[0].confidence > bestConfidence) {
            bestConfidence = plates[0].confidence;
            allPlates = plates;
          }
        } catch (e) {
          // Continue
        }
        
        // Cleanup
        try { await fs.unlink(prepPath); } catch(e) {}
      }
      
      if (allPlates.length > 0) {
        logger.info(`Found: ${allPlates[0].plateText} (${(allPlates[0].confidence*100).toFixed(0)}%) in ${Date.now()-startTime}ms`);
        return {
          plates: [allPlates[0]],
          detectionTimeMs: Date.now() - startTime,
          algorithmsUsed: ['enhanced-preprocessing', 'lstm-ocr'],
          ocrEngine: 'tesseract-lstm',
        };
      }
      
      return { plates: [], detectionTimeMs: Date.now() - startTime, algorithmsUsed: [], ocrEngine: 'tesseract' };
      
    } catch (error) {
      logger.error('Detection failed:', error.message);
      return { plates: [], detectionTimeMs: 0, algorithmsUsed: [], ocrEngine: 'tesseract' };
    }
  }

  /**
   * Create multiple enhanced preprocessing versions for better accuracy
   */
  async createEnhancedPreprocessing(inputPath) {
    const paths = [];
    await fs.mkdir(this.tempDir, { recursive: true });
    
    // Version 1: High contrast (good for clear plates)
    const v1 = path.join(this.tempDir, `v1_${uuidv4()}.jpg`);
    await sharp(inputPath)
      .grayscale()
      .normalize()
      .linear(2.0, -30)
      .toFile(v1);
    paths.push(v1);
    
    // Version 2: Sharpened (good for blurry images)
    const v2 = path.join(this.tempDir, `v2_${uuidv4()}.jpg`);
    await sharp(inputPath)
      .grayscale()
      .sharpen({ sigma: 2.0, m1: 1.0, m2: 0.5 })
      .linear(1.5, -20)
      .toFile(v2);
    paths.push(v2);
    
    // Version 3: Binarized (good for high contrast plates)
    const v3 = path.join(this.tempDir, `v3_${uuidv4()}.jpg`);
    await sharp(inputPath)
      .grayscale()
      .normalize()
      .linear(2.5, -50)
      .threshold(128)
      .toFile(v3);
    paths.push(v3);
    
    return paths;
  }

  /**
   * Parse OCR results with flexible pattern matching
   */
  parseResults(text, confidence) {
    const plates = [];
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    
    for (const line of lines) {
      const cleaned = line.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
      
      if (cleaned.length < 4 || cleaned.length > 15) continue;
      
      // Multiple patterns - more flexible
      const patterns = [
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/,   // MH01AB1234
        /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,      // MH12AB1234  
        /^[A-Z]{2}[0-9]{1,2}[A-Z][0-9]{4}$/,       // MH1A1234
        /^[A-Z]{2}[0-9]{2}[0-9]{4}$/,              // MH121234
        /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{3}$/,  // MH01AB123
        /^[A-Z]{2}[0-9]{2}[A-Z][0-9]{3}$/,        // MH12A123
        /^[A-Z0-9]{5,15}$/i,                        // Generic
      ];
      
      let matched = false;
      for (const pattern of patterns) {
        if (pattern.test(cleaned)) {
          matched = true;
          break;
        }
      }
      
      if (matched) {
        const isIndian = cleaned.length >= 5 && /^[A-Z]{2}/.test(cleaned);
        
        plates.push({
          plateText: cleaned,
          rawText: line,
          confidence: Math.min(confidence * 1.3, 0.98),
          boundingBox: { x: 0, y: 0, width: 100, height: 30 },
          isValid: true,
          region: isIndian ? this.extractState(cleaned) : null,
          validationDetails: { country: isIndian ? 'India' : 'Unknown' },
          country: isIndian ? 'India' : 'Unknown',
        });
        
        break; // Return best match
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
      'BR': 'Bihar', 'JH': 'Jharkhand', 'UK': 'Uttarakhand', 'HP': 'Himachal Pradesh',
    };
    return states[plate.substring(0, 2)] || null;
  }

  // Legacy compatibility
  async detectPlatesFast(inputPath, options = {}) {
    return this.detectPlatesAccurate(inputPath, options);
  }

  async detectPlatesOptimized(inputPath, options = {}) {
    return this.detectPlatesAccurate(inputPath, options);
  }

  async detectPlatesWithLocalization(inputPath, options = {}) {
    return this.detectPlatesAccurate(inputPath, options);
  }

  async detectPlatesUltraAccurate(inputPath, options = {}) {
    return this.detectPlatesAccurate(inputPath, options);
  }

  async extractText(imagePath, options = {}) {
    const result = await this.detectPlatesAccurate(imagePath, options);
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