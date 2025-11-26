const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  proposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true
  },
  bookingNumber: {
    type: String,
    required: true,
    unique: true
  },
  car: {
    make: String,
    model: String,
    year: Number,
    category: String,
    images: [String],
    specifications: {
      transmission: String,
      fuelType: String,
      seats: Number,
      doors: Number
    }
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
    method: {
      type: String,
      enum: ['cash_on_pickup', 'bank_transfer', 'cash'],
      default: 'cash_on_pickup'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'Delivered'],
      default: 'pending'
    },
    paidAt: Date,
    DeliveredAt: Date
  },
  status: {
    type: String,
    enum: ['booked', 'confirmed', 'picked_up', 'returned', 'Delivered', 'cancelled', 'disputed'],
    default: 'booked'
  },
  pickupDetails: {
    location: String,
    address: String,
    city: String,
    scheduledTime: Date,
    actualTime: Date,
    notes: String
  },
  returnDetails: {
    location: String,
    address: String,
    scheduledTime: Date,
    actualTime: Date,
    notes: String
  },
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: String
  }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ agency: 1, status: 1 });
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ 'rentalPeriod.startDate': 1 });






module.exports = mongoose.model('Booking', bookingSchema);
