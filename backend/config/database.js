const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const uri = process.env.NODE_ENV === 'production'
    ? process.env.MONGODB_URI_PROD
    : process.env.MONGODB_URI;

  // Skip connection if no URI is provided
  if (!uri) {
    logger.warn('MongoDB URI not configured, skipping database connection');
    return null;
  }

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    // Don't throw error - allow server to start without DB
    logger.warn('Server will continue without database connection');
    return null;
  }
};

module.exports = { connectDB };
