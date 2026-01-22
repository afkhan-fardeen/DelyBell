const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');
const webhookRoutes = require('./routes/webhooks');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const testRoutes = require('./routes/test');
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

// Test routes (for testing without Shopify access)
app.use('/test', testRoutes);

// Root endpoint - Show message directing to /app
// Note: OAuth routes are registered before this, so /auth/* won't reach here
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Delybell Order Sync</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #f6f6f7;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        h1 { color: #202223; margin-bottom: 16px; }
        p { color: #6d7175; margin-bottom: 24px; }
        a {
          display: inline-block;
          padding: 12px 24px;
          background: #008060;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        }
        a:hover { background: #006e52; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚚 Delybell Order Sync</h1>
        <p>Please access the app at:</p>
        <a href="/app">Go to App →</a>
      </div>
    </body>
    </html>
  `);
});

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

