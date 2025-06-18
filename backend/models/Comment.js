const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
  documentId: { type: mongoose.Types.ObjectId, required: true, ref: 'Document' },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  content: { type: String, required: true },
  parentId: { type: mongoose.Types.ObjectId, default: null }, // For threaded comments
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Comment', commentSchema);