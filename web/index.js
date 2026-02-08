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
// Configure cookie parser with proper settings for production
app.use(cookieParser());

// Trust proxy for proper cookie handling behind reverse proxy (Render, etc.)
// This is CRITICAL for cookies to work correctly on Render
app.set('trust proxy', 1);

// Configure cookie settings for OAuth (Shopify API library will use these)
// Set secure cookies in production, but allow http in development
app.use((req, res, next) => {
  // Store original cookie function
  const originalCookie = res.cookie.bind(res);
  
  // Override cookie function to set proper defaults
  res.cookie = function(name, value, options = {}) {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    // Set secure cookies in production (HTTPS only)
    if (isProduction && isSecure) {
      options.secure = true;
    }
    
    // Set SameSite to None for cross-site requests (Shopify OAuth)
    // But only if secure is true (browsers require secure for SameSite=None)
    if (isProduction && isSecure) {
      options.sameSite = 'none';
    } else {
      options.sameSite = 'lax';
    }
    
    // Set httpOnly for security (prevents JavaScript access)
    if (options.httpOnly === undefined) {
      options.httpOnly = true;
    }
    
    // Set path to root
    if (!options.path) {
      options.path = '/';
    }
    
    return originalCookie(name, value, options);
  };
  
  next();
});

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
