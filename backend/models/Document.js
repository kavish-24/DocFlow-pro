const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: String,
  fileId: mongoose.Types.ObjectId,
  userId: String,
  uploadedAt: Date,
  content: String,
  mimetype: String,
  folderId: { type: mongoose.Types.ObjectId, default: null },
  summary: String,
});

module.exports = mongoose.model('Document', documentSchema);