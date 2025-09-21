const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  token: {
    type: String,
    required: true
  },
  secret: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['email_verification', 'password_reset', 'admin_registration'],
    default: 'email_verification'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 600 // 10 minutes
  }
}, {
  timestamps: true
});

// Index for efficient querying
otpSchema.index({ email: 1, isUsed: 1 });

module.exports = mongoose.model('OTP', otpSchema);
