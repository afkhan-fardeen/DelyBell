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

    console.log('[Webhook Verification] Incoming webhook:', {
      path: req.path,
      method: req.method,
      shop: shop || 'not found',
      topic: topic || 'not found',
      hasHmac: !!hmac,
      hasBody: !!req.body,
      bodyType: req.body ? (Buffer.isBuffer(req.body) ? 'Buffer' : typeof req.body) : 'none',
    });

    if (!hmac) {
      console.error('[Webhook] Verification failed: No HMAC header found');
      // Require HMAC verification in production (Shopify App Store requirement)
      if (process.env.NODE_ENV === 'production') {
        console.error('[Webhook] Production mode: Rejecting webhook without HMAC');
        return res.status(401).json({
          success: false,
          error: 'Webhook verification required',
        });
      }
      // In development, allow webhooks without HMAC for testing
      console.warn('[Webhook] HMAC verification skipped (development mode)');
      return next();
    }

    if (!config.shopify.apiSecret) {
      console.warn('Webhook verification skipped: No API secret configured');
      return next();
    }

    // Get raw body (for webhooks, body is Buffer from raw body parser)
    // CRITICAL: Must use the raw body exactly as Shopify sent it for HMAC verification
    // Use req.rawBody if available (from verify callback), otherwise use req.body
    let body;
    if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
      // Use rawBody from verify callback (most reliable)
      body = req.rawBody;
    } else if (Buffer.isBuffer(req.body)) {
      // Use Buffer directly (this is what Shopify sends)
      body = req.body;
    } else if (typeof req.body === 'string') {
      // Convert string to Buffer
      body = Buffer.from(req.body, 'utf8');
    } else {
      // If body was already parsed, we need the raw body
      // This shouldn't happen if bodyParser.raw is configured correctly
      console.warn('[Webhook] Body is not Buffer or string, attempting to reconstruct');
      body = Buffer.from(JSON.stringify(req.body), 'utf8');
    }
    
    // Calculate expected HMAC
    // CRITICAL: Use body directly (not stringified) - Shopify sends raw bytes
    const hash = crypto
      .createHmac('sha256', config.shopify.apiSecret)
      .update(body) // Don't specify encoding - use raw Buffer
      .digest('base64');

    // Compare HMACs
    if (hash !== hmac) {
      console.error('[Webhook] ❌ HMAC verification failed:', {
        shop,
        topic,
        expected: hash.substring(0, 20) + '...',
        received: hmac.substring(0, 20) + '...',
        bodyLength: body.length,
        bodyType: Buffer.isBuffer(body) ? 'Buffer' : typeof body,
        apiSecretConfigured: !!config.shopify.apiSecret,
        apiSecretLength: config.shopify.apiSecret ? config.shopify.apiSecret.length : 0,
      });
      
      // In development, allow webhook to proceed with warning (for testing)
      // In production, reject for security
      if (process.env.NODE_ENV === 'production') {
        console.error('[Webhook] Production mode: Rejecting webhook with invalid HMAC');
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
          hint: 'Check that SHOPIFY_API_SECRET matches your app\'s API secret in Shopify Partner Dashboard',
        });
      } else {
        console.warn('[Webhook] ⚠️ Development mode: Allowing webhook despite HMAC mismatch (for testing)');
        console.warn('[Webhook] ⚠️ Fix HMAC verification before deploying to production!');
        // Allow to proceed in development for testing
        return next();
      }
    }

    console.log(`[Webhook] Verified: ${topic} from ${shop}`);
    next();
  } catch (error) {
    console.error('[Webhook] Verification error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Webhook verification failed',
    });
  }
}

module.exports = verifyWebhook;

