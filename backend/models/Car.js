const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  make: {
    type: String,
    required: [true, 'Car make is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Car model is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  category: {
    type: String,
    required: true,
    enum: ['Economy', 'Compact', 'Midsize', 'SUV', 'Luxury', 'Van', 'Convertible', 'Sports', 'Truck', 'Electric']
  },
  images: [{
    type: String,
    required: true
  }],
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required'],
    min: 0
  },
  features: [{
    type: String
  }],
  specifications: {
    transmission: {
      type: String,
      enum: ['Automatic', 'Manual'],
      required: true
    },
    fuelType: {
      type: String,
      enum: ['Gasoline', 'Diesel', 'Electric', 'Hybrid'],
      required: true
    },
    seats: {
      type: Number,
      required: true,
      min: 2
    },
    doors: {
      type: Number,
      required: true,
      min: 2
    },
    airConditioning: {
      type: Boolean,
      default: true
    },
    mileage: {
      type: Number
    }
  },
  location: {
    city: {
      type: String,
      required: true
    },
    state: String,
    country: {
      type: String,
      default: 'Morocco'
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  availability: [{
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['available', 'rented', 'maintenance', 'unavailable'],
    default: 'available'
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search optimization
carSchema.index({ category: 1, 'location.city': 1, status: 1 });
carSchema.index({ agency: 1 });

module.exports = mongoose.model('Car', carSchema);
