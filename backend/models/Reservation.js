const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  bid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
    required: true
  },
  reservationNumber: {
    type: String,
    required: true,
    unique: true
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
    required: true
  },
  pricing: {
    pricePerDay: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    platformFee: {
      type: Number,
      required: true
    },
    agencyEarnings: {
      type: Number,
      required: true
    }
  },
  payment: {
    stripePaymentIntentId: String,
    stripeChargeId: String,
    status: {
      type: String,
      enum: ['pending', 'paid', 'held_in_escrow', 'released_to_agency', 'refunded', 'failed'],
      default: 'pending'
    },
    paidAt: Date,
    releasedAt: Date,
    refundedAt: Date,
    method: String
  },
  status: {
    type: String,
    enum: ['confirmed', 'active', 'Delivered', 'cancelled', 'disputed'],
    default: 'confirmed'
  },
  pickupDetails: {
    location: String,
    time: Date,
    notes: String
  },
  returnDetails: {
    location: String,
    time: Date,
    notes: String,
    actualReturnTime: Date
  },
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String,
    refundAmount: Number
  }
}, {
  timestamps: true
});

// Index for queries
reservationSchema.index({ customer: 1, status: 1 });
reservationSchema.index({ agency: 1, status: 1 });
reservationSchema.index({ reservationNumber: 1 });
reservationSchema.index({ 'rentalPeriod.startDate': 1 });

// Generate reservation number
reservationSchema.pre('save', async function(next) {
  if (!this.reservationNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.reservationNumber = `KR-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
