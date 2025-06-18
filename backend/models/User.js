const mongoose = require('mongoose');

  // models/User.js
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
});

     module.exports = mongoose.model('User', userSchema);