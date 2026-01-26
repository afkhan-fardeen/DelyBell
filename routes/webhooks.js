const express = require('express');
const router = express.Router();
const orderProcessor = require('../services/orderProcessor');
const shopifyClient = require('../services/shopifyClient');
const { getShop } = require('../services/shopRepo');
const { normalizeShop } = require('../utils/normalizeShop');
const { supabase } = require('../services/db');

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
    console.log('[Webhook] ========================================');
    console.log('[Webhook] 🎯 Handler called: /orders/create');
    console.log('[Webhook] Headers:', {
      'x-shopify-shop-domain': req.headers['x-shopify-shop-domain'],
      'x-shopify-topic': req.headers['x-shopify-topic'],
      'x-shopify-hmac-sha256': req.headers['x-shopify-hmac-sha256'] ? 'present' : 'missing',
    });
    console.log('[Webhook] ========================================');
    
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
    const orderStatus = shopifyOrder.financial_status || 'unknown';
    const orderFulfillmentStatus = shopifyOrder.fulfillment_status || 'unfulfilled';
    
    console.log(`[Webhook] 📦 Received webhook for NEW order: ${orderId}`);
    console.log(`[Webhook] Order status - Financial: ${orderStatus}, Fulfillment: ${orderFulfillmentStatus}`);
    console.log(`[Webhook] Order will be synced to Delybell immediately (regardless of payment status)`);

    // Get shop domain from headers or order data
    let shop = req.headers['x-shopify-shop-domain'] || shopifyOrder.shop;
    if (!shop) {
      console.error('[Webhook] Shop domain not found in webhook headers');
      return res.status(200).json({ // Always 200 OK
        success: false,
        error: 'Shop domain not found in webhook headers',
      });
    }

    // Normalize shop domain ONCE
    shop = normalizeShop(shop);
    console.log(`[Webhook] Processing order for shop: ${shop}`);

    // Get shop data from Supabase (stateless)
    let shopData;
    try {
      shopData = await getShop(shop);
      if (!shopData || !shopData.access_token) {
        console.error(`[Webhook] Shop ${shop} not installed or missing access token`);
        // Still respond 200 OK - don't block Shopify
        if (!respondQuickly()) {
          return res.status(200).json({
            success: false,
            error: 'Shop not installed',
          });
        }
        return; // Process asynchronously
      }
      console.log(`[Webhook] ✅ Shop ${shop} found in database`);
    } catch (dbError) {
      console.error(`[Webhook] Error fetching shop ${shop}:`, dbError.message);
      // Still respond 200 OK - don't block Shopify
      if (!respondQuickly()) {
        return res.status(200).json({
          success: false,
          error: 'Database error',
        });
      }
      return;
    }

    // Create session-like object for compatibility with existing code
    const session = {
      id: `offline_${shop}`,
      shop: shop,
      accessToken: shopData.access_token,
      scope: shopData.scopes,
      scopes: shopData.scopes,
      isOnline: false,
    };

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
    // IMPORTANT: We process ALL orders immediately when created, regardless of payment status
    try {
      console.log(`[Webhook] 🚀 Starting order processing for order ${orderId} (Status: ${orderStatus})...`);
      console.log(`[Webhook] Processing order immediately - no payment status check`);
      
      const result = await orderProcessor.processOrder(
        shopifyOrder,
        session,
        mappingConfig
      );

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Webhook] Order processing result:`, JSON.stringify(result, null, 2));
      } else {
        console.log(`[Webhook] Order processing completed:`, result.success ? 'Success' : 'Failed');
        if (!result.success) {
          console.error(`[Webhook] ❌ Order processing failed for order ${orderId}:`, result.error);
        } else {
          console.log(`[Webhook] ✅ Order ${orderId} synced to Delybell: ${result.delybellOrderId}`);
        }
      }

      // Log result but don't send response (already sent)
      if (!result.success) {
        console.error(`[Webhook] ❌ Order processing failed for order ${orderId}:`, result.error);
        console.error(`[Webhook] Error details:`, result.errorDetails || 'No details');
        // Order is already logged to database by orderProcessor.processOrder
        // TODO: Add to retry queue for failed orders
      } else {
        console.log(`[Webhook] ✅ Order ${orderId} successfully processed and logged to database`);
      }
    } catch (processError) {
      console.error(`[Webhook] ❌ Order processing error for order ${orderId}:`, processError.message);
      console.error(`[Webhook] Error stack:`, processError.stack);
      // Order is already logged to database by orderProcessor.processOrder (in catch block)
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
 * Processes orders when they are updated (e.g., marked as paid, fulfilled, etc.)
 */
router.post('/orders/update', async (req, res) => {
  const startTime = Date.now();
  
  // CRITICAL: Always respond 200 OK within 5 seconds (Shopify requirement)
  const respondQuickly = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed < 4500) {
      res.status(200).json({
        success: true,
        message: 'Webhook received, processing order update',
      });
      return true;
    }
    return false;
  };

  try {
    console.log('[Webhook] ========================================');
    console.log('[Webhook] 🎯 Handler called: /orders/update');
    console.log('[Webhook] Headers:', {
      'x-shopify-shop-domain': req.headers['x-shopify-shop-domain'],
      'x-shopify-topic': req.headers['x-shopify-topic'],
      'x-shopify-hmac-sha256': req.headers['x-shopify-hmac-sha256'] ? 'present' : 'missing',
    });
    console.log('[Webhook] ========================================');
    
    // Parse webhook body
    let shopifyOrder;
    try {
      shopifyOrder = parseWebhookBody(req);
      console.log('[Webhook] Parsed order update data:', shopifyOrder ? `Order ID: ${shopifyOrder.id || shopifyOrder.order_number || 'unknown'}` : 'NULL');
      
      if (!shopifyOrder) {
        console.error('[Webhook] Parsed order is null or undefined');
        return res.status(200).json({
          success: false,
          error: 'Invalid webhook payload: order is null',
        });
      }
      
      if (!shopifyOrder.id && !shopifyOrder.order_number) {
        console.error('[Webhook] Order missing ID');
        return res.status(200).json({
          success: false,
          error: 'Invalid webhook payload: missing order ID',
        });
      }
    } catch (parseError) {
      console.error('[Webhook] Failed to parse webhook body:', parseError.message);
      return res.status(200).json({
        success: false,
        error: `Failed to parse webhook body: ${parseError.message}`,
      });
    }
    
    const orderId = shopifyOrder.order_number || shopifyOrder.id;
    const orderStatus = shopifyOrder.financial_status || 'unknown';
    console.log(`[Webhook] Received webhook for order update: ${orderId} (Status: ${orderStatus})`);

    // Get shop domain from headers or order data
    let shop = req.headers['x-shopify-shop-domain'] || shopifyOrder.shop;
    if (!shop) {
      console.error('[Webhook] Shop domain not found in webhook headers');
      return res.status(200).json({
        success: false,
        error: 'Shop domain not found in webhook headers',
      });
    }

    // Normalize shop domain
    shop = normalizeShop(shop);
    console.log(`[Webhook] Processing order update for shop: ${shop}`);

    // Get shop data from Supabase
    let shopData;
    try {
      shopData = await getShop(shop);
      if (!shopData || !shopData.access_token) {
        console.error(`[Webhook] Shop ${shop} not installed or missing access token`);
        if (!respondQuickly()) {
          return res.status(200).json({
            success: false,
            error: 'Shop not installed',
          });
        }
        return;
      }
      console.log(`[Webhook] ✅ Shop ${shop} found in database`);
    } catch (dbError) {
      console.error(`[Webhook] Error fetching shop ${shop}:`, dbError.message);
      if (!respondQuickly()) {
        return res.status(200).json({
          success: false,
          error: 'Database error',
        });
      }
      return;
    }

    // Create session-like object
    const session = {
      id: `offline_${shop}`,
      shop: shop,
      accessToken: shopData.access_token,
      scope: shopData.scopes,
      scopes: shopData.scopes,
      isOnline: false,
    };

    // Check if order was already synced (has delybell tag)
    const existingTags = shopifyOrder.tags ? shopifyOrder.tags.split(', ') : [];
    const alreadySynced = existingTags.some(tag => tag.startsWith('delybell-synced') || tag.startsWith('delybell-order-id:'));
    
    if (alreadySynced) {
      console.log(`[Webhook] Order ${orderId} already synced to Delybell, skipping`);
      if (!respondQuickly()) {
        return res.status(200).json({
          success: true,
          message: 'Order already synced, update skipped',
        });
      }
      return;
    }

    // Only process orders that are paid or authorized (not pending/unpaid)
    // This ensures we sync orders when they are marked as paid
    const shouldProcess = orderStatus === 'paid' || orderStatus === 'authorized' || orderStatus === 'partially_paid';
    
    if (!shouldProcess) {
      console.log(`[Webhook] Order ${orderId} status is ${orderStatus}, skipping (will sync when marked as paid)`);
      if (!respondQuickly()) {
        return res.status(200).json({
          success: true,
          message: `Order status is ${orderStatus}, will sync when marked as paid`,
        });
      }
      return;
    }

    console.log(`[Webhook] Order ${orderId} is ${orderStatus}, processing sync to Delybell...`);

    // Process the order (same as orders/create)
    const mappingConfig = {
      service_type_id: parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      shop: shop,
      session: session,
      destination: null,
    };

    // Respond quickly to Shopify (within 5 seconds)
    if (!respondQuickly()) {
      return res.status(200).json({
        success: true,
        message: 'Webhook received, processing asynchronously',
      });
    }

    // Process order (may take longer than 5 seconds, but we've already responded)
    try {
      console.log(`[Webhook] Starting order processing for order ${orderId}...`);
      const result = await orderProcessor.processOrder(
        shopifyOrder,
        session,
        mappingConfig
      );

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Webhook] Order processing result:`, JSON.stringify(result, null, 2));
      } else {
        console.log(`[Webhook] Order processing completed:`, result.success ? 'Success' : 'Failed');
        if (!result.success) {
          console.error(`[Webhook] Order processing failed for order ${orderId}:`, result.error);
        } else {
          console.log(`[Webhook] ✅ Order ${orderId} synced to Delybell: ${result.delybellOrderId}`);
        }
      }

      if (!result.success) {
        console.error(`[Webhook] ❌ Order processing failed for order ${orderId}:`, result.error);
        console.error(`[Webhook] Error details:`, result.errorDetails || 'No details');
      }
    } catch (processError) {
      console.error(`[Webhook] ❌ Order processing error for order ${orderId}:`, processError.message);
      console.error(`[Webhook] Error stack:`, processError.stack);
    }
  } catch (error) {
    console.error('[Webhook] Order update webhook error:', error.message);
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
    
    let shop = req.headers['x-shopify-shop-domain'] || shopifyData.domain;
    
    if (!shop) {
      console.error('[Webhook] Shop domain not found in uninstall webhook');
      // Always respond 200 OK
      return res.status(200).json({
        success: false,
        error: 'Shop domain not found',
      });
    }
    
    // Normalize shop domain ONCE
    shop = normalizeShop(shop);
    console.log(`[Webhook] Processing app uninstall for shop: ${shop}`);
    
    // CRITICAL: Delete all shop data (compliance requirement)
    const { deleteShop } = require('../services/shopRepo');
    
    try {
      // Delete from Supabase (primary)
      await deleteShop(shop);
      console.log(`[Webhook] ✅ Deleted shop ${shop} from Supabase`);
      
      // Clear pickup location cache
      const pickupLocationService = require('../services/pickupLocationService');
      pickupLocationService.clearCache(shop);
      console.log(`[Webhook] Cleared pickup location cache for shop: ${shop}`);
      
      // Fallback: Delete from in-memory storage (if exists and Supabase not configured)
      if (!process.env.SUPABASE_URL) {
        const session = await shopifyClient.getSession(shop);
        if (session && session.id) {
          await sessionStorage.deleteSession(session.id);
          console.log(`[Webhook] Deleted in-memory session for shop: ${shop}`);
        }
      }
      
      // Note: Webhooks are automatically removed by Shopify when app is uninstalled
      // Order logs are kept for historical record (compliance)
      
    } catch (deleteError) {
      console.error('[Webhook] Error deleting shop data (non-critical):', deleteError.message);
      // Continue even if cleanup fails - we've already responded to Shopify
    }
    
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

