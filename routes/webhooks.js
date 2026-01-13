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
    console.log('🔍 Body inspection:', {
      type: typeof body,
      isBuffer: Buffer.isBuffer(body),
      isArray: Array.isArray(body),
      keys: typeof body === 'object' && body !== null ? Object.keys(body).slice(0, 10) : 'N/A',
    });
    
    // If body is Buffer (raw from bodyParser.raw), parse it
    if (Buffer.isBuffer(body)) {
      const bodyString = body.toString('utf8');
      console.log('📄 Raw webhook body (first 300 chars):', bodyString.substring(0, 300));
      const parsed = JSON.parse(bodyString);
      console.log('✅ Parsed from Buffer, order ID:', parsed.id || parsed.order_number || 'not found');
      return parsed;
    }
    
    // If body is string, parse it
    if (typeof body === 'string') {
      console.log('📄 Body is string, parsing...');
      const parsed = JSON.parse(body);
      console.log('✅ Parsed from string, order ID:', parsed.id || parsed.order_number || 'not found');
      return parsed;
    }
    
    // If body is already parsed (object), check if it's the order directly or wrapped
    if (typeof body === 'object' && body !== null) {
      // Shopify webhook sends the order object directly, not wrapped
      // Check if this looks like a Shopify order
      if (body.id || body.order_number || body.line_items || body.customer) {
        console.log('✅ Body is already parsed object, order ID:', body.id || body.order_number || 'not found');
        return body;
      }
      
      // Might be wrapped in another object
      console.log('⚠️ Body is object but doesn\'t look like order, keys:', Object.keys(body));
      console.log('📄 Full body:', JSON.stringify(body, null, 2).substring(0, 500));
      
      // Try to find order in common wrapper keys
      if (body.order) return body.order;
      if (body.data) return body.data;
      if (body.webhook) return body.webhook;
      
      return body; // Return as-is, let the handler deal with it
    }
    
    console.warn('⚠️ Unknown body type:', typeof body);
    return body;
  } catch (error) {
    console.error('❌ Error parsing webhook body:', error);
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
  try {
    console.log('🔔 Webhook handler called: /orders/create');
    console.log('📥 Request body type:', typeof req.body, Buffer.isBuffer(req.body) ? '(Buffer)' : '');
    
    // Parse webhook body (raw body is Buffer, need to parse JSON)
    let shopifyOrder;
    try {
      shopifyOrder = parseWebhookBody(req);
      console.log('📦 Parsed order data:', shopifyOrder ? `Order ID: ${shopifyOrder.id || shopifyOrder.order_number || 'unknown'}` : 'NULL');
      
      if (!shopifyOrder) {
        console.error('❌ Parsed order is null or undefined');
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook payload: order is null',
        });
      }
      
      if (!shopifyOrder.id && !shopifyOrder.order_number) {
        console.error('❌ Order missing ID:', JSON.stringify(shopifyOrder, null, 2).substring(0, 500));
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook payload: missing order ID',
          receivedData: Object.keys(shopifyOrder),
        });
      }
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError);
      return res.status(400).json({
        success: false,
        error: `Failed to parse webhook body: ${parseError.message}`,
      });
    }
    
    const orderId = shopifyOrder.order_number || shopifyOrder.id;
    console.log(`📦 Received webhook for new order: ${orderId}`);

    // Get shop domain from headers or order data
    const shop = req.headers['x-shopify-shop-domain'] || shopifyOrder.shop;
    if (!shop) {
      console.error('❌ Shop domain not found in webhook headers');
      return res.status(400).json({ 
        success: false,
        error: 'Shop domain not found in webhook headers' 
      });
    }

    console.log(`🏪 Processing order for shop: ${shop}`);

    // Retrieve session from storage
    const session = await shopifyClient.getSession(shop);
    if (!session) {
      console.warn(`⚠️ No session found for shop: ${shop}. Order processing will continue but tags won't be updated.`);
    } else {
      console.log(`✅ Session found for shop: ${shop}`);
    }

    // Process the order
    // Address mapping configuration - can be set via environment variables or defaults
    // IMPORTANT: Pickup address must match EXACTLY what's registered in Delybell system
    // Destination address must be in standard format for auto-assignment
    const mappingConfig = {
      service_type_id: parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      destination: {
        block_id: parseInt(process.env.DEFAULT_DESTINATION_BLOCK_ID) || 5,
        road_id: parseInt(process.env.DEFAULT_DESTINATION_ROAD_ID) || 1447,
        building_id: parseInt(process.env.DEFAULT_DESTINATION_BUILDING_ID) || 1,
      },
      pickup: {
        block_id: parseInt(process.env.DEFAULT_PICKUP_BLOCK_ID) || 5,
        road_id: parseInt(process.env.DEFAULT_PICKUP_ROAD_ID) || 1447,
        building_id: parseInt(process.env.DEFAULT_PICKUP_BUILDING_ID) || 1,
        // Pickup address must match registered Delybell address exactly
        address: process.env.DEFAULT_PICKUP_ADDRESS || '',
        customer_name: process.env.DEFAULT_PICKUP_CUSTOMER_NAME || '',
        mobile_number: process.env.DEFAULT_PICKUP_MOBILE_NUMBER || '',
      },
    };

    console.log(`⚙️ Using mapping config:`, JSON.stringify(mappingConfig, null, 2));
    console.log(`🚀 Starting order processing...`);

    const result = await orderProcessor.processOrder(
      shopifyOrder,
      session,
      mappingConfig
    );

    console.log(`📊 Order processing result:`, JSON.stringify(result, null, 2));

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Order processed successfully',
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to process order',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Webhook endpoint for order updates
 */
router.post('/orders/update', async (req, res) => {
  try {
    const shopifyOrder = parseWebhookBody(req);
    const shop = req.headers['x-shopify-shop-domain'] || shopifyOrder.shop;
    
    console.log(`Received webhook for order update: ${shopifyOrder.order_number || shopifyOrder.id} from ${shop}`);
    
    // Handle order updates if needed
    // For now, just acknowledge the webhook
    // You can add logic here to sync order updates to Delybell if needed
    res.status(200).json({ 
      success: true, 
      message: 'Order update received',
      orderId: shopifyOrder.id,
      shop,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

