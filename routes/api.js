const express = require('express');
const router = express.Router();
const orderProcessor = require('../services/orderProcessor');
const shopifyClient = require('../services/shopifyClient');
const delybellClient = require('../services/delybellClient');

/**
 * Get all orders from Shopify and process them
 */
router.post('/sync-orders', async (req, res) => {
  try {
    const { shop, limit = 50, status = 'any' } = req.body;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop domain is required' });
    }

    // Get Shopify session
    const session = await shopifyClient.getSession(shop);
    
    if (!session) {
      return res.status(401).json({ 
        error: 'Shop not authenticated. Please install the app first.',
        installUrl: `/auth/install?shop=${shop}`,
      });
    }
    
    // Fetch orders from Shopify
    const orders = await shopifyClient.getOrders(session, { limit, status });
    
    console.log(`Found ${orders.length} orders to process`);

    // Process orders
    // ⚠️ CRITICAL: 
    // - Pickup is always Babybow (hardcoded in orderTransformer)
    // - Destination MUST be parsed from each Shopify order's shipping address
    // - NO defaults allowed for real orders
    
    const mappingConfig = {
      service_type_id: req.body.service_type_id || parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      shop: shop, // Pass shop domain to fetch pickup location from Shopify store address
      session: session, // Pass session so pickup location can be fetched from Shopify
      // Destination will be parsed from each order's shipping address
      // Do NOT provide destination mapping - it will be parsed per order
      destination: null,
      // Pickup location will be fetched from Shopify store address for this shop
    };

    const results = await orderProcessor.processOrdersBatch(
      orders,
      session,
      mappingConfig
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Processed ${orders.length} orders`,
      summary: {
        total: orders.length,
        successful: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error syncing orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Process a specific order by ID
 */
router.post('/process-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { shop } = req.body;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop domain is required' });
    }

    // Get Shopify session
    const session = await shopifyClient.getSession(shop);
    
    if (!session) {
      return res.status(401).json({ 
        error: 'Shop not authenticated. Please install the app first.',
        installUrl: `/auth/install?shop=${shop}`,
      });
    }
    
    // Fetch order from Shopify
    const order = await shopifyClient.getOrder(session, orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Process order
    // ⚠️ CRITICAL: 
    // - Pickup is always Babybow (hardcoded in orderTransformer)
    // - Destination MUST be parsed from Shopify order's shipping address
    // - NO defaults allowed for real orders
    
    const mappingConfig = {
      service_type_id: req.body.service_type_id || parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      shop: shop, // Pass shop domain to fetch pickup location from Shopify store address
      session: session, // Pass session so pickup location can be fetched from Shopify
      // Destination will be parsed from order's shipping address
      // Do NOT provide destination mapping - it will be parsed from order
      destination: null,
      // Pickup location will be fetched from Shopify store address for this shop
    };

    const result = await orderProcessor.processOrder(order, session, mappingConfig);

    res.json(result);
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Delybell service types
 */
router.get('/service-types', async (req, res) => {
  try {
    const { search } = req.query;
    const result = await delybellClient.getServiceTypes(search);
    res.json(result);
  } catch (error) {
    console.error('Error fetching service types:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Delybell blocks
 */
router.get('/blocks', async (req, res) => {
  try {
    const { search } = req.query;
    const result = await delybellClient.getBlocks(search);
    res.json(result);
  } catch (error) {
    console.error('Error fetching blocks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Delybell roads for a block
 */
router.get('/roads', async (req, res) => {
  try {
    const { block_id, search } = req.query;
    
    if (!block_id) {
      return res.status(400).json({ error: 'block_id is required' });
    }

    const result = await delybellClient.getRoads(parseInt(block_id), search);
    res.json(result);
  } catch (error) {
    console.error('Error fetching roads:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Delybell buildings for a road
 */
router.get('/buildings', async (req, res) => {
  try {
    const { road_id, block_id, search } = req.query;
    
    if (!road_id) {
      return res.status(400).json({ error: 'road_id is required' });
    }

    if (!block_id) {
      return res.status(400).json({ error: 'block_id is required' });
    }

    const result = await delybellClient.getBuildings(parseInt(road_id), parseInt(block_id), search);
    res.json(result);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Track a Delybell order
 */
router.get('/track/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await delybellClient.trackOrder(orderId);
    res.json(result);
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Register webhooks with Shopify
 * POST /api/webhooks/register
 * Body: { shop: "your-shop.myshopify.com", webhookUrl: "https://your-domain.com" }
 */
router.post('/webhooks/register', async (req, res) => {
  try {
    const { shop, webhookUrl } = req.body;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop domain is required' });
    }

    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    // Get Shopify session
    const session = await shopifyClient.getSession(shop);
    
    if (!session) {
      return res.status(401).json({ 
        error: 'Shop not authenticated. Please install the app first.',
        installUrl: `/auth/install?shop=${shop}`,
      });
    }

    // Define webhooks to register
    const webhooks = [
      {
        topic: 'orders/create',
        address: `${webhookUrl}/webhooks/orders/create`,
        format: 'json',
      },
      {
        topic: 'orders/updated', // Correct topic name (not orders/update)
        address: `${webhookUrl}/webhooks/orders/update`,
        format: 'json',
      },
      {
        topic: 'app/uninstalled',
        address: `${webhookUrl}/webhooks/app/uninstalled`,
        format: 'json',
      },
    ];

    const registered = await shopifyClient.registerWebhooks(session, webhooks);

    res.json({
      success: true,
      message: `Registered ${registered.length} webhooks`,
      webhooks: registered,
    });
  } catch (error) {
    console.error('Error registering webhooks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

