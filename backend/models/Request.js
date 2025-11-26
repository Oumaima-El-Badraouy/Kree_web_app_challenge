const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Rental period is optional; frontend may send durationMonths instead
  rentalPeriod: {
    startDate: { type: Date },
    endDate: { type: Date }
  },
  // Duration in months (optional)
  durationMonths: { type: Number, min: 0 },
  // Number of days (computed when start/end provided)
  numberOfDays: { type: Number, min: 0, default: 0 },
  budget: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 }
  },
  // Location is optional to better accommodate quick quotes
  location: {
    city: { type: String, trim: true, default: '' },
    country: { type: String, default: 'Morocco' }
  },
  // Vehicle and configurator details (store the full vehicle object from frontend)
  vehicleDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  monthlyPrice: { type: Number, min: 0 },
  mileage: { type: Number, min: 0 },
  clientType: { type: String, enum: ['business', 'individual', 'personal', 'company'] },
  services: [{ type: String }],
  // Status and notifications
  status: { type: String, default: 'pending' },
  notifiedAgencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Calcul du nombre de jours
requestSchema.pre('save', function(next) {
  if (this.rentalPeriod && this.rentalPeriod.startDate && this.rentalPeriod.endDate) {
    const days = Math.ceil((this.rentalPeriod.endDate - this.rentalPeriod.startDate) / (1000 * 60 * 60 * 24));
    this.numberOfDays = days;
  }
  // If durationMonths provided and rentalPeriod missing, we don't auto-fill dates here.
  next();
});

module.exports = mongoose.model('Request', requestSchema);
