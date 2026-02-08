const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { shopify } = require('./shopify');
const config = require('../config');

// Import routes
const webhookRoutes = require('./routes/webhooks');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

const app = express();

// Configure EJS view engine for server-rendered templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
// CRITICAL: Cookie parser must be first (needed for OAuth flow)
app.use(cookieParser());

// Trust proxy for proper cookie handling behind reverse proxy (Render, etc.)
app.set('trust proxy', 1);

// 🚨 CRITICAL: Shopify Embedded App - Iframe Embedding Configuration
// Shopify requires CSP frame-ancestors header (NOT X-Frame-Options)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors https://admin.shopify.com https://*.myshopify.com;"
  );
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 🚨 WEBHOOK ROUTES FIRST - MUST be before express.json() and express.urlencoded()
// Shopify CLI webhook handlers handle raw body parsing internally
app.use('/webhooks', webhookRoutes);

// ✅ NOW apply body parsers for all other routes (AFTER webhooks)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OAuth routes (before admin routes to ensure proper handling)
app.use('/auth', authRoutes);

// Admin routes (embedded app interface) - MUST be before static files
app.use('/', adminRoutes);

// API routes (BEFORE static files to prevent static fallback hijacking /api/*)
app.use('/api', apiRoutes);

// Serve static files LAST (only for assets, not routes)
app.use(express.static(path.join(__dirname, '../public')));

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
