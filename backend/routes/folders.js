const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Folder = require('../models/Folder');
const Document = require('../models/Document');
const Activity = require('../models/Activity');

router.post('/create', auth(['admin']), async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const userId = req.user.id;
    if (!name) return res.status(400).json({ error: 'Folder name required' });
    const folder = new Folder({ name, userId, parentId: parentId || null });
    await folder.save();

    // Log activity
    await Activity.create({
      action: 'Folder Created',
      userId: req.user.id,
      userEmail: req.user.email,
      details: `Created folder: ${name}`,
    });

    res.json({ folder });
  } catch (err) {
    console.error('Folder creation error:', err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

router.delete('/:folderId', auth(['admin']), async (req, res) => {
  try {
    const { folderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: 'Invalid folder ID' });
    }
    const folder = await Folder.findOne({ _id: folderId, userId: req.user.id });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found or not owned by user' });
    }
    // Check if folder contains documents or subfolders
    const documents = await Document.find({ folderId });
    const subfolders = await Folder.find({ parentId: folderId });
    if (documents.length > 0 || subfolders.length > 0) {
      return res.status(400).json({ error: 'Cannot delete folder with documents or subfolders' });
    }
    await Folder.deleteOne({ _id: folderId });

    // Log activity
    await Activity.create({
      action: 'Folder Deleted',
      userId: req.user.id,
      userEmail: req.user.email,
      details: `Deleted folder: ${folder.name}`,
    });

    res.json({ message: 'Folder deleted successfully' });
  } catch (err) {
    console.error('Folder deletion error:', err);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

router.get('/', auth(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user.id });
    res.json({ folders });
  } catch (err) {
    console.error('Folder fetch error: ', err);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

router.put('/move/:documentId', auth(['admin']), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { folderId } = req.body;
    if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: 'Invalid folder ID' });
    }
    const doc = await Document.findOne({ _id: documentId, userId: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    doc.folderId = folderId || null;
    await doc.save();

    // Log activity
    await Activity.create({
      action: 'Document Moved',
      userId: req.user.id,
      userEmail: req.user.email,
      details: `Moved document ${doc.filename} to folder ${folderId || 'root'}`,
    });

    res.json({ message: 'Document moved' });
  } catch (err) {
    console.error('Document move error: ', err);
    res.status(500).json({ error: 'Failed to move document' });
  }
});

module.exports = router;