const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const config = require('../../config');
const orderProcessor = require('../../services/orderProcessor');
const { getShop, deleteShop } = require('../../services/shopRepo');
const { normalizeShop } = require('../../utils/normalizeShop');
const { supabase } = require('../../services/db');

// ========================================
// CRITICAL: Raw Body Parser for ALL Webhooks
// ========================================
// Apply express.raw() to ALL webhook routes FIRST
// This ensures req.body is a Buffer for HMAC verification
router.use(express.raw({ type: '*/*' }));

// ========================================
// HMAC Verification Middleware
// ========================================
function verifyWebhookHMAC(req, res, next) {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    
    if (!hmac) {
      console.error('[Webhook] ❌ HMAC header missing');
      return res.status(401).send('Unauthorized');
    }

    if (!config.shopify.apiSecret) {
      console.error('[Webhook] ❌ SHOPIFY_API_SECRET not configured!');
      return res.status(500).send('Server configuration error');
    }

    // req.body is a Buffer from express.raw()
    const rawBody = req.body;
    
    if (!Buffer.isBuffer(rawBody)) {
      console.error('[Webhook] ❌ Body is not a Buffer - body parser misconfigured');
      return res.status(500).send('Server configuration error');
    }

    // Calculate HMAC using raw Buffer converted to UTF-8 string
    const digest = crypto
      .createHmac('sha256', config.shopify.apiSecret)
      .update(rawBody, 'utf8')  // ✅ CRITICAL: Specify 'utf8' encoding
      .digest('base64');

    // Constant-time comparison to prevent timing attacks
    const verified = crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(hmac)
    );

    if (!verified) {
      console.error('[Webhook] ❌ HMAC verification failed');
      console.error('[Webhook] Expected:', digest);
      console.error('[Webhook] Received:', hmac);
      return res.status(401).send('Unauthorized');
    }

    console.log('[Webhook] ✅ HMAC verified successfully');
    
    // Parse JSON body for handlers (after verification)
    try {
      req.parsedBody = JSON.parse(rawBody.toString('utf8'));
    } catch (parseError) {
      console.error('[Webhook] ❌ Failed to parse JSON body:', parseError.message);
      return res.status(400).send('Invalid JSON');
    }
    
    next();
  } catch (error) {
    console.error('[Webhook] ❌ Verification error:', error.message);
    return res.status(500).send('Verification failed');
  }
}

// ========================================
// ORDER WEBHOOKS
// ========================================

/**
 * Orders Create Webhook Handler
 */
async function handleOrdersCreate(topic, shop, body) {
  try {
    console.log('[Webhook] ========================================');
    console.log('[Webhook] 🎯 ORDERS_CREATE');
    console.log('[Webhook] Shop:', shop);
    console.log('[Webhook] ========================================');
    
    const shopifyOrder = body;
    
    if (!shopifyOrder || (!shopifyOrder.id && !shopifyOrder.order_number)) {
      console.error('[Webhook] Invalid payload: missing order ID');
      return;
    }
    
    const orderId = shopifyOrder.order_number || shopifyOrder.id;
    const fulfillmentStatus = (shopifyOrder.fulfillment_status || '').toLowerCase();
    const financialStatus = shopifyOrder.financial_status || 'unknown';
    
    // Skip already fulfilled/completed orders
    const isFulfilled = fulfillmentStatus === 'fulfilled' || fulfillmentStatus === 'complete';
    const isPaid = financialStatus === 'paid' || financialStatus === 'authorized' || financialStatus === 'partially_paid';
    
    if (isPaid && isFulfilled) {
      console.log(`[Webhook] ⚠️ Order ${orderId} already fulfilled - skipping`);
      return;
    }
    
    console.log(`[Webhook] 📦 New order: ${orderId}`);
    
    // Normalize shop domain
    const normalizedShop = normalizeShop(shop);
    
    // Verify shop is installed
    let shopData;
    try {
      shopData = await getShop(normalizedShop);
      if (!shopData || !shopData.access_token) {
        console.error(`[Webhook] ❌ Shop ${normalizedShop} not installed`);
        return;
      }
      console.log(`[Webhook] ✅ Shop found: ${normalizedShop}`);
    } catch (dbError) {
      console.error(`[Webhook] ❌ Database error:`, dbError.message);
      return;
    }
    
    // Extract customer info
    const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
    const customerName = shippingAddress?.name || 
      (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
        ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
        : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
    const phone = shippingAddress?.phone || shopifyOrder.customer?.phone || null;
    
    // Save as pending_sync
    await orderProcessor.logOrder({
      shop: normalizedShop,
      shopifyOrderId: shopifyOrder.id?.toString() || shopifyOrder.order_number?.toString(),
      shopifyOrderNumber: shopifyOrder.order_number || null,
      delybellOrderId: null,
      status: 'pending_sync',
      totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
      currency: shopifyOrder.currency || 'USD',
      customerName: customerName,
      phone: phone,
      shopifyOrderCreatedAt: shopifyOrder.created_at || null,
      financialStatus: financialStatus,
    });
    
    console.log(`[Webhook] ✅ Order ${orderId} saved as pending_sync`);
  } catch (error) {
    console.error('[Webhook] ❌ Error in orders/create:', error.message);
  }
}

/**
 * Orders Update Webhook Handler
 */
async function handleOrdersUpdate(topic, shop, body) {
  try {
    console.log('[Webhook] ========================================');
    console.log('[Webhook] 🎯 ORDERS_UPDATE');
    console.log('[Webhook] Shop:', shop);
    console.log('[Webhook] ========================================');
    
    const shopifyOrder = body;
    
    if (!shopifyOrder || (!shopifyOrder.id && !shopifyOrder.order_number)) {
      console.error('[Webhook] Invalid payload: missing order ID');
      return;
    }
    
    const orderId = shopifyOrder.order_number || shopifyOrder.id;
    const normalizedShop = normalizeShop(shop);
    
    // Verify shop is installed
    let shopData;
    try {
      shopData = await getShop(normalizedShop);
      if (!shopData || !shopData.access_token) {
        console.error(`[Webhook] ❌ Shop ${normalizedShop} not installed`);
        return;
      }
    } catch (dbError) {
      console.error(`[Webhook] ❌ Database error:`, dbError.message);
      return;
    }
    
    // Check existing order
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
    
    // Never update already synced orders
    if (dbOrder && dbOrder.status === 'processed' && dbOrder.delybell_order_id) {
      console.log(`[Webhook] ℹ️ Order ${orderId} already synced - skipping`);
      return;
    }
    
    // Check if fulfilled/completed
    const fulfillmentStatus = (shopifyOrder.fulfillment_status || '').toLowerCase();
    const financialStatus = shopifyOrder.financial_status || 'unknown';
    const isFulfilled = fulfillmentStatus === 'fulfilled' || fulfillmentStatus === 'complete';
    const isPaid = financialStatus === 'paid' || financialStatus === 'authorized' || financialStatus === 'partially_paid';
    const isCompleted = isPaid && isFulfilled;
    
    let orderStatus = 'pending_sync';
    if (dbOrder && isCompleted) {
      orderStatus = 'completed';
      console.log(`[Webhook] 📝 Order ${orderId} now completed`);
    } else if (!dbOrder && isCompleted) {
      console.log(`[Webhook] ⚠️ Order ${orderId} already completed - skipping`);
      return;
    }
    
    // Extract customer info
    const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
    const customerName = shippingAddress?.name || 
      (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
        ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
        : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
    const phone = shippingAddress?.phone || shopifyOrder.customer?.phone || null;
    
    // Update order
    await orderProcessor.logOrder({
      shop: normalizedShop,
      shopifyOrderId: shopifyOrderId,
      shopifyOrderNumber: shopifyOrder.order_number || null,
      delybellOrderId: dbOrder?.delybell_order_id || null,
      status: orderStatus,
      totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
      currency: shopifyOrder.currency || 'USD',
      customerName: customerName,
      phone: phone,
      shopifyOrderCreatedAt: shopifyOrder.created_at || null,
      financialStatus: financialStatus,
    });
    
    console.log(`[Webhook] ✅ Order ${orderId} updated to ${orderStatus}`);
  } catch (error) {
    console.error('[Webhook] ❌ Error in orders/update:', error.message);
  }
}

/**
 * App Uninstall Webhook Handler
 */
async function handleAppUninstalled(topic, shop, body) {
  try {
    console.log('[Webhook] ========================================');
    console.log('[Webhook] 🎯 APP_UNINSTALLED');
    console.log('[Webhook] Shop:', shop);
    console.log('[Webhook] ========================================');
    
    const normalizedShop = normalizeShop(shop);
    
    // Delete shop data
    try {
      await deleteShop(normalizedShop);
      console.log(`[Webhook] ✅ Deleted shop: ${normalizedShop}`);
      
      // Clear pickup location cache
      const pickupLocationService = require('../../services/pickupLocationService');
      pickupLocationService.clearCache(normalizedShop);
      console.log(`[Webhook] ✅ Cleared cache for: ${normalizedShop}`);
    } catch (deleteError) {
      console.error('[Webhook] ⚠️ Error deleting shop data:', deleteError.message);
    }
  } catch (error) {
    console.error('[Webhook] ❌ Error in app/uninstalled:', error.message);
  }
}

// ========================================
// GDPR COMPLIANCE HANDLERS
// ========================================

async function handleCustomerDataRequest(shop, body) {
  console.log('[Webhook] 📋 GDPR: Customer data request for shop:', shop);
  // TODO: Implement customer data export
  // Should compile all customer data and make it available
}

async function handleCustomerRedact(shop, body) {
  const customerId = body.customer?.id;
  console.log('[Webhook] 🗑️ GDPR: Customer redaction for shop:', shop, 'customer:', customerId);
  
  // TODO: Implement customer PII deletion
  // Example: Update order_logs to remove customer_name, phone
  // await supabase
  //   .from('order_logs')
  //   .update({ customer_name: 'REDACTED', phone: 'REDACTED' })
  //   .eq('shop', shop)
  //   .eq('customer_id', customerId);
}

async function handleShopRedact(shop, body) {
  console.log('[Webhook] 🗑️ GDPR: Shop redaction for:', shop);
  
  const normalizedShop = normalizeShop(shop);
  
  // Delete ALL shop data (called 48 hours after uninstall)
  try {
    await deleteShop(normalizedShop);
    console.log(`[Webhook] ✅ Deleted all data for shop: ${normalizedShop}`);
  } catch (error) {
    console.error('[Webhook] ❌ Error deleting shop data:', error.message);
  }
}

// ========================================
// WEBHOOK ROUTES
// ========================================

// Order webhooks
router.post('/orders/create', verifyWebhookHMAC, async (req, res) => {
  // ✅ CRITICAL: Respond immediately (within 5 seconds)
  res.status(200).send('OK');
  
  // Process async
  const shop = req.headers['x-shopify-shop-domain'];
  const topic = req.headers['x-shopify-topic'];
  const body = req.parsedBody; // Parsed in verifyWebhookHMAC
  
  handleOrdersCreate(topic, shop, body).catch(err => {
    console.error('[Webhook] Error in handleOrdersCreate:', err);
  });
});

router.post('/orders/update', verifyWebhookHMAC, async (req, res) => {
  res.status(200).send('OK');
  
  const shop = req.headers['x-shopify-shop-domain'];
  const topic = req.headers['x-shopify-topic'];
  const body = req.parsedBody;
  
  handleOrdersUpdate(topic, shop, body).catch(err => {
    console.error('[Webhook] Error in handleOrdersUpdate:', err);
  });
});

// App lifecycle webhooks
router.post('/app/uninstalled', verifyWebhookHMAC, async (req, res) => {
  res.status(200).send('OK');
  
  const shop = req.headers['x-shopify-shop-domain'];
  const topic = req.headers['x-shopify-topic'];
  const body = req.parsedBody;
  
  handleAppUninstalled(topic, shop, body).catch(err => {
    console.error('[Webhook] Error in handleAppUninstalled:', err);
  });
});

// GDPR compliance webhooks (REQUIRED for app approval)
router.post('/customers/data_request', verifyWebhookHMAC, async (req, res) => {
  res.status(200).send('OK');
  
  const shop = req.headers['x-shopify-shop-domain'];
  const body = req.parsedBody;
  
  handleCustomerDataRequest(shop, body).catch(err => {
    console.error('[Webhook] Error in handleCustomerDataRequest:', err);
  });
});

router.post('/customers/redact', verifyWebhookHMAC, async (req, res) => {
  res.status(200).send('OK');
  
  const shop = req.headers['x-shopify-shop-domain'];
  const body = req.parsedBody;
  
  handleCustomerRedact(shop, body).catch(err => {
    console.error('[Webhook] Error in handleCustomerRedact:', err);
  });
});

router.post('/shop/redact', verifyWebhookHMAC, async (req, res) => {
  res.status(200).send('OK');
  
  const shop = req.headers['x-shopify-shop-domain'];
  const body = req.parsedBody;
  
  handleShopRedact(shop, body).catch(err => {
    console.error('[Webhook] Error in handleShopRedact:', err);
  });
});

module.exports = router;