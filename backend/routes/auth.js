const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const router = express.Router();

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
});
const User = mongoose.model('User', userSchema);

router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, role: role ? role.toLowerCase() : 'viewer' });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to register user: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    console.log('Attempting to find user with email:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('Comparing passwords for user:', user.email);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', user.email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('Generating token for user:', user.email);
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000
    });
    console.log('Login successful for user:', user.email);
    res.json({ user: { email: user.email, role: user.role } }); // Match frontend expectation
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to login: ' + err.message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to logout: ' + err.message });
  }
});

router.get('/me', auth(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    res.json({ role: req.user.role, email: req.user.email });
  } catch (err) {
    console.error('Fetch user error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch user: ' + err.message });
  }
});

router.get('/users', auth(['admin']), async (req, res) => {
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  res.json({ users });
});

module.exports = router;
