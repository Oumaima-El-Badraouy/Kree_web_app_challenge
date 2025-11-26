const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  car: {
    make: {
      type: String,
      required: true,
      trim: true
    },
    model: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear() + 1
    },
    category: {
      type: String,
      required: true
    },
    images: [{
      type: String,
      default: []
    }],
    specifications: {
      transmission: { type: String, default: '' },
      fuelType: { type: String, default: '' },
      seats: { type: Number, default: 0 },
      doors: { type: Number, default: 0 },
      airConditioning: { type: Boolean, default: false },
      mileage: { type: Number, default: 0 }
    },
    features: [{
      type: String,
      default: []
    }]
  },
  pricing: {
    pricePerDay: {
      type: Number,
      required: [true, 'Price per day is required'],
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    }
  },
  availability: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  pickupLocation: {
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  agencyNotes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'expired'],
    default: 'pending'
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

// Indexes
proposalSchema.index({ request: 1, status: 1 });
proposalSchema.index({ agency: 1, status: 1 });
proposalSchema.index({ customer: 1 });
proposalSchema.index({ expiresAt: 1 });

// Calculate total price before saving
proposalSchema.pre('save', function(next) {
  if (this.pricing && this.pricing.pricePerDay && this.availability && this.availability.startDate && this.availability.endDate) {
    const days = Math.ceil((this.availability.endDate - this.availability.startDate) / (1000 * 60 * 60 * 24));
    this.pricing.totalPrice = this.pricing.pricePerDay * days;
  } else if (this.pricing && this.pricing.pricePerDay) {
    // Fallback: use pricePerDay as totalPrice
    this.pricing.totalPrice = this.pricing.pricePerDay;
  }
  next();
});

// Auto-expire proposals
proposalSchema.pre('save', function(next) {
  if (this.status === 'pending' && new Date() > this.expiresAt) {
    this.status = 'expired';
  }
  next();
});

// Validation middleware
proposalSchema.pre('save', function(next) {
  if (!this.pricing || !this.pricing.pricePerDay) {
    const err = new Error('Price per day is required');
    return next(err);
  }
  next();
});

module.exports = mongoose.model('Proposal', proposalSchema);