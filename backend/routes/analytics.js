const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

router.get('/documents-per-user', auth(['admin']), async (req, res) => {
  try {
    const stats = await mongoose.connection.db.collection('documents').aggregate([
      {
  $group: {
    _id: { $toObjectId: '$userId' },
    count: { $sum: 1 }
  }
 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $project: { email: { $arrayElemAt: ['$user.email', 0] }, count: 1 } },
    ]).toArray();
    res.json({ stats });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/documents-per-folder', auth(['admin']), async (req, res) => {
  try {
    const stats = await mongoose.connection.db.collection('documents').aggregate([
      { $group: { _id: '$folderId', count: { $sum: 1 } } },
      { $lookup: { from: 'folders', localField: '_id', foreignField: '_id', as: 'folder' } },
      { $project: { name: { $arrayElemAt: ['$folder.name', 0] }, count: 1 } },
    ]).toArray();
    res.json({ stats });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/most-edited', auth(['admin']), async (req, res) => {
  try {
    const stats = await mongoose.connection.db.collection('activities').aggregate([
      { $match: { action: 'Document Updated' } },
      { $group: { _id: '$details', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray();
    res.json({ stats });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;