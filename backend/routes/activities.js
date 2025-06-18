const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Activity = require('../models/Activity');

router.get('/', auth(['Admin', 'Editor', 'Viewer']), async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.user.id }).sort({ timestamp: -1 });
    res.json({ activities });
  } catch (err) {
    console.error('Activity fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

module.exports = router;