const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  paystackReference: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'abandoned'],
    default: 'pending'
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed
  },
  paidAt: {
    type: Date
  },
  failureReason: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
paymentSchema.index({ order: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
