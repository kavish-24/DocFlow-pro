require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http'); // ✅ For creating the HTTP server
const setupWebSocket = require('./utils/websocket'); // ✅ Your custom WebSocket setup (Yjs, etc.)
const analyticsRoutes = require('./routes/analytics');

// Route imports
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const folderRoutes = require('./routes/folders');
const activityRoutes = require('./routes/activities');
const aiRoutes = require('./routes/ai');
const commentRoutes = require('./routes/comments');

const app = express();

// Middleware
app.use(cors({ origin: FRONTEND_UR, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes); // assuming this exports a function
app.use('/api/folders', folderRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/analytics', analyticsRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Create HTTP server and attach WebSocket
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// 🔌 Pass server to WebSocket handler (e.g., y-websocket)
setupWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
