const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  points: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Score', scoreSchema);
