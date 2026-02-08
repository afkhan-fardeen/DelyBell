const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { shopify } = require('../shopify');
const config = require('../../config');
const orderProcessor = require('../../services/orderProcessor');
const { getShop } = require('../../services/shopRepo');
const { normalizeShop } = require('../../utils/normalizeShop');
const { supabase } = require('../../services/db');

/**
 * Verify webhook HMAC signature
 * Uses Shopify's recommended HMAC verification
 */
function verifyWebhookHMAC(req, res, next) {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    
    if (!hmac) {
      console.error('[Webhook] ❌ HMAC header missing - rejecting webhook');
      return res.status(401).send('Invalid webhook signature');
    }

    if (!config.shopify.apiSecret) {
      console.error('[Webhook] ❌ API secret not configured!');
      return res.status(500).send('Webhook verification not configured');
    }

    // Verify HMAC
    const digest = crypto
      .createHmac('sha256', config.shopify.apiSecret)
      .update(req.body)
      .digest('base64');

    if (!crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(hmac)
    )) {
      console.error('[Webhook] ❌ HMAC verification failed');
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
 * Shopify CLI Webhook Handlers
 * Uses Shopify API's built-in webhook processing with automatic HMAC verification
 * All webhooks are registered via shopify.app.toml and processed here
 */

/**
 * Orders Create Webhook Handler
 * Handles new order creation from Shopify
 */
async function handleOrdersCreate(topic, shop, body) {
  try {
    console.log('[Webhook] ========================================');
    console.log('[Webhook] 🎯 Handler called: ORDERS_CREATE');
    console.log('[Webhook] Shop:', shop);
    console.log('[Webhook] ========================================');
    
    const shopifyOrder = body;
    
    if (!shopifyOrder || (!shopifyOrder.id && !shopifyOrder.order_number)) {
      console.error('[Webhook] Invalid webhook payload: missing order ID');
      return;
    }
    
    const orderId = shopifyOrder.order_number || shopifyOrder.id;
    const orderStatus = shopifyOrder.financial_status || 'unknown';
    const orderFulfillmentStatus = shopifyOrder.fulfillment_status || 'unfulfilled';
    
    // Skip fulfilled/completed orders
    const isFulfilled = (orderFulfillmentStatus || '').toLowerCase() === 'fulfilled' || 
                        (orderFulfillmentStatus || '').toLowerCase() === 'complete';
    const isPaid = orderStatus === 'paid' || orderStatus === 'authorized' || orderStatus === 'partially_paid';
    const isCompleted = isPaid && isFulfilled;
    
    if (isCompleted) {
      console.log(`[Webhook] ⚠️ Order ${orderId} is already fulfilled/completed - skipping`);
      return;
    }
    
    console.log(`[Webhook] 📦 Received webhook for NEW order: ${orderId}`);
    
    // Normalize shop domain
    const normalizedShop = normalizeShop(shop);
    console.log(`[Webhook] Processing order for shop: ${normalizedShop}`);
    
    // Get shop data from Supabase
    let shopData;
    try {
      shopData = await getShop(normalizedShop);
      if (!shopData || !shopData.access_token) {
        console.error(`[Webhook] Shop ${normalizedShop} not installed or missing access token`);
        return;
      }
      console.log(`[Webhook] ✅ Shop ${normalizedShop} found in database`);
    } catch (dbError) {
      console.error(`[Webhook] Error fetching shop ${normalizedShop}:`, dbError.message);
      return;
    }
    
    // Save order as pending_sync
    const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
    const customerName = shippingAddress?.name || 
      (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
        ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
        : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
    const phone = shippingAddress?.phone || shopifyOrder.customer?.phone || null;
    const shopifyOrderCreatedAt = shopifyOrder.created_at || null;
    
    await orderProcessor.logOrder({
      shop: normalizedShop,
      shopifyOrderId: shopifyOrder.id?.toString() || shopifyOrder.order_number?.toString(),
      shopifyOrderNumber: shopifyOrder.order_number || null,
      delybellOrderId: null,
      status: 'pending_sync',
      errorMessage: null,
      totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
      currency: shopifyOrder.currency || 'USD',
      customerName: customerName,
      phone: phone,
      shopifyOrderCreatedAt: shopifyOrderCreatedAt,
      financialStatus: shopifyOrder.financial_status || orderStatus,
    });
    
    console.log(`[Webhook] ✅ Order ${orderId} saved with status "pending_sync"`);
  } catch (error) {
    console.error('[Webhook] Order create webhook error:', error.message);
  }
}

/**
 * Orders Update Webhook Handler
 * Handles order updates from Shopify
 */
async function handleOrdersUpdate(topic, shop, body) {
  try {
    console.log('[Webhook] ========================================');
    console.log('[Webhook] 🎯 Handler called: ORDERS_UPDATE');
    console.log('[Webhook] Shop:', shop);
    console.log('[Webhook] ========================================');
    
    const shopifyOrder = body;
    
    if (!shopifyOrder || (!shopifyOrder.id && !shopifyOrder.order_number)) {
      console.error('[Webhook] Invalid webhook payload: missing order ID');
      return;
    }
    
    const orderId = shopifyOrder.order_number || shopifyOrder.id;
    const orderStatus = shopifyOrder.financial_status || 'unknown';
    
    // Normalize shop domain
    const normalizedShop = normalizeShop(shop);
    
    // Get shop data
    let shopData;
    try {
      shopData = await getShop(normalizedShop);
      if (!shopData || !shopData.access_token) {
        console.error(`[Webhook] Shop ${normalizedShop} not installed`);
        return;
      }
    } catch (dbError) {
      console.error(`[Webhook] Error fetching shop:`, dbError.message);
      return;
    }
    
    // Check if order already synced
    const shopifyOrderId = shopifyOrder.id?.toString() || shopifyOrder.order_number?.toString();
    let dbOrder = null;
    if (shopifyOrderId) {
      const { data } = await supabase
        .from('order_logs')
        .select('status, delybell_order_id')
        .eq('shop', normalizedShop)
        .eq('shopify_order_id', shopifyOrderId)
        .limit(1)
        .single();
      dbOrder = data;
    }
    
    // Never update an order already synced
    if (dbOrder && dbOrder.status === 'processed' && dbOrder.delybell_order_id) {
      console.log(`[Webhook] ℹ️ Order ${orderId} already synced, skipping update`);
      return;
    }
    
    // Check if order is fulfilled/completed
    const fulfillmentStatus = (shopifyOrder.fulfillment_status || '').toLowerCase();
    const isFulfilled = fulfillmentStatus === 'fulfilled' || fulfillmentStatus === 'complete';
    const isPaid = (orderStatus === 'paid' || orderStatus === 'authorized' || orderStatus === 'partially_paid');
    const isCompleted = isPaid && isFulfilled;
    
    let orderStatusToSave = 'pending_sync';
    if (dbOrder && isCompleted) {
      orderStatusToSave = 'completed';
      console.log(`[Webhook] 📝 Order ${orderId} is now completed - marking as completed`);
    } else if (!dbOrder && isCompleted) {
      console.log(`[Webhook] ⚠️ Order ${orderId} is already completed - skipping`);
      return;
    } else if (!dbOrder) {
      console.log(`[Webhook] 📝 Saving new order ${orderId} with status "pending_sync"`);
    } else {
      console.log(`[Webhook] 📝 Updating order ${orderId} status`);
    }
    
    const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
    const customerName = shippingAddress?.name || 
      (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
        ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
        : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
    const phone = shippingAddress?.phone || shopifyOrder.customer?.phone || null;
    const shopifyOrderCreatedAt = shopifyOrder.created_at || null;
    
    await orderProcessor.logOrder({
      shop: normalizedShop,
      shopifyOrderId: shopifyOrderId,
      shopifyOrderNumber: shopifyOrder.order_number || null,
      delybellOrderId: dbOrder?.delybell_order_id || null,
      status: orderStatusToSave,
      errorMessage: null,
      totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
      currency: shopifyOrder.currency || 'USD',
      customerName: customerName,
      phone: phone,
      shopifyOrderCreatedAt: shopifyOrderCreatedAt,
      financialStatus: shopifyOrder.financial_status || orderStatus,
    });
    
    console.log(`[Webhook] ✅ Order update ${orderId} saved with status "${orderStatusToSave}"`);
  } catch (error) {
    console.error('[Webhook] Order update webhook error:', error.message);
  }
}

/**
 * App Uninstall Webhook Handler
 * Handles app uninstallation - cleans up sessions and data
 */
async function handleAppUninstalled(topic, shop, body) {
  try {
    console.log('[Webhook] App uninstall webhook received');
    
    const normalizedShop = normalizeShop(shop);
    console.log(`[Webhook] Processing app uninstall for shop: ${normalizedShop}`);
    
    // Delete shop data
    const { deleteShop } = require('../../services/shopRepo');
    
    try {
      await deleteShop(normalizedShop);
      console.log(`[Webhook] ✅ Deleted shop ${normalizedShop} from Supabase`);
      
      // Clear pickup location cache
      const pickupLocationService = require('../../services/pickupLocationService');
      pickupLocationService.clearCache(normalizedShop);
      console.log(`[Webhook] Cleared pickup location cache for shop: ${normalizedShop}`);
    } catch (deleteError) {
      console.error('[Webhook] Error deleting shop data (non-critical):', deleteError.message);
    }
    
    console.log(`[Webhook] App uninstall processed for shop: ${normalizedShop}`);
  } catch (error) {
    console.error('[Webhook] App uninstall webhook error:', error.message);
  }
}

/**
 * Webhook endpoint router
 * Uses express.raw() for body parsing and manual HMAC verification
 */
router.post('/orders/create', express.raw({ type: 'application/json' }), verifyWebhookHMAC, async (req, res) => {
  try {
    const topic = req.headers['x-shopify-topic'];
    const shop = req.headers['x-shopify-shop-domain'];
    const body = JSON.parse(req.body.toString());
    
    // Process webhook asynchronously
    handleOrdersCreate(topic, shop, body).catch(err => {
      console.error('[Webhook] Error in orders/create handler:', err);
    });
    
    // Respond immediately to Shopify
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Webhook] Orders create error:', error);
    res.status(200).json({ success: false, error: error.message });
  }
});

router.post('/orders/update', express.raw({ type: 'application/json' }), verifyWebhookHMAC, async (req, res) => {
  try {
    const topic = req.headers['x-shopify-topic'];
    const shop = req.headers['x-shopify-shop-domain'];
    const body = JSON.parse(req.body.toString());
    
    // Process webhook asynchronously
    handleOrdersUpdate(topic, shop, body).catch(err => {
      console.error('[Webhook] Error in orders/update handler:', err);
    });
    
    // Respond immediately to Shopify
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Webhook] Orders update error:', error);
    res.status(200).json({ success: false, error: error.message });
  }
});

router.post('/app/uninstalled', express.raw({ type: 'application/json' }), verifyWebhookHMAC, async (req, res) => {
  try {
    const topic = req.headers['x-shopify-topic'];
    const shop = req.headers['x-shopify-shop-domain'];
    const body = JSON.parse(req.body.toString());
    
    // Process webhook asynchronously
    handleAppUninstalled(topic, shop, body).catch(err => {
      console.error('[Webhook] Error in app/uninstalled handler:', err);
    });
    
    // Respond immediately to Shopify
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Webhook] App uninstalled error:', error);
    res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * GDPR Compliance Webhooks
 * CRITICAL: Must return 200 OK with plain text "OK" (NOT JSON)
 * These webhooks MUST verify HMAC before responding
 */
router.post('/customers/data_request', express.raw({ type: '*/*' }), verifyWebhookHMAC, (req, res) => {
  // Absolute no-op - just respond OK
  res.status(200).send('OK');
});

router.post('/customers/redact', express.raw({ type: '*/*' }), verifyWebhookHMAC, (req, res) => {
  // Absolute no-op - just respond OK
  res.status(200).send('OK');
});

router.post('/shop/redact', express.raw({ type: '*/*' }), verifyWebhookHMAC, (req, res) => {
  // Absolute no-op - just respond OK
  res.status(200).send('OK');
});

module.exports = router;
