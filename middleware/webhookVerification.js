const crypto = require('crypto');
const config = require('../config');

/**
 * Verify Shopify webhook HMAC signature
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function verifyWebhook(req, res, next) {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const shop = req.headers['x-shopify-shop-domain'];
    const topic = req.headers['x-shopify-topic'];

    if (!hmac) {
      console.warn('Webhook verification skipped: No HMAC header found');
      // In development, allow webhooks without HMAC
      // In production, you should require HMAC verification
      return next();
    }

    if (!config.shopify.apiSecret) {
      console.warn('Webhook verification skipped: No API secret configured');
      return next();
    }

    // Get raw body (for webhooks, body is Buffer from raw body parser)
    let body;
    if (Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (typeof req.body === 'string') {
      body = Buffer.from(req.body, 'utf8');
    } else {
      body = Buffer.from(JSON.stringify(req.body), 'utf8');
    }
    
    // Calculate expected HMAC
    const hash = crypto
      .createHmac('sha256', config.shopify.apiSecret)
      .update(body, 'utf8')
      .digest('base64');

    // Compare HMACs
    if (hash !== hmac) {
      console.error('Webhook verification failed:', {
        shop,
        topic,
        expected: hash,
        received: hmac,
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }

    console.log(`✅ Webhook verified: ${topic} from ${shop}`);
    next();
  } catch (error) {
    console.error('Webhook verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Webhook verification failed',
    });
  }
}

module.exports = verifyWebhook;

