const jwt = require('jsonwebtoken');
const logger = require('./logger');

const socketHandler = (io) => {
  const connectedUsers = new Map();

  // Middleware: verify JWT on every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      // Allow unauthenticated connection — authentication done per-event
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch {
      // Don't reject — let the authenticate event handle it
      return next();
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // If already authenticated via middleware, auto-join room
    if (socket.userId) {
      connectedUsers.set(socket.userId, socket.id);
      socket.join(`user:${socket.userId}`);
      socket.emit('authenticated', { success: true });
    }

    // Fallback: client sends token explicitly
    socket.on('authenticate', (token) => {
      if (!token || typeof token !== 'string') {
        socket.emit('authenticated', { success: false, error: 'Token required' });
        return;
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(`user:${userId}`);
        socket.emit('authenticated', { success: true });
        logger.info(`User ${userId} authenticated via socket`);
      } catch {
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    });

    socket.on('join_room', (room) => {
      // Only allow users to join their own user room
      if (socket.userId && room === `user:${socket.userId}`) {
        socket.join(room);
      }
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
      }
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  io.emitDetectionProgress = (userId, data) => {
    io.to(`user:${userId}`).emit('detection:progress', data);
  };

  io.emitDetectionResult = (userId, data) => {
    io.to(`user:${userId}`).emit('detection:result', data);
  };

  return { connectedUsers };
};

module.exports = socketHandler;
