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

    // Check shop sync mode
    const syncMode = shopData.sync_mode || 'manual'; // Default to 'manual' (changed from 'auto')
    const autoSyncEnabledAt = shopData.auto_sync_enabled_at;
    console.log(`[Webhook] Shop sync mode: ${syncMode}`);
    if (syncMode === 'auto' && autoSyncEnabledAt) {
      console.log(`[Webhook] Auto sync enabled at: ${autoSyncEnabledAt}`);
    }

    // CRITICAL RULE: Check if order was created before auto sync was enabled
    // Never auto-sync orders created before auto mode was enabled
    const orderCreatedAt = shopifyOrder.created_at ? new Date(shopifyOrder.created_at) : new Date();
    let shouldAutoSync = false;
    
    if (syncMode === 'auto') {
      if (autoSyncEnabledAt) {
        const autoSyncEnabledDate = new Date(autoSyncEnabledAt);
        shouldAutoSync = orderCreatedAt >= autoSyncEnabledDate;
        if (!shouldAutoSync) {
          console.log(`[Webhook] ⚠️ Order ${orderId} created at ${orderCreatedAt.toISOString()} is BEFORE auto sync was enabled at ${autoSyncEnabledDate.toISOString()}`);
          console.log(`[Webhook] ⚠️ This order will NOT be auto-synced (saved as pending_sync instead)`);
        } else {
          console.log(`[Webhook] ✅ Order ${orderId} created at ${orderCreatedAt.toISOString()} is AFTER auto sync was enabled - will auto-sync`);
        }
      } else {
        // No auto_sync_enabled_at set - this shouldn't happen, but treat as manual for safety
        console.log(`[Webhook] ⚠️ Auto mode enabled but auto_sync_enabled_at not set - treating as manual for safety`);
        shouldAutoSync = false;
      }
    }

    // Respond quickly to Shopify (within 5 seconds)
    if (!respondQuickly()) {
      // If we're already past 4.5 seconds, just respond and process async
      return res.status(200).json({
        success: true,
        message: 'Webhook received, processing asynchronously',
      });
    }

    // Process order based on sync mode
    try {
      if (syncMode === 'manual' || !shouldAutoSync) {
        // Manual mode OR order created before auto sync was enabled: Save order with status "pending_sync"
        const reason = syncMode === 'manual' ? 'manual sync mode' : 'order created before auto sync was enabled';
        console.log(`[Webhook] 📝 ${reason.charAt(0).toUpperCase() + reason.slice(1)} - saving order ${orderId} with status "pending_sync"`);
        
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

        console.log(`[Webhook] ✅ Order ${orderId} saved with status "pending_sync" (manual mode)`);
        return; // Don't process, just save
      }

      // Auto mode: Process order immediately (current behavior)
      console.log(`[Webhook] 🚀 Auto sync mode - processing order ${orderId} immediately (Status: ${orderStatus})...`);

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
          // 5️⃣ Only log ERROR when Delybell order was not created AND no orderId is available
          if (result.isDuplicate) {
            // Duplicate webhook is normal - log as INFO
            console.log(`[Webhook] ℹ️ Duplicate webhook for order ${orderId} - already synced, skipping`);
          } else if (!result.delybellOrderId) {
            // Actual failure - no orderId means order was not created
            console.error(`[Webhook] ❌ Order processing failed for order ${orderId}:`, result.error);
          } else {
            // Has orderId but marked as failed - this shouldn't happen, but log as warning
            console.warn(`[Webhook] ⚠️ Order ${orderId} has orderId ${result.delybellOrderId} but marked as failed:`, result.error);
          }
        } else {
          console.log(`[Webhook] ✅ Order ${orderId} synced to Delybell: ${result.delybellOrderId}`);
        }
      }

      // Log result but don't send response (already sent)
      if (!result.success) {
        // 5️⃣ Only log ERROR when Delybell order was not created AND no orderId is available
        if (result.isDuplicate) {
          // Duplicate webhook is normal - log as INFO
          console.log(`[Webhook] ℹ️ Duplicate webhook for order ${orderId} - already synced, skipping`);
        } else if (!result.delybellOrderId) {
          // Actual failure - no orderId means order was not created
          console.error(`[Webhook] ❌ Order processing failed for order ${orderId}:`, result.error);
          console.error(`[Webhook] Error details:`, result.errorDetails || 'No details');
        } else {
          // Has orderId but marked as failed - this shouldn't happen, but log as warning
          console.warn(`[Webhook] ⚠️ Order ${orderId} has orderId ${result.delybellOrderId} but marked as failed:`, result.error);
        }
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

    // Check shop sync mode (same logic as orders/create)
    const syncMode = shopData.sync_mode || 'manual';
    const autoSyncEnabledAt = shopData.auto_sync_enabled_at;
    console.log(`[Webhook] Shop sync mode: ${syncMode}`);
    
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
    
    // CRITICAL RULE: Never sync an order already marked as synced
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
    
    // CRITICAL RULE: Check if order was created before auto sync was enabled
    const orderCreatedAt = shopifyOrder.created_at ? new Date(shopifyOrder.created_at) : new Date();
    let shouldAutoSync = false;
    
    if (syncMode === 'auto') {
      if (autoSyncEnabledAt) {
        const autoSyncEnabledDate = new Date(autoSyncEnabledAt);
        shouldAutoSync = orderCreatedAt >= autoSyncEnabledDate;
        if (!shouldAutoSync) {
          console.log(`[Webhook] ⚠️ Order ${orderId} created before auto sync was enabled - will not auto-sync`);
        }
      } else {
        console.log(`[Webhook] ⚠️ Auto mode enabled but auto_sync_enabled_at not set - treating as manual for safety`);
        shouldAutoSync = false;
      }
    }

    // Only process orders that are paid or authorized (not pending/unpaid)
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

    // Process order based on sync mode
    try {
      if (syncMode === 'manual' || !shouldAutoSync) {
        // Manual mode OR order created before auto sync: Save as pending_sync
        const reason = syncMode === 'manual' ? 'manual sync mode' : 'order created before auto sync was enabled';
        console.log(`[Webhook] 📝 ${reason.charAt(0).toUpperCase() + reason.slice(1)} - saving order update ${orderId} with status "pending_sync"`);
        
        const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
        const customerName = shippingAddress?.name || 
          (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
            ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
            : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
        const phone = shippingAddress?.phone || shopifyOrder.customer?.phone || null;
        const shopifyOrderCreatedAt = shopifyOrder.created_at || null;

        await orderProcessor.logOrder({
          shop,
          shopifyOrderId: shopifyOrderId,
          shopifyOrderNumber: shopifyOrder.order_number || null,
          delybellOrderId: null,
          status: 'pending_sync',
          errorMessage: null,
          totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
          currency: shopifyOrder.currency || 'USD',
          customerName: customerName,
          phone: phone,
          shopifyOrderCreatedAt: shopifyOrderCreatedAt,
          financialStatus: shopifyOrder.financial_status || orderStatus, // Store payment status
        });

        console.log(`[Webhook] ✅ Order update ${orderId} saved with status "pending_sync"`);
        return;
      }

      // Auto mode AND order eligible: Process order immediately
      console.log(`[Webhook] 🚀 Auto sync mode - processing order update ${orderId} immediately...`);
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
          // 5️⃣ Only log ERROR when Delybell order was not created AND no orderId is available
          if (result.isDuplicate) {
            // Duplicate webhook is normal - log as INFO
            console.log(`[Webhook] ℹ️ Duplicate webhook for order ${orderId} - already synced, skipping`);
          } else if (!result.delybellOrderId) {
            // Actual failure - no orderId means order was not created
            console.error(`[Webhook] ❌ Order processing failed for order ${orderId}:`, result.error);
          } else {
            // Has orderId but marked as failed - this shouldn't happen, but log as warning
            console.warn(`[Webhook] ⚠️ Order ${orderId} has orderId ${result.delybellOrderId} but marked as failed:`, result.error);
          }
        } else {
          console.log(`[Webhook] ✅ Order ${orderId} synced to Delybell: ${result.delybellOrderId}`);
        }
      }

      if (!result.success) {
        // 5️⃣ Only log ERROR when Delybell order was not created AND no orderId is available
        if (result.isDuplicate) {
          // Duplicate webhook is normal - log as INFO
          console.log(`[Webhook] ℹ️ Duplicate webhook for order ${orderId} - already synced, skipping`);
        } else if (!result.delybellOrderId) {
          // Actual failure - no orderId means order was not created
          console.error(`[Webhook] ❌ Order processing failed for order ${orderId}:`, result.error);
          console.error(`[Webhook] Error details:`, result.errorDetails || 'No details');
        } else {
          // Has orderId but marked as failed - this shouldn't happen, but log as warning
          console.warn(`[Webhook] ⚠️ Order ${orderId} has orderId ${result.delybellOrderId} but marked as failed:`, result.error);
        }
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

