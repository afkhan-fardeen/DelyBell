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
      console.error('[Webhook] ❌ API secret not configured!');
      console.error('[Webhook] Check that SHOPIFY_API_SECRET environment variable is set');
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
          success: false,
          error: 'Webhook verification not configured',
        });
      }
      console.warn('[Webhook] Development mode: Allowing webhook without API secret');
      return next();
    }
    
    // Log API secret status (first few chars only for security)
    const secretPreview = config.shopify.apiSecret.substring(0, 4) + '...' + config.shopify.apiSecret.substring(config.shopify.apiSecret.length - 4);
    console.log('[Webhook Verification] API secret configured:', secretPreview, `(length: ${config.shopify.apiSecret.length})`);

    // Get raw body (for webhooks, body is Buffer from raw body parser)
    // CRITICAL: Must use the raw body exactly as Shopify sent it for HMAC verification
    // Use req.rawBody if available (from verify callback), otherwise use req.body
    let body;
    if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
      // Use rawBody from verify callback (most reliable)
      body = req.rawBody;
      console.log('[Webhook Verification] Using req.rawBody for HMAC calculation');
    } else if (Buffer.isBuffer(req.body)) {
      // Use Buffer directly (this is what Shopify sends)
      body = req.body;
      console.log('[Webhook Verification] Using req.body (Buffer) for HMAC calculation');
    } else if (typeof req.body === 'string') {
      // Convert string to Buffer
      body = Buffer.from(req.body, 'utf8');
      console.log('[Webhook Verification] Converting req.body (string) to Buffer for HMAC calculation');
    } else {
      // If body was already parsed, we need the raw body
      // This shouldn't happen if bodyParser.raw is configured correctly
      console.warn('[Webhook] Body is not Buffer or string, attempting to reconstruct');
      console.warn('[Webhook] Body type:', typeof req.body, 'isBuffer:', Buffer.isBuffer(req.body));
      body = Buffer.from(JSON.stringify(req.body), 'utf8');
    }
    
    // Log body details for debugging
    console.log('[Webhook Verification] Body details:', {
      length: body.length,
      isBuffer: Buffer.isBuffer(body),
      firstBytes: body.slice(0, 50).toString('hex'),
      hasRawBody: !!req.rawBody,
      rawBodyLength: req.rawBody ? req.rawBody.length : 0,
    });
    
    // Calculate expected HMAC
    // CRITICAL: Use body directly (not stringified) - Shopify sends raw bytes
    // Shopify calculates HMAC using the raw request body as-is
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
        hasRawBody: !!req.rawBody,
        rawBodyMatches: req.rawBody ? Buffer.compare(req.rawBody, body) === 0 : 'N/A',
      });
      
      // Additional diagnostic: Check if API secret might be wrong
      console.error('[Webhook] 🔍 Diagnostic info:');
      console.error('[Webhook]   - API Secret length:', config.shopify.apiSecret.length);
      console.error('[Webhook]   - API Secret preview:', config.shopify.apiSecret.substring(0, 4) + '...' + config.shopify.apiSecret.substring(config.shopify.apiSecret.length - 4));
      console.error('[Webhook]   - Body first 100 chars:', body.toString('utf8').substring(0, 100));
      console.error('[Webhook]   - Expected HMAC (full):', hash);
      console.error('[Webhook]   - Received HMAC (full):', hmac);
      
      // In development, allow webhook to proceed with warning (for testing)
      // In production, reject for security
      if (process.env.NODE_ENV === 'production') {
        console.error('[Webhook] Production mode: Rejecting webhook with invalid HMAC');
        console.error('[Webhook] ⚠️ TROUBLESHOOTING:');
        console.error('[Webhook]   1. Verify SHOPIFY_API_SECRET matches your app\'s API secret in Shopify Partner Dashboard');
        console.error('[Webhook]   2. Check that the webhook URL is correct and not being modified by a proxy');
        console.error('[Webhook]   3. Ensure no middleware is modifying the request body before HMAC verification');
        console.error('[Webhook]   4. Check if the request is being compressed/decompressed by a proxy');
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
          hint: 'Check that SHOPIFY_API_SECRET matches your app\'s API secret in Shopify Partner Dashboard. See server logs for details.',
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

