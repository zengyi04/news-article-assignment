const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { db, auth } = require('./firebase-admin');
const articleRoutes = require('./routes/articles');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Firebase error handling
  if (err.code) {
    let statusCode = 500;
    let message = 'Internal server error';
    
    switch (err.code) {
      case 'auth/invalid-token':
      case 'auth/token-expired':
        statusCode = 401;
        message = 'Invalid or expired authentication token';
        break;
      case 'permission-denied':
        statusCode = 403;
        message = 'Permission denied';
        break;
      case 'not-found':
        statusCode = 404;
        message = 'Resource not found';
        break;
      case 'already-exists':
        statusCode = 409;
        message = 'Resource already exists';
        break;
      case 'resource-exhausted':
        statusCode = 429;
        message = 'Resource exhausted';
        break;
      case 'cancelled':
        statusCode = 499;
        message = 'Request cancelled';
        break;
      case 'data-loss':
      case 'unknown':
        statusCode = 500;
        message = 'Internal server error';
        break;
    }
    
    return res.status(statusCode).json({
      error: message,
      code: err.code,
      details: err.details || null,
    });
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details || err.message,
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL}`);
  console.log(`📖 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
