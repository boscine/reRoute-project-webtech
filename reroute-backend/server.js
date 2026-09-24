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
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      // Check explicit allowed origins list
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // Automatically allow any local network origin (192.168.x.x, 10.x.x.x, 172.16-31.x.x, localhost)
      const url = new URL(origin);
      const host = url.hostname;
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
      ) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Campus IP Whitelist Middleware
app.use(ipWhitelist);

const { connectDB } = require('./db');

async function startServer() {
  const activeMongoUri = await connectDB();

  // Session Configuration
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

  if (activeMongoUri) {
    try {
      sessionConfig.store = MongoStore.create({
        mongoUrl: activeMongoUri,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60,
      });
    } catch (e) {
      console.warn('⚠️ Falling back to default memory session store');
    }
  }

  app.use(session(sessionConfig));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admins', adminRoutes);
  app.use('/api/network', networkRoutes);

  // Root and Health check endpoints
  app.get('/', (req, res) => {
    res.json({ message: 'ReRoute API running', status: 'ok' });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date(),
      clientIp: req.clientIp || req.socket.remoteAddress,
      mongo: activeMongoUri ? 'connected' : 'disconnected'
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ReRoute API Server running on:`);
    console.log(`   - Local:   http://localhost:${PORT}`);
    console.log(`   - Network: http://192.168.100.14:${PORT}`);
    console.log(`   - Health:  http://localhost:${PORT}/api/health`);
  });
}

startServer();
