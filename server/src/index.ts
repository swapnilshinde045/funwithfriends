import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { CONFIG } from './config.js';
import { initDatabase } from './db/database.js';
import { setupSocketServer } from './socket/index.js';

import authRoutes from './routes/auth.js';
import friendRoutes from './routes/friends.js';
import roomRoutes from './routes/rooms.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';

// Initialize SQLite Database
initDatabase();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // Allow development origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Root & Health check endpoints
app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    service: 'PlaySphere Multiplayer & Social Backend',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      rooms: '/api/rooms',
      friends: '/api/friends',
      users: '/api/users'
    }
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PlaySphere Real-Time API'
  });
});

// Setup Real-time WebSockets
setupSocketServer(io);

// Start server
server.listen(CONFIG.PORT, () => {
  console.log(`🎮 PlaySphere Server running on port ${CONFIG.PORT} (http://localhost:${CONFIG.PORT})`);
});
