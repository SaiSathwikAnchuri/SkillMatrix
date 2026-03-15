require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

// ── Connect to MongoDB ──────────────────────────────────────────
connectDB();

// ── Security Middleware ─────────────────────────────────────────
app.use(helmet());

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://skill--matrix.vercel.app"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ───────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many auth attempts'
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ── Root Route ──────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('🚀 SkillMatrix Backend API is running');
});

// ── API Routes ──────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/submissions', require('./routes/submissions').router);
app.use('/api/recruiter', require('./routes/recruiter'));

// ── Health Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SkillMatrix API running',
    timestamp: new Date().toISOString()
  });
});

// ── Error Handler ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Server error'
  });
});

// ── Start Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 SkillMatrix server running on port ${PORT}`);
});