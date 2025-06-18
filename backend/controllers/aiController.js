const mongoose = require('mongoose');
const axios = require('axios');

const summarizeDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { forceRefresh } = req.query;
    console.log(`Summarizing document: ${documentId}, forceRefresh: ${forceRefresh}`);

    // Validate documentId
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      console.log('Invalid documentId');
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Find document metadata
    const doc = await mongoose.connection.db.collection('documents').findOne({
      _id: new mongoose.Types.ObjectId(documentId),
    });
    console.log('Document found:', !!doc);

    if (!doc) {
      console.log('Document not found');
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check cache only if forceRefresh is not true
    if (doc.summary && forceRefresh !== 'true') {
      console.log('Returning cached summary');
      return res.json({ summary: doc.summary });
    }

    // Use content field
    let content = doc.content || '';
    console.log('Content field length:', content.length);

    if (!content || content.includes('Error extracting')) {
      console.log('Invalid content:', content);
      return res.status(400).json({ error: 'No valid content available for summarization' });
    }

    // Limit input size
    const inputText = content.slice(0, 512); // Reduced to 512 characters
    console.log('Input text length:', inputText.length);

    // Call Hugging Face API with BART
    const HF_TOKEN = process.env.HF_TOKEN;
    console.log('Calling Hugging Face API (BART)');
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6',
      { inputs: inputText, parameters: { max_length: 100, min_length: 30 } },
      {
        headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
        timeout: 10000, // 10-second timeout
      }
    );
    console.log('API response status:', response.status, 'Data:', response.data);

    const summary = response.data[0]?.summary_text;
    if (!summary) {
      console.log('No summary text in response:', response.data);
      return res.status(500).json({ error: 'Failed to generate summary' });
    }
    console.log('Summary generated:', summary);

    // Cache the summary
    await mongoose.connection.db.collection('documents').updateOne(
      { _id: new mongoose.Types.ObjectId(documentId) },
      { $set: { summary } }
    );
    console.log('Summary saved to DB');

    res.json({ summary });
  } catch (err) {
    console.error('Summarization error:', err.message, err.response?.data || err.response?.status);
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Hugging Face API timed out' });
    }
    if (err.response?.status === 429) {
      return res.status(429).json({ error: 'Hugging Face API rate limit exceeded' });
    }
    if (err.response?.status === 404) {
      return res.status(500).json({ error: 'Hugging Face model not found' });
    }
    res.status(500).json({ error: 'Failed to summarize document: ' + (err.response?.data?.error || err.message) });
  }
};

module.exports = { summarizeDocument };