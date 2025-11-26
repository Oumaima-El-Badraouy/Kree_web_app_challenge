const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['customer', 'agency','admin'], default: 'customer' },
  isActive:{type:Boolean,default: true},
  verified:{type:Boolean,default: true},
  avatar: String, // photo perso
  nationalCardPhoto: String, // carte nationale
  selfiePhoto: String, // selfie
  agencyName: String,
  agencyDescription: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'Morocco' },
    zipCode: String
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Public profile
userSchema.methods.toPublicProfile = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
