const mongoose = require('mongoose');
const router = require('express').Router();
const { summarizeDocument } = require('../controllers/aiController');
const auth = require('../middleware/auth');


router.post('/search', auth(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { query } = req.body;
    console.log('Search request:', { query, user: req.user });
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
    const documents = await mongoose.connection.db.collection('documents').find({
      $or: [
        { filename: { $regex: searchRegex } },
        { summary: { $regex: searchRegex } },
      ],
    }).toArray();
    console.log(`Found ${documents.length} documents`);
    res.json({ results: documents });
  } catch (err) {
    console.error('Search error:', err.message, err.stack);
    res.status(500).json({ error: `Search failed: ${err.message}` });
  }
});
router.get('/summarize/:documentId', auth(['admin', 'editor', 'viewer']), summarizeDocument);


module.exports = router;