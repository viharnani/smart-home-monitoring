import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  deviceId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['BUDGET_EXCEEDED', 'HIGH_CONSUMPTION', 'DEVICE_MALFUNCTION']
  },
  message: {
    type: String,
    required: true
  },
  threshold: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED'],
    default: 'PENDING'
  }
});

// Add indexes for common queries
alertSchema.index({ userId: 1, timestamp: -1 });
alertSchema.index({ status: 1 });

export const Alert = mongoose.model('Alert', alertSchema);
