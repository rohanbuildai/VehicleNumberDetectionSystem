const mongoose = require('mongoose');

const detectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  jobId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  inputImage: {
    originalName: String,
    filename: String,
    path: String,
    url: String,
    size: Number,
    mimeType: String,
    dimensions: { width: Number, height: Number },
  },
  processedImages: [{
    type: {
      type: String,
      enum: ['grayscale', 'enhanced', 'denoised', 'sharpened', 'plate_crop', 'annotated', 'binarized', 'morphed'],
    },
    filename: String,
    path: String,
    url: String,
    size: Number,
    dimensions: { width: Number, height: Number },
  }],
  detectionResults: {
    platesDetected: { type: Number, default: 0 },
    plates: [{
      plateText: String,
      confidence: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number,
      },
      region: String,
      country: String,
      plateType: {
        type: String,
        enum: ['standard', 'commercial', 'government', 'military', 'diplomatic', 'unknown'],
        default: 'unknown',
      },
      characters: [{
        char: String,
        confidence: Number,
        bbox: { x: Number, y: Number, width: Number, height: Number },
      }],
      plateImageUrl: String,
      isValid: Boolean,
      validationDetails: {
        format: String,
        state: String,
        country: String,
      },
    }],
    imageQuality: {
      score: Number,
      issues: [String],
      brightness: Number,
      contrast: Number,
      sharpness: Number,
      noiseLevel: Number,
    },
    processingMetadata: {
      algorithmsUsed: [String],
      ocrEngine: String,
      detectionModel: String,
      enhancementsApplied: [String],
    },
  },
  processingOptions: {
    enhanceContrast: { type: Boolean, default: true },
    denoising: { type: Boolean, default: true },
    sharpening: { type: Boolean, default: true },
    grayscaleConversion: { type: Boolean, default: true },
    morphologicalOps: { type: Boolean, default: true },
    autoRotation: { type: Boolean, default: false },
    multiScaleDetection: { type: Boolean, default: true },
    outputAnnotated: { type: Boolean, default: true },
    outputCroppedPlates: { type: Boolean, default: true },
  },
  performance: {
    startTime: Date,
    endTime: Date,
    processingTimeMs: Number,
    imageLoadTimeMs: Number,
    detectionTimeMs: Number,
    ocrTimeMs: Number,
  },
  errorInfo: {
    code: String,
    message: String,
    stack: String,
  },
  isPublic: { type: Boolean, default: false },
  tags: [String],
  notes: String,
  isFavorite: { type: Boolean, default: false },
  vehicleInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
detectionSchema.index({ user: 1, createdAt: -1 });
detectionSchema.index({ status: 1, createdAt: -1 });
detectionSchema.index({ 'detectionResults.plates.plateText': 1 });

// Virtual
detectionSchema.virtual('processingTime').get(function () {
  if (this.performance?.startTime && this.performance?.endTime) {
    return this.performance.endTime - this.performance.startTime;
  }
  return null;
});

module.exports = mongoose.model('Detection', detectionSchema);
