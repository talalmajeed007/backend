const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const config = require('./config/config');
require('dotenv').config();

// Import routes
const { router: authRouter } = require('./routes/auth');
const { router: messagesRouter } = require('./routes/messages');

// Import socket handler
const setupSocketHandlers = require('./socket/socketHandler');

// Create Express app
const app = express();
const server = http.createServer(app);

// Create Socket.io instance
const io = socketIo(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Chat App Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      messages: '/api/messages',
      health: '/api/health'
    }
  });
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🌐 CORS enabled for: ${config.corsOrigin}`);
  console.log(`🔗 Health check: http://localhost:${config.port}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
