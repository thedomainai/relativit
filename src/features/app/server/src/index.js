require('dotenv').config();

// Verify critical environment variables are set
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.error('ERROR: DATABASE_URL is not set in production environment');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Initialize Prisma client early to catch connection issues
const prisma = require('./utils/prisma');

// Import routes
const authRoutes = require('./routes/auth.routes');
const settingsRoutes = require('./routes/settings.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const threadRoutes = require('./routes/thread.routes');
const messageRoutes = require('./routes/message.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
// Cloud RunはPORT環境変数を自動設定する（デフォルト: 8080）
const PORT = process.env.PORT || 8080;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later' }
});
app.use('/api/auth/request-code', authLimiter);
app.use('/api/auth/verify-code', authLimiter);
app.use('/api/auth/login', authLimiter);

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api', threadRoutes);  // Handles /api/workspaces/:id/threads and /api/threads/:id
app.use('/api', messageRoutes); // Handles /api/threads/:id/messages and /api/messages/:id
app.use('/api/ai', aiRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================

// Test database connection before starting server
async function startServer() {
  try {
    // Test Prisma connection
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Cloud Run requires listening on 0.0.0.0 (all interfaces)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 Relativit API Server                        ║
║                                                   ║
║   Port: ${PORT}                                      ║
║   Host: 0.0.0.0                                   ║
║   Mode: ${process.env.NODE_ENV || 'development'}                            ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
