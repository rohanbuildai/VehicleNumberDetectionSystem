import { io } from 'socket.io-client';

// In production via Nginx, socket connects to same origin (empty string = current host)
// In dev, falls back to localhost:5000
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || '';

let socket = null;

export const initSocket = (userId) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL || window.location.origin, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    if (userId) socket.emit('authenticate', userId);
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const subscribeToDetection = (jobId, onProgress, onResult) => {
  if (!socket) return;
  socket.on('detection:progress', (data) => { if (data.jobId === jobId) onProgress(data); });
  socket.on('detection:result', (data) => { if (data.jobId === jobId) onResult(data); });
};

export const unsubscribeDetection = () => {
  if (!socket) return;
  socket.off('detection:progress');
  socket.off('detection:result');
};
