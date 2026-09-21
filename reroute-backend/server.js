require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');

const ipWhitelist = require('./middleware/ipWhitelist');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admins');
const networkRoutes = require('./routes/network');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reroute';

// Trust reverse proxies if any (e.g. Nginx, Vite proxy)
app.set('trust proxy', 1);

// Allowed CORS origins (Vue auth on 5173, React dashboard on 5174 or 5175)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Campus IP Whitelist Middleware
app.use(ipWhitelist);

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB at', MONGO_URI))
  .catch(err => {
    console.warn('⚠️ MongoDB connection warning:', err.message);
    console.warn('ℹ️ Ensure MongoDB is running locally on port 27017 or provide MONGO_URI in .env');
  });

// Session Configuration with Mongo Store fallback to MemoryStore if not connected yet
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'reroute_secret_key_default',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
};

try {
  sessionConfig.store = MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
  });
} catch (e) {
  console.warn('⚠️ Falling back to default memory session store');
}

app.use(session(sessionConfig));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/network', networkRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    clientIp: req.clientIp || req.socket.remoteAddress
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ReRoute API Server running on http://localhost:${PORT}`);
});
