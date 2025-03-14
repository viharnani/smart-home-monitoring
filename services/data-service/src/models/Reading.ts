import mongoose from 'mongoose';

const readingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  deviceId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  consumption: {
    type: Number,
    required: true
  },
  voltage: Number,
  current: Number,
  powerFactor: Number
});

// Add indexes for common queries
readingSchema.index({ userId: 1, timestamp: -1 });
readingSchema.index({ deviceId: 1, timestamp: -1 });

export const Reading = mongoose.model('Reading', readingSchema);
