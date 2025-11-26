const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerProposedPrice: {
    type: Number,
    required: [true, 'Customer proposed price is required'],
    min: 0
  },
  agencyCounterOffer: {
    type: Number,
    min: 0
  },
  finalPrice: {
    type: Number,
    min: 0
  },
  rentalPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  numberOfDays: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'countered', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  agencyNotes: {
    type: String
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
    }
  }
}, {
  timestamps: true
});

// Index for queries
bidSchema.index({ customer: 1, status: 1 });
bidSchema.index({ agency: 1, status: 1 });
bidSchema.index({ car: 1 });
bidSchema.index({ expiresAt: 1 });

// Auto-expire bids
bidSchema.pre('save', function(next) {
  if (this.status === 'pending' && new Date() > this.expiresAt) {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('Bid', bidSchema);
