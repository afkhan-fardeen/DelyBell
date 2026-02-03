const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const webhookRoutes = require('./routes/webhooks');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

// Configure EJS view engine for server-rendered templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
// CRITICAL: Cookie parser must be first (needed for OAuth flow)
// Configure cookie parser with proper settings for production
app.use(cookieParser());

// Trust proxy for proper cookie handling behind reverse proxy (Render, etc.)
app.set('trust proxy', 1);

// 🚨 CRITICAL: Webhook routes MUST be defined FIRST, before any body parsers
// This ensures the raw body is preserved exactly as Shopify sends it
// Webhook routes will use express.raw() inline for HMAC verification

// Serve static files (public install page, legal pages, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth routes
app.use('/auth', authRoutes);

// 🚨 WEBHOOK ROUTES FIRST - before any body parsers
// Webhook routes handle their own raw body parsing inline
app.use('/webhooks', webhookRoutes);

// ✅ NOW apply body parsers for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin routes (embedded app interface)
app.use('/', adminRoutes);

// API routes
app.use('/api', apiRoutes);


// Root endpoint - Handled by admin routes
// The admin route will handle both / and /app

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
const PORT = config.server.port;
// Listen on 0.0.0.0 to accept connections from any network interface (required for production)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API documentation: http://localhost:${PORT}/`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

