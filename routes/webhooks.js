const express = require('express');
const router = express.Router();
const orderProcessor = require('../services/orderProcessor');
const shopifyClient = require('../services/shopifyClient');

/**
 * Parse webhook body (raw JSON string)
 */
function parseWebhookBody(req) {
  try {
    let body = req.body;
    
    // Log what we received
      console.log('[Webhook] Body inspection:', {
      type: typeof body,
      isBuffer: Buffer.isBuffer(body),
      isArray: Array.isArray(body),
      keys: typeof body === 'object' && body !== null ? Object.keys(body).slice(0, 10) : 'N/A',
    });
    
    // If body is Buffer (raw from bodyParser.raw), parse it
    if (Buffer.isBuffer(body)) {
      const bodyString = body.toString('utf8');
      // Log only in development (don't log sensitive data in production)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Webhook] Raw webhook body (first 300 chars):', bodyString.substring(0, 300));
      }
      const parsed = JSON.parse(bodyString);
      console.log('[Webhook] Parsed from Buffer, order ID:', parsed.id || parsed.order_number || 'not found');
      return parsed;
    }
    
    // If body is string, parse it
    if (typeof body === 'string') {
      console.log('[Webhook] Body is string, parsing...');
      const parsed = JSON.parse(body);
      console.log('[Webhook] Parsed from string, order ID:', parsed.id || parsed.order_number || 'not found');
      return parsed;
    }
    
    // If body is already parsed (object), check if it's the order directly or wrapped
    if (typeof body === 'object' && body !== null) {
      // Shopify webhook sends the order object directly, not wrapped
      // Check if this looks like a Shopify order
      if (body.id || body.order_number || body.line_items || body.customer) {
        console.log('[Webhook] Body is already parsed object, order ID:', body.id || body.order_number || 'not found');
        return body;
      }
      
      // Might be wrapped in another object
      console.warn('[Webhook] Body is object but doesn\'t look like order, keys:', Object.keys(body));
      console.log('📄 Full body:', JSON.stringify(body, null, 2).substring(0, 500));
      
      // Try to find order in common wrapper keys
      if (body.order) return body.order;
      if (body.data) return body.data;
      if (body.webhook) return body.webhook;
      
      return body; // Return as-is, let the handler deal with it
    }
    
    console.warn('[Webhook] Unknown body type:', typeof body);
    return body;
  } catch (error) {
    console.error('[Webhook] Error parsing webhook body:', error.message);
    console.error('Body type:', typeof req.body);
    console.error('Body is Buffer:', Buffer.isBuffer(req.body));
    if (Buffer.isBuffer(req.body)) {
      console.error('Body content:', req.body.toString('utf8').substring(0, 500));
    } else if (typeof req.body === 'object') {
      console.error('Body content:', JSON.stringify(req.body, null, 2).substring(0, 500));
    }
    throw error; // Re-throw to see the actual error
  }
}

/**
 * Webhook endpoint for new order creation
 * This endpoint receives webhooks from Shopify when orders are created
 * Webhook verification is handled by middleware
 */
router.post('/orders/create', async (req, res) => {
  const startTime = Date.now();
  
  // CRITICAL: Always respond 200 OK within 5 seconds (Shopify requirement)
  // Process order asynchronously if needed
  const respondQuickly = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed < 4500) { // Respond before 5 seconds
      res.status(200).json({
        success: true,
        message: 'Webhook received, processing order',
      });
      return true;
    }
    return false;
  };

  try {
    console.log('[Webhook] Handler called: /orders/create');
    
    // Parse webhook body (raw body is Buffer, need to parse JSON)
    let shopifyOrder;
    try {
      shopifyOrder = parseWebhookBody(req);
      console.log('[Webhook] Parsed order data:', shopifyOrder ? `Order ID: ${shopifyOrder.id || shopifyOrder.order_number || 'unknown'}` : 'NULL');
      
      if (!shopifyOrder) {
        console.error('[Webhook] Parsed order is null or undefined');
        return res.status(200).json({ // Always 200 OK
          success: false,
          error: 'Invalid webhook payload: order is null',
        });
      }
      
      if (!shopifyOrder.id && !shopifyOrder.order_number) {
        console.error('[Webhook] Order missing ID');
        return res.status(200).json({ // Always 200 OK
          success: false,
          error: 'Invalid webhook payload: missing order ID',
        });
      }
    } catch (parseError) {
      console.error('[Webhook] Failed to parse webhook body:', parseError.message);
      return res.status(200).json({ // Always 200 OK
        success: false,
        error: `Failed to parse webhook body: ${parseError.message}`,
      });
    }
    
    const orderId = shopifyOrder.order_number || shopifyOrder.id;
    console.log(`[Webhook] Received webhook for new order: ${orderId}`);

    // Get shop domain from headers or order data
    const shop = req.headers['x-shopify-shop-domain'] || shopifyOrder.shop;
    if (!shop) {
      console.error('[Webhook] Shop domain not found in webhook headers');
      return res.status(200).json({ // Always 200 OK
        success: false,
        error: 'Shop domain not found in webhook headers',
      });
    }

    console.log(`[Webhook] Processing order for shop: ${shop}`);

    // Retrieve session from storage
    const session = await shopifyClient.getSession(shop);
    if (!session) {
      console.warn(`[Webhook] No session found for shop: ${shop}. Order processing will continue but tags won't be updated.`);
      // Still respond 200 OK - don't block Shopify
      if (!respondQuickly()) {
        return res.status(200).json({
          success: false,
          error: 'No session found for shop',
        });
      }
      return; // Process asynchronously
    } else {
      console.log(`[Webhook] Session found for shop: ${shop}`);
    }

    // Process the order
    // Pickup location: Fetched from Shopify store address (per shop)
    // Destination: Parsed from Shopify shipping address (from order)
    
    const mappingConfig = {
      service_type_id: parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      shop: shop, // Pass shop domain to fetch pickup location from Shopify store address
      session: session, // Pass session so pickup location can be fetched from Shopify
      destination: null, // Will be parsed from Shopify shipping address
    };

    console.log(`[Webhook] Starting order processing for shop: ${shop}`);

    // Respond quickly to Shopify (within 5 seconds)
    if (!respondQuickly()) {
      // If we're already past 4.5 seconds, just respond and process async
      return res.status(200).json({
        success: true,
        message: 'Webhook received, processing asynchronously',
      });
    }

    // Process order (may take longer than 5 seconds, but we've already responded)
    try {
      const result = await orderProcessor.processOrder(
        shopifyOrder,
        session,
        mappingConfig
      );

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Webhook] Order processing result:`, JSON.stringify(result, null, 2));
      } else {
        console.log(`[Webhook] Order processing completed:`, result.success ? 'Success' : 'Failed');
      }

      // Log result but don't send response (already sent)
      if (!result.success) {
        console.error(`[Webhook] Order processing failed for order ${orderId}:`, result.error);
        // TODO: Add to retry queue for failed orders
      }
    } catch (processError) {
      console.error(`[Webhook] Order processing error for order ${orderId}:`, processError.message);
      // TODO: Add to retry queue for failed orders
      // Don't throw - we've already responded to Shopify
    }
  } catch (error) {
    console.error('[Webhook] Order create webhook error:', error.message);
    // Always respond 200 OK - never block Shopify webhooks
    if (!res.headersSent) {
      res.status(200).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
          ? 'Webhook received, processing error logged'
          : error.message,
      });
    }
  }
});

/**
 * Webhook endpoint for order updates
 */
router.post('/orders/update', async (req, res) => {
  try {
    const shopifyOrder = parseWebhookBody(req);
    const shop = req.headers['x-shopify-shop-domain'] || shopifyOrder.shop;
    
    console.log(`[Webhook] Received webhook for order update: ${shopifyOrder.order_number || shopifyOrder.id} from ${shop}`);
    
    // Handle order updates if needed
    // For now, just acknowledge the webhook
    // You can add logic here to sync order updates to Delybell if needed
    
    // Always respond 200 OK (Shopify requirement)
    res.status(200).json({ 
      success: true, 
      message: 'Order update received',
      orderId: shopifyOrder.id,
      shop,
    });
  } catch (error) {
    console.error('[Webhook] Order update webhook error:', error.message);
    // Always respond 200 OK - never block Shopify
    res.status(200).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' 
        ? 'Order update webhook received'
        : error.message
    });
  }
});

/**
 * App Uninstall Webhook
 * Handles app uninstallation - cleans up sessions and data
 * POST /webhooks/app/uninstalled
 */
router.post('/app/uninstalled', async (req, res) => {
  try {
    console.log('[Webhook] App uninstall webhook received');
    
    // Parse webhook body
    let shopifyData;
    try {
      shopifyData = parseWebhookBody(req);
    } catch (parseError) {
      console.error('[Webhook] Failed to parse uninstall webhook:', parseError.message);
      // Always respond 200 OK
      return res.status(200).json({
        success: false,
        error: 'Invalid webhook payload',
      });
    }
    
    const shop = req.headers['x-shopify-shop-domain'] || shopifyData.domain;
    
    if (!shop) {
      console.error('[Webhook] Shop domain not found in uninstall webhook');
      // Always respond 200 OK
      return res.status(200).json({
        success: false,
        error: 'Shop domain not found',
      });
    }
    
    console.log(`[Webhook] Processing app uninstall for shop: ${shop}`);
    
    // Delete session from storage
    try {
      const session = await shopifyClient.getSession(shop);
      if (session && session.id) {
        await sessionStorage.deleteSession(session.id);
        console.log(`[Webhook] Deleted session for shop: ${shop}`);
      }
      
      // Also try to delete custom app session if exists
      const customSessionId = `custom_${shop}`;
      const customSession = await sessionStorage.loadSession(customSessionId);
      if (customSession) {
        await sessionStorage.deleteSession(customSessionId);
        console.log(`[Webhook] Deleted custom app session for shop: ${shop}`);
      }
    } catch (sessionError) {
      console.error('[Webhook] Error deleting session (non-critical):', sessionError.message);
    }
    
    // Note: Webhooks are automatically removed by Shopify when app is uninstalled
    // No need to manually delete webhooks
    
    console.log(`[Webhook] App uninstall processed for shop: ${shop}`);
    
    // Always respond 200 OK
    res.status(200).json({
      success: true,
      message: 'App uninstall processed',
      shop,
    });
  } catch (error) {
    console.error('[Webhook] App uninstall webhook error:', error.message);
    // Always respond 200 OK - never block Shopify
    res.status(200).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

