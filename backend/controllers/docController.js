const mongoose = require('mongoose');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { Readable } = require('stream');
const axios = require('axios');
const Activity = require('../models/Activity');
const pptx2json = require('pptx2json');

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const embedding = [];

    const { originalname: filename, mimetype, buffer } = req.file;
    const { folderId } = req.body;

    // Validate folderId if provided
    if (folderId) {
      if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({ error: 'Invalid folder ID' });
      }
      const folder = await mongoose.model('Folder').findOne({ _id: folderId, userId: req.user.id });
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found or not owned by user' });
      }
    }

    // Check storage usage
    const stats = await mongoose.connection.db.command({ dbStats: 1 });
    const storageSizeMB = stats.storageSize / (1024 * 1024);
    if (storageSizeMB > 100) {
      return res.status(400).json({ error: 'Storage limit exceeded (100MB max)' });
    }

    // Extract content
    let content = '';
    try {
      if (mimetype === 'application/pdf') {
        const pdfData = await pdf(buffer);
        content = pdfData.text || 'No text extracted from PDF';
      } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        content = result.value || 'No text extracted from DOCX';
      }
      else if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
  const pptxData = await pptx2json(buffer);
  content = pptxData.text || 'No text extracted from PPTX';
} else {
        content = buffer.toString('utf8');
      }
    } catch (err) {
      console.error(`Text extraction error for ${filename}:`, err.message);
      content = `Error extracting text: ${err.message}`;
    }

    // Upload to GridFS
    const fileId = new mongoose.Types.ObjectId();
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const uploadStream = bucket.openUploadStreamWithId(fileId, filename);
    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);

    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    // Save metadata
    const doc = {
      filename,
      fileId,
      userId: req.user.id,
      uploadedAt: new Date(),
      content,
      mimetype,
      folderId: folderId ? new mongoose.Types.ObjectId(folderId) : null,
      embedding,
    };

    const result = await mongoose.connection.db.collection('documents').insertOne(doc);

    // Trigger summarization
    try {
      const inputText = content.slice(0, 512);
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6',
        { inputs: inputText, parameters: { max_length: 100, min_length: 30 } },
        {
          headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
      const summary = response.data[0]?.summary_text;
      if (summary) {
        await mongoose.connection.db.collection('documents').updateOne(
          { _id: new mongoose.Types.ObjectId(result.insertedId) },
          { $set: { summary } }
        );
        console.log(`Summary generated for document ${result.insertedId}: ${summary}`);
      }
    } catch (err) {
      console.error('Summarization error on upload:', err.message);
    }

    // Log activity
    await Activity.create({
      action: 'Document Uploaded',
      userId: req.user.id,
      userEmail: req.user.email, // This should now work with the updated middleware
      details: `Uploaded document: ${filename}`,
    });

    res.status(201).json({ message: 'File uploaded and summarized successfully', doc });
  } catch (err) {
    console.error('Upload error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'File with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to upload file: ' + err.message });
  }
};

const getDocuments = async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { $text: { $search: search } } : {};
    const documents = await mongoose.connection.db.collection('documents').find(query).toArray();
    res.json(documents);
  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

module.exports = { uploadFile, getDocuments };