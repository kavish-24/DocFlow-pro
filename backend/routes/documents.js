const express = require('express');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const { uploadFile, getDocuments } = require('../controllers/docController');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const Activity = require('../models/Activity');

const router = express.Router();

router.get('/', auth(['admin', 'editor', 'viewer']), getDocuments);
router.post('/upload', auth(['admin', 'editor']), upload.single('file'), uploadFile);
// routes/documents.js
router.get('/:documentId', auth(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const doc = await mongoose.connection.db.collection('documents').findOne({
      _id: new mongoose.Types.ObjectId(documentId),
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({
      filename: doc.filename,
      content: doc.content,
      mimetype: doc.mimetype,
      fileId: doc.fileId,
      uploadedAt: doc.uploadedAt,
      userId: doc.userId,
      folderId: doc.folderId,
      summary: doc.summary,
      workflow: doc.workflow || { status: 'Draft', reviewers: [] },
    });
  } catch (err) {
    console.error('Fetch document error:', err);
    res.status(500).json({ error: 'Failed to fetch document content' });
  }
});
router.put('/workflow/:documentId', auth(['admin']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status, reviewerIds } = req.body;
    const validStatuses = ['Draft', 'In Review', 'Approved'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const update = {};
    if (status) update['workflow.status'] = status;
    if (reviewerIds) {
      if (!reviewerIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ error: 'Invalid reviewer IDs' });
      }
      update['workflow.reviewers'] = reviewerIds.map(id => new mongoose.Types.ObjectId(id));
    }
    const doc = await mongoose.connection.db.collection('documents').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(documentId) },
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!doc.value) return res.status(404).json({ error: 'Document not found' });
    await Activity.create({
      action: 'Workflow Updated',
      userId: req.user.id,
      userEmail: req.user.email,
      details: `Updated workflow for ${doc.value.filename} to ${status || 'reviewers assigned'}`,
    });
    res.json({ message: 'Workflow updated', document: doc.value });
  } catch (err) {
    console.error('Workflow update error:', err);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});
router.get('/file/:fileId', auth(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const { fileId } = req.params;
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

    const doc = await mongoose.connection.db.collection('documents').findOne({
      fileId: new mongoose.Types.ObjectId(fileId),
    });

    if (!doc) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.set('Content-Type', doc.mimetype);
    downloadStream.pipe(res);
  } catch (err) {
    console.error('Stream file error:', err);
    res.status(500).json({ error: 'Failed to stream file' });
  }
});

router.put('/rename/:documentId', auth(['admin', 'editor']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'Filename is required' });
    const doc = await mongoose.connection.db.collection('documents').findOne({
      _id: new mongoose.Types.ObjectId(documentId),
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    await mongoose.connection.db.collection('documents').updateOne(
      { _id: new mongoose.Types.ObjectId(documentId) },
      { $set: { filename } }
    );
    await Activity.create({
      action: 'Document Renamed',
      userId: req.user.id,
      userEmail: req.user.email,
      details: `Renamed document to: ${filename}`,
    });
    res.json({ message: 'Document renamed successfully' });
  } catch (err) {
    console.error('Rename document error:', err);
    res.status(500).json({ error: 'Failed to rename document' });
  }
});

router.put('/:documentId', auth(['admin', 'editor']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const doc = await mongoose.connection.db.collection('documents').findOne({
      _id: new mongoose.Types.ObjectId(documentId),
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    await bucket.delete(new mongoose.Types.ObjectId(doc.fileId));

    const fileId = new mongoose.Types.ObjectId();
    const uploadStream = bucket.openUploadStreamWithId(fileId, doc.filename);

    const readableStream = Readable.from(content);
    readableStream.pipe(uploadStream);

    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    await mongoose.connection.db.collection('documents').updateOne(
      { _id: new mongoose.Types.ObjectId(documentId) },
      { $set: { fileId, content } }
    );

    // Log activity
    await Activity.create({
      action: 'Document Updated',
      userId: req.user.id,
      userEmail: req.user.email,
      details: `Updated document: ${doc.filename}`,
    });

    res.json({ message: 'Document updated successfully' });
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: 'Failed to update document: ' + err.message });
  }
});

router.delete('/:documentId', auth(['admin']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const doc = await mongoose.connection.db.collection('documents').findOne({
      _id: new mongoose.Types.ObjectId(documentId),
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    await bucket.delete(new mongoose.Types.ObjectId(fileId));

    await mongoose.connection.db.collection('documents').deleteOne({
      _id: new mongoose.Types.ObjectId(documentId),
    });

    // Log activity
    await Activity.create({
      action: 'Document Deleted',
      userId: req.user.id,
      userEmail: req.user.email,
      details: `Deleted document: ${doc.filename}`,
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document: ' + err.message });
  }
});

module.exports = router;