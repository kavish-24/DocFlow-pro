const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');

router.post('/:documentId', auth(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { content, parentId } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment content is required' });
    const comment = new Comment({
      documentId: new mongoose.Types.ObjectId(documentId),
      userId: req.user.id,
      userEmail: req.user.email,
      content,
      parentId: parentId || null,
    });
    await comment.save();
    await Activity.create({
      action: 'Comment Added',
      userId: req.user.id,
      userEmail: req.user.email,
      details: `Commented on document ${documentId}`,
    });
    res.json({ comment });
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.get('/:documentId', auth(['admin', 'editor', 'viewer']), async (req, res) => {
  const { documentId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const query = { documentId: new mongoose.Types.ObjectId(documentId), parentId: null };

    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(query);

    res.json({ comments, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Fetch comments error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});
router.get('/replies/:parentId', auth(['admin', 'editor', 'viewer']), async (req, res) => {
  const { parentId } = req.params;

  try {
    const replies = await Comment.find({ parentId }).sort({ createdAt: 1 });
    res.json({ replies });
  } catch (err) {
    console.error('Fetch replies error:', err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});
router.delete('/:commentId', auth(['admin', 'editor']), async (req, res) => {
  try {
    const { commentId } = req.params;

    const deleted = await Comment.findByIdAndDelete(commentId);

    // Optionally delete all child replies
    await Comment.deleteMany({ parentId: commentId });

    if (!deleted) return res.status(404).json({ error: 'Comment not found' });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});


module.exports = router;