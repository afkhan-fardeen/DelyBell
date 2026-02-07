const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const orderProcessor = require('../services/orderProcessor');
const shopifyClient = require('../services/shopifyClient');
const { getShop } = require('../services/shopRepo');
const { normalizeShop } = require('../utils/normalizeShop');
const { supabase } = require('../services/db');
const config = require('../config');

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
 * Verify webhook HMAC signature
 * This must be done BEFORE parsing JSON to ensure the raw body is used
 */
/**
 * Verify webhook HMAC signature
 * CRITICAL: Shopify App Store requires STRICT HMAC verification
 * NO BYPASSES - even in development, we verify HMAC (use test webhooks)
 */
function verifyWebhookHMAC(req, res, next) {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    
    // STRICT: Always require HMAC (Shopify App Store requirement)
    if (!hmac) {
      console.error('[Webhook] ❌ HMAC header missing - rejecting webhook');
      return res.status(401).send('Invalid webhook signature');
    }

    // STRICT: Always require API secret configured
    if (!config.shopify.apiSecret) {
      console.error('[Webhook] ❌ API secret not configured!');
      return res.status(500).send('Webhook verification not configured');
    }

    // CRITICAL: req.body is a Buffer from express.raw()
    // Use it directly - do NOT stringify or modify it
    const digest = crypto
      .createHmac('sha256', config.shopify.apiSecret)
      .update(req.body) // Raw Buffer ONLY
      .digest('base64');

    // Use timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(hmac)
    )) {
      console.error('[Webhook] ❌ HMAC verification failed');
      console.error('[Webhook] Expected (first 20):', digest.substring(0, 20) + '...');
      console.error('[Webhook] Received (first 20):', hmac.substring(0, 20) + '...');
      
      // STRICT: Always reject invalid HMAC (Shopify App Store requirement)
      return res.status(401).send('Invalid webhook signature');
    }

    console.log('[Webhook] ✅ HMAC verified successfully');
    next();
  } catch (error) {
    console.error('[Webhook] Verification error:', error.message);
    return res.status(500).send('Webhook verification failed');
  }
}

/**
 * Webhook endpoint for new order creation
 * This endpoint receives webhooks from Shopify when orders are created
 * Raw body parsing and HMAC verification are handled inline
 */
router.post('/orders/create', express.raw({ type: 'application/json' }), verifyWebhookHMAC, async (req, res) => {
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
    
    // Skip fulfilled/completed orders - they shouldn't be synced
    const isFulfilled = (orderFulfillmentStatus || '').toLowerCase() === 'fulfilled' || 
                        (orderFulfillmentStatus || '').toLowerCase() === 'complete';
    const isPaid = orderStatus === 'paid' || orderStatus === 'authorized' || orderStatus === 'partially_paid';
    const isCompleted = isPaid && isFulfilled;
    
    if (isCompleted) {
      console.log(`[Webhook] ⚠️ Order ${orderId} is already fulfilled/completed - skipping (won't sync completed orders)`);
      return res.status(200).json({
        success: true,
        message: 'Order is fulfilled/completed, skipped',
      });
    }
    
    console.log(`[Webhook] 📦 Received webhook for NEW order: ${orderId}`);
    console.log(`[Webhook] Order status - Financial: ${orderStatus}, Fulfillment: ${orderFulfillmentStatus}`);
    console.log(`[Webhook] Order will be saved as pending_sync for manual review`);

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

    // SIMPLIFIED: Always save orders as pending_sync - user will sync manually
    try {
      console.log(`[Webhook] 📝 Saving order ${orderId} with status "pending_sync" (manual sync only)`);
      
      const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
      const customerName = shippingAddress?.name || 
        (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
          ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
          : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
      const phone = shippingAddress?.phone || shopifyOrder.customer?.phone || null;
      const shopifyOrderCreatedAt = shopifyOrder.created_at || null;

      await orderProcessor.logOrder({
        shop,
        shopifyOrderId: shopifyOrder.id?.toString() || shopifyOrder.order_number?.toString(),
        shopifyOrderNumber: shopifyOrder.order_number || null,
        delybellOrderId: null, // Not synced yet
        status: 'pending_sync',
        errorMessage: null,
        totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
        currency: shopifyOrder.currency || 'USD',
        customerName: customerName,
        phone: phone,
        shopifyOrderCreatedAt: shopifyOrderCreatedAt,
        financialStatus: shopifyOrder.financial_status || orderStatus, // Store payment status
      });

      console.log(`[Webhook] ✅ Order ${orderId} saved with status "pending_sync"`);
      console.log(`[Webhook] Order details: shop=${shop}, orderNumber=${shopifyOrder.order_number}, shopifyOrderId=${shopifyOrder.id}`);
      
      // Response already sent by respondQuickly() above, so we're done
      return;
    } catch (processError) {
      console.error(`[Webhook] ❌ Order processing error for order ${orderId}:`, processError.message);
      console.error(`[Webhook] Error stack:`, processError.stack);
      
      // CRITICAL: Ensure order is saved even if processing fails
      // This ensures orders always appear in the UI, even if sync fails
      try {
        const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
        const customerName = shippingAddress?.name || 
          (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
            ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
            : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
        const phone = shippingAddress?.phone || shopifyOrder.customer?.phone || null;
        const shopifyOrderCreatedAt = shopifyOrder.created_at || null;
        
        await orderProcessor.logOrder({
          shop,
          shopifyOrderId: shopifyOrder.id?.toString() || shopifyOrder.order_number?.toString(),
          shopifyOrderNumber: shopifyOrder.order_number || null,
          delybellOrderId: null,
          status: 'failed',
          errorMessage: `Processing error: ${processError.message}`,
          totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
          currency: shopifyOrder.currency || 'USD',
          customerName: customerName,
          phone: phone,
          shopifyOrderCreatedAt: shopifyOrderCreatedAt,
          financialStatus: shopifyOrder.financial_status || orderStatus,
        });
        console.log(`[Webhook] ✅ Order ${orderId} saved with failed status after processing error`);
      } catch (logError) {
        console.error(`[Webhook] ❌ Failed to save order ${orderId} after processing error:`, logError.message);
      }
      
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
 * Raw body parsing and HMAC verification are handled inline
 */
router.post('/orders/update', express.raw({ type: 'application/json' }), verifyWebhookHMAC, async (req, res) => {
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

    // Check if order was already synced (has delybell tag or exists in DB)
    const existingTags = shopifyOrder.tags ? shopifyOrder.tags.split(', ') : [];
    const alreadySynced = existingTags.some(tag => tag.startsWith('delybell-synced') || tag.startsWith('delybell-order-id:'));
    
    // Also check database for existing order
    const shopifyOrderId = shopifyOrder.id?.toString() || shopifyOrder.order_number?.toString();
    let dbOrder = null;
    if (shopifyOrderId) {
      const { data } = await supabase
        .from('order_logs')
        .select('status, delybell_order_id')
        .eq('shop', shop)
        .eq('shopify_order_id', shopifyOrderId)
        .limit(1)
        .single();
      dbOrder = data;
    }
    
    // CRITICAL RULE: Never update an order already synced
    if (alreadySynced || (dbOrder && dbOrder.status === 'processed' && dbOrder.delybell_order_id)) {
      console.log(`[Webhook] ℹ️ Order ${orderId} already synced to Delybell, skipping update`);
      if (!respondQuickly()) {
        return res.status(200).json({
          success: true,
          message: 'Order already synced, update skipped',
        });
      }
      return;
    }

    // Check if order is fulfilled/completed - mark as completed if it exists in DB
    const fulfillmentStatus = (shopifyOrder.fulfillment_status || '').toLowerCase();
    const isFulfilled = fulfillmentStatus === 'fulfilled' || fulfillmentStatus === 'complete';
    const isPaid = (orderStatus === 'paid' || orderStatus === 'authorized' || orderStatus === 'partially_paid');
    const isCompleted = isPaid && isFulfilled;

    // Respond quickly to Shopify (within 5 seconds)
    if (!respondQuickly()) {
      return res.status(200).json({
        success: true,
        message: 'Webhook received, processing asynchronously',
      });
    }

    // If order exists in DB and is now completed, mark it as completed
    // Otherwise, save as pending_sync
    try {
      const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
      const customerName = shippingAddress?.name || 
        (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
          ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
          : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
      const phone = shippingAddress?.phone || shopifyOrder.customer?.phone || null;
      const shopifyOrderCreatedAt = shopifyOrder.created_at || null;

      // If order exists in DB and is now completed, mark as completed
      // Otherwise, save as pending_sync (for new orders or non-completed updates)
      let orderStatusToSave = 'pending_sync';
      if (dbOrder && isCompleted) {
        orderStatusToSave = 'completed';
        console.log(`[Webhook] 📝 Order ${orderId} is now completed - marking as completed`);
      } else if (!dbOrder) {
        // New order - save as pending_sync (unless it's already completed, then skip)
        if (isCompleted) {
          console.log(`[Webhook] ⚠️ Order ${orderId} is already completed - skipping (won't sync completed orders)`);
          return;
        }
        console.log(`[Webhook] 📝 Saving new order ${orderId} with status "pending_sync"`);
      } else {
        console.log(`[Webhook] 📝 Updating order ${orderId} status`);
      }

      await orderProcessor.logOrder({
        shop,
        shopifyOrderId: shopifyOrderId,
        shopifyOrderNumber: shopifyOrder.order_number || null,
        delybellOrderId: dbOrder?.delybell_order_id || null, // Preserve existing delybell_order_id if exists
        status: orderStatusToSave,
        errorMessage: null,
        totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
        currency: shopifyOrder.currency || 'USD',
        customerName: customerName,
        phone: phone,
        shopifyOrderCreatedAt: shopifyOrderCreatedAt,
        financialStatus: shopifyOrder.financial_status || orderStatus, // Store payment status
      });

      console.log(`[Webhook] ✅ Order update ${orderId} saved with status "${orderStatusToSave}"`);
      return;
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
 * Raw body parsing and HMAC verification are handled inline
 */
router.post('/app/uninstalled', express.raw({ type: 'application/json' }), verifyWebhookHMAC, async (req, res) => {
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

/**
 * GDPR Compliance Webhook: Customer Data Request
 * Required for public apps - customer requests their data
 * @see https://shopify.dev/apps/store/data-protection/gdpr-requirements
 * Raw body parsing and HMAC verification are handled inline
 */
router.post('/customers/data_request', express.raw({ type: 'application/json' }), verifyWebhookHMAC, (req, res) => {
  // HMAC already verified by middleware - just respond
  // Shopify allows slow responses, but NOT unverifiable ones
  res.status(200).send('OK');
});

/**
 * GDPR Compliance Webhook: Customer Redaction
 * Required for public apps - customer requests data deletion
 * @see https://shopify.dev/apps/store/data-protection/gdpr-requirements
 * 
 * CRITICAL Shopify requirements:
 * - Route exists and is reachable
 * - HMAC verified BEFORE response
 * - Returns 200 OK with plain text "OK" (NOT JSON)
 * - Actually deletes customer-related data if stored
 * - NO respondQuickly() pattern - respond after verification
 */
router.post('/customers/redact', express.raw({ type: 'application/json' }), verifyWebhookHMAC, async (req, res) => {
  // HMAC already verified by middleware - now process redaction
  try {
    const shop = req.headers['x-shopify-shop-domain'];
    
    // Parse webhook body to get order IDs to redact
    try {
      const data = parseWebhookBody(req);
      const orderIds = data.orders_to_redact || [];
      
      // Anonymize customer data in order_logs (GDPR compliance)
      if (orderIds.length > 0 && shop) {
        const normalizedShop = normalizeShop(shop);
        for (const orderId of orderIds) {
          try {
            await supabase
              .from('order_logs')
              .update({
                customer_name: '[REDACTED]',
                phone: '[REDACTED]',
              })
              .eq('shop', normalizedShop)
              .eq('shopify_order_id', orderId.toString());
          } catch (redactError) {
            // Log but don't fail - we must respond 200 OK
            console.error(`[Webhook] Error redacting order ${orderId}:`, redactError.message);
          }
        }
      }
    } catch (parseError) {
      // Log but don't fail - we must respond 200 OK
      console.warn('[Webhook] Could not parse customer redaction body:', parseError.message);
    }
    
    // CRITICAL: Shopify requires plain text "OK", not JSON
    res.status(200).send('OK');
  } catch (error) {
    // Always respond 200 OK - never block Shopify
    console.error('[Webhook] Customer redaction error:', error.message);
    res.status(200).send('OK');
  }
});

/**
 * GDPR Compliance Webhook: Shop Redaction
 * Required for public apps - shop requests data deletion after uninstall
 * @see https://shopify.dev/apps/store/data-protection/gdpr-requirements
 * 
 * CRITICAL Shopify requirements:
 * - Route exists and is reachable
 * - HMAC verified BEFORE response
 * - Returns 200 OK with plain text "OK" (NOT JSON)
 * - Actually deletes shop + order_logs data
 * - NO respondQuickly() pattern - respond after verification
 * 
 * Note: This is typically called 48 hours after app uninstall
 */
router.post('/shop/redact', express.raw({ type: 'application/json' }), verifyWebhookHMAC, async (req, res) => {
  // HMAC already verified by middleware - now process deletion
  try {
    const shop = req.headers['x-shopify-shop-domain'];
    
    if (shop) {
      const normalizedShop = normalizeShop(shop);
      const { deleteShop } = require('../services/shopRepo');
      
      try {
        // Delete shop from database
        await deleteShop(normalizedShop);
        
        // Delete all order logs for this shop (GDPR requirement)
        await supabase
          .from('order_logs')
          .delete()
          .eq('shop', normalizedShop);
        
        // Delete problem reports for this shop
        await supabase
          .from('problem_reports')
          .delete()
          .eq('shop', normalizedShop);
      } catch (deleteError) {
        // Log but don't fail - we must respond 200 OK
        console.error('[Webhook] Error during shop redaction:', deleteError.message);
      }
    }
    
    // CRITICAL: Shopify requires plain text "OK", not JSON
    res.status(200).send('OK');
  } catch (error) {
    // Always respond 200 OK - never block Shopify
    console.error('[Webhook] Shop redaction error:', error.message);
    res.status(200).send('OK');
  }
});

module.exports = router;

