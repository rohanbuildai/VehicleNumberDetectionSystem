/**
 * AI-Based Plate Detection Service
 * Uses external AI API for accurate plate detection
 */

const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

class AIDetectionService {
  constructor() {
    this.tempDir = 'uploads/temp';
    // Load env vars directly at startup
    this.apiUrl = process.env.PLATERECOGNIZER_API_URL || 'https://api.platerecognizer.com/v1/plate-reader/';
    this.apiToken = process.env.PLATERECOGNIZER_TOKEN || '';
    
    logger.info(`AI Detection init - Token configured: ${this.apiToken ? 'YES' : 'NO'}`);
  }

  /**
   * Detect plates using AI
   */
  async detectPlates(imagePath, options = {}) {
    const startTime = Date.now();
    
    logger.info(`Detect called - Token: ${this.apiToken ? 'SET' : 'NOT SET'}`);
    
    // If API is configured, use it
    if (this.apiToken && this.apiToken.trim().length > 0) {
      return this.detectWithAPI(imagePath, startTime);
    }
    
    // Fallback to local detection if no API
    return this.detectLocalFallback(imagePath, startTime);
  }

  /**
   * Use Plate Recognizer API (AI-based, very accurate)
   */
  async detectWithAPI(imagePath, startTime) {
    try {
      logger.info(`API URL: ${this.apiUrl}`);
      
      // Read image
      const imageBuffer = await fs.readFile(imagePath);
      logger.info(`Image size: ${imageBuffer.length} bytes`);
      
      // Send as multipart form data - API expects this format
      const FormData = require('form-data');
      const form = new FormData();
      form.append('image', imageBuffer, { filename: 'image.jpg' });
      
      const response = await axios.post(this.apiUrl, form, {
        headers: {
          'Authorization': `Token ${this.apiToken}`,
          ...form.getHeaders()
        },
        timeout: 30000
      });
      
      logger.info(`API Response status: ${response.status}`);
      const plates = response.data.results || [];
      
      if (plates.length > 0) {
        const detectedPlates = plates.map(p => ({
          plateText: p.plate.toUpperCase(),
          rawText: p.plate,
          confidence: p.confidence || 0.9,
          boundingBox: p.box || { x: 0, y: 0, width: 100, height: 30 },
          isValid: true,
          region: null,
          validationDetails: { country: p.region?.country || 'Unknown' },
          country: p.region?.country || 'Unknown',
        }));
        
        logger.info(`AI detected: ${detectedPlates[0].plateText} in ${Date.now()-startTime}ms`);
        
        return {
          plates: detectedPlates,
          detectionTimeMs: Date.now() - startTime,
          algorithmsUsed: ['ai-api', 'plate-recognizer'],
          ocrEngine: 'ai-deep-learning',
        };
      }
      
      return { plates: [], detectionTimeMs: Date.now() - startTime, algorithmsUsed: [], ocrEngine: 'ai' };
      
    } catch (error) {
      logger.error('AI detection failed:', error.message);
      logger.error('Error details:', error.response?.data || error.message);
      return this.detectLocalFallback(imagePath, startTime);
    }
  }

  /**
   * Local fallback using basic detection
   */
  async detectLocalFallback(imagePath, startTime) {
    try {
      // Simple resize for local processing
      const preprocessed = await this.preprocessImage(imagePath);
      
      // Return empty - user needs to configure API for real AI detection
      // Or they can use the smart processing agent which analyzes images
      try { await fs.unlink(preprocessed); } catch(e) {}
      
      logger.info('No AI API configured. Please set PLATERECOGNIZER_TOKEN in .env for accurate detection');
      
      return { 
        plates: [], 
        detectionTimeMs: Date.now() - startTime, 
        algorithmsUsed: [],
        ocrEngine: 'none',
        message: 'Configure PLATERECOGNIZER_TOKEN for AI-based detection'
      };
      
    } catch (error) {
      logger.error('Local detection failed:', error.message);
      return { plates: [], detectionTimeMs: 0, algorithmsUsed: [], ocrEngine: 'none' };
    }
  }

  async preprocessImage(inputPath) {
    const outputPath = path.join(this.tempDir, `prep_${uuidv4()}.jpg`);
    await fs.mkdir(this.tempDir, { recursive: true });
    
    await sharp(inputPath)
      .grayscale()
      .resize(1500, null, { fit: 'inside' })
      .toFile(outputPath);
    
    return outputPath;
  }

  // Legacy compatibility
  async detectPlatesFast(inputPath, options = {}) {
    return this.detectPlates(inputPath, options);
  }

  async detectPlatesAccurate(inputPath, options = {}) {
    return this.detectPlates(inputPath, options);
  }

  async detectPlatesOptimized(inputPath, options = {}) {
    return this.detectPlates(inputPath, options);
  }

  async detectPlatesWithLocalization(inputPath, options = {}) {
    return this.detectPlates(inputPath, options);
  }

  async detectPlatesUltraAccurate(inputPath, options = {}) {
    return this.detectPlates(inputPath, options);
  }

  async extractText(imagePath, options = {}) {
    const result = await this.detectPlates(imagePath, options);
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

module.exports = new AIDetectionService();