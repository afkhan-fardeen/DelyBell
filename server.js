const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config');
const webhookRoutes = require('./routes/webhooks');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const verifyWebhook = require('./middleware/webhookVerification');

const app = express();

// Configure EJS view engine for server-rendered templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
// CRITICAL: Cookie parser must be first (needed for OAuth flow)
app.use(cookieParser());

// CRITICAL: For webhooks, we need raw body for HMAC verification
// Must be applied BEFORE any other body parsers
app.use('/webhooks', bodyParser.raw({ 
  type: 'application/json',
  verify: (req, res, buf) => {
    // Store raw body for HMAC verification
    req.rawBody = buf;
  }
}));
// Other body parsers (applied to non-webhook routes)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// OAuth routes (must be before webhooks)
app.use('/auth', authRoutes);

// Admin routes (embedded app interface)
app.use('/', adminRoutes);

// Webhook routes (with verification middleware)
app.use('/webhooks', verifyWebhook, webhookRoutes);

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

