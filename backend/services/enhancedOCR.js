/**
 * Enhanced OCR Service - Simple and reliable
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
    return this.detectPlatesSimple(imagePath, options);
  }

  /**
   * Simple and reliable detection
   */
  async detectPlatesSimple(inputPath, options = {}) {
    const startTime = Date.now();
    
    try {
      // Simple preprocessing - just resize and grayscale
      const preprocessed = await this.preprocessSimple(inputPath);
      
      // OCR with multiple PSM modes to catch different plate formats
      const result = await this.ocrWithMultiplePSM(preprocessed);
      
      // Parse results
      const plates = this.parseResults(result.text, result.confidence);
      
      // Cleanup
      try { await fs.unlink(preprocessed); } catch(e) {}
      
      if (plates.length > 0) {
        logger.info(`Found: ${plates[0].plateText} in ${Date.now()-startTime}ms`);
        return {
          plates: [plates[0]],
          detectionTimeMs: Date.now() - startTime,
          algorithmsUsed: ['preprocessing', 'multi-psm-ocr'],
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
   * Simple preprocessing - works for most images
   */
  async preprocessSimple(inputPath) {
    const outputPath = path.join(this.tempDir, `prep_${uuidv4()}.jpg`);
    await fs.mkdir(this.tempDir, { recursive: true });
    
    await sharp(inputPath)
      .grayscale()
      .resize(1500, null, { fit: 'inside' })
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Try multiple PSM modes for better detection
   */
  async ocrWithMultiplePSM(imagePath) {
    const psms = [6, 4, 3]; // Different page segmentation modes
    let bestText = '';
    let bestConfidence = 0;
    
    for (const psm of psms) {
      try {
        const worker = await tesseract.createWorker('eng', 1);
        await worker.setParameters({
          tessedit_pageseg_mode: psm
        });
        
        const { data } = await worker.recognize(imagePath);
        await worker.terminate();
        
        // Keep the result with most text
        if (data.text.trim().length > bestText.trim().length) {
          bestText = data.text;
          bestConfidence = data.confidence;
        }
      } catch (e) {
        // Continue to next PSM
      }
    }
    
    return { text: bestText, confidence: bestConfidence / 100 };
  }

  /**
   * Parse OCR results - more flexible matching
   */
  parseResults(text, confidence) {
    const plates = [];
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    
    for (const line of lines) {
      // Keep some special chars for now
      const cleaned = line.toUpperCase().replace(/[^A-Z0-9\s\-]/g, '').trim();
      
      if (cleaned.length < 3 || cleaned.length > 20) continue;
      
      // Very flexible patterns - accept most alphanumeric combinations
      const cleanedNoSpace = cleaned.replace(/\s/g, '');
      
      // If it looks like a plate (letters + numbers mixed), accept it
      const hasLetters = /[A-Z]/.test(cleanedNoSpace);
      const hasNumbers = /[0-9]/.test(cleanedNoSpace);
      const isReasonable = cleanedNoSpace.length >= 5 && cleanedNoSpace.length <= 15;
      
      if (hasLetters && hasNumbers && isReasonable) {
        const isIndian = /^[A-Z]{2}[0-9]/.test(cleanedNoSpace);
        
        plates.push({
          plateText: cleanedNoSpace,
          rawText: line,
          confidence: Math.min(0.85, confidence + 0.1),
          boundingBox: { x: 0, y: 0, width: 100, height: 30 },
          isValid: true,
          region: isIndian ? this.extractState(cleanedNoSpace) : null,
          validationDetails: { country: isIndian ? 'India' : 'Unknown' },
          country: isIndian ? 'India' : 'Unknown',
        });
        
        break;
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
    return this.detectPlatesSimple(inputPath, options);
  }

  async detectPlatesAccurate(inputPath, options = {}) {
    return this.detectPlatesSimple(inputPath, options);
  }

  async detectPlatesOptimized(inputPath, options = {}) {
    return this.detectPlatesSimple(inputPath, options);
  }

  async detectPlatesWithLocalization(inputPath, options = {}) {
    return this.detectPlatesSimple(inputPath, options);
  }

  async detectPlatesUltraAccurate(inputPath, options = {}) {
    return this.detectPlatesSimple(inputPath, options);
  }

  async extractText(imagePath, options = {}) {
    const result = await this.detectPlatesSimple(imagePath, options);
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