const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');
const webhookRoutes = require('./routes/webhooks');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const verifyWebhook = require('./middleware/webhookVerification');

const app = express();

// Middleware
// For webhooks, we need raw body for HMAC verification
app.use('/webhooks', bodyParser.raw({ type: 'application/json' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (admin UI)
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

