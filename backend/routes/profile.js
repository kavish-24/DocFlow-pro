const express = require('express');
     const router = express.Router();
     const auth = require('../middleware/auth');
     const User = require('../models/User');

     router.get('/', auth(['Admin', 'Editor', 'Viewer']), async (req, res) => {
       try {
         const user = await User.findById(req.user.id).select('-password');
         res.json({ user });
       } catch (err) {
         console.error('Profile fetch error:', err);
         res.status(500).json({ error: 'Failed to fetch profile' });
       }
     });

     router.put('/users', auth(['Admin', 'Editor', 'Viewer']), async (req, res) => {
       try {
         const { name, email } = req.body;
         const user = await User.findById(req.user.id);
         if (email && email !== user.email) {
           const existingUser = await User.findOne({ email });
           if (existingUser) return res.status(400).json({ error: 'Email already registered' });
           user.email = email;
         }
         if (name) user.name = name;
         await user.save();
         res.json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
       } catch (err) {
         console.error('Profile update error:', err);
         res.status(500).json({ error: 'Failed to update profile' });
       }
     });
     router.get('/users', auth(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('_id email');
    res.json({ users });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

     module.exports = router;