const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  plateNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  make: String,
  model: String,
  year: Number,
  color: String,
  type: {
    type: String,
    enum: ['car', 'truck', 'motorcycle', 'bus', 'van', 'suv', 'other'],
    default: 'other',
  },
  country: String,
  state: String,
  registrationExpiry: Date,
  notes: String,
  detections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Detection',
  }],
  alerts: [{
    type: { type: String, enum: ['stolen', 'wanted', 'expired', 'custom'] },
    message: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  }],
  firstSeen: { type: Date, default: Date.now },
  lastSeen: Date,
  seenCount: { type: Number, default: 1 },
  isFlagged: { type: Boolean, default: false },
  flagReason: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

vehicleSchema.index({ plateNumber: 1, user: 1 });
vehicleSchema.index({ user: 1, createdAt: -1 });
vehicleSchema.index({ isFlagged: 1 });

vehicleSchema.virtual('hasActiveAlerts').get(function () {
  return this.alerts?.some(a => a.active) || false;
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
