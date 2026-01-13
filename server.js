const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const webhookRoutes = require('./routes/webhooks');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/test');
const verifyWebhook = require('./middleware/webhookVerification');

const app = express();

// Middleware
// For webhooks, we need raw body for HMAC verification
app.use('/webhooks', bodyParser.raw({ type: 'application/json' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Webhook routes (with verification middleware)
app.use('/webhooks', verifyWebhook, webhookRoutes);

// API routes
app.use('/api', apiRoutes);

// Test routes (for testing without Shopify access)
app.use('/test', testRoutes);

// Root endpoint (only for API documentation)
// Note: OAuth routes are registered before this, so /auth/* won't reach here
app.get('/', (req, res) => {
  res.json({
    message: 'Shopify Delybell Integration API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        install: 'GET /auth/install?shop=your-shop.myshopify.com',
        callback: 'GET /auth/callback',
        check: 'GET /auth/check?shop=your-shop.myshopify.com',
        success: 'GET /auth/success',
      },
      webhooks: {
        'orders/create': 'POST /webhooks/orders/create',
        'orders/update': 'POST /webhooks/orders/update',
      },
      api: {
        'sync-orders': 'POST /api/sync-orders',
        'process-order': 'POST /api/process-order/:orderId',
        'service-types': 'GET /api/service-types',
        'blocks': 'GET /api/blocks',
        'roads': 'GET /api/roads?block_id=1',
        'buildings': 'GET /api/buildings?road_id=1',
        'track': 'GET /api/track/:orderId',
        'register-webhooks': 'POST /api/webhooks/register',
      },
      test: {
        'mock-order-sample': 'GET /test/mock-order-sample',
        'process-mock-order': 'POST /test/process-mock-order',
        'process-mock-orders': 'POST /test/process-mock-orders',
      },
    },
  });
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API documentation: http://localhost:${PORT}/`);
});

module.exports = app;

