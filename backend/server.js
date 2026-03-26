const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { connectDB } = require('./config/database');
// In-memory cache is initialised on first import — no connection step needed
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const socketHandler = require('./config/socket');

// Routes
const authRoutes = require('./routes/authRoutes');
const detectionRoutes = require('./routes/detectionRoutes');
const imageRoutes = require('./routes/imageRoutes');
const userRoutes = require('./routes/userRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const aiAgentRoutes = require('./routes/aiAgentRoutes');

const app = express();
const server = http.createServer(app);

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Socket.IO setup
const io = socketio(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app for use in controllers
app.set('io', io);
socketHandler(io);

// ─── Security Middleware ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// ─── General Middleware ────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// Static files - serve processed images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Rate Limiting ─────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION || 'v1',
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/detection`, detectionRoutes);
app.use(`${apiPrefix}/images`, imageRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/analytics`, analyticsRoutes);
app.use(`${apiPrefix}/vehicles`, vehicleRoutes);
app.use(`${apiPrefix}/ai`, aiAgentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ─── Error Handler ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('✅ MongoDB connected');

    server.listen(PORT, () => {
      logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`📡 API available at http://localhost:${PORT}${apiPrefix}`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

// ─── Graceful Shutdown ─────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await mongoose.connection.close();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
