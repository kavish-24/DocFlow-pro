const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    return conn.connection;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};

const setupIndexes = async () => {
  try {
    const db = await connectDB();
    await db.db.collection('documents').createIndex(
      { filename: 'text', summary: 'text', content: 'text' },
      { name: 'search_text_index' }
    );
    console.log('Indexes created');
    return db;
  } catch (err) {
    if (err.codeName === 'IndexOptionsConflict') {
      console.warn('⚠️ Text index already exists with a different name. Skipping creation.');
    } else {
      console.error('Index setup error:', err);
      throw err;
    }
  }
};

module.exports = { connectDB, setupIndexes };
