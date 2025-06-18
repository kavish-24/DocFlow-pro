const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');

dotenv.config();
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://docflow-pro.onrender.com'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());



app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.send('Document Assistant API Running'));

module.exports = app;
