const express = require('express');
const router = express.Router();
const orderProcessor = require('../services/orderProcessor');
const pickupLocationService = require('../services/pickupLocationService');
const { generateMockShopifyOrder, generateMockShopifyOrders } = require('../test/mockShopifyOrder');

/**
 * ⚠️ NOTE: Test endpoints allow default destination mapping for testing purposes.
 * Real orders (webhooks, API sync) will parse addresses from Shopify and reject if mapping fails.
 */

/**
 * Test endpoint to process a mock Shopify order
 * This allows testing Delybell integration without Shopify access
 */
router.post('/process-mock-order', async (req, res) => {
  try {
    // Generate mock order or use provided order data
    const mockOrder = req.body.order || generateMockShopifyOrder(req.body.orderOverrides || {});
    
    console.log(`Processing mock Shopify order: ${mockOrder.order_number || mockOrder.id}`);

    // Process the order
    // Get shop domain from request or use test shop
    const shop = req.body.shop || 'test-store.myshopify.com';
    
    // For test endpoints, try to get session if shop is provided
    let session = null;
    if (shop && shop !== 'test-store.myshopify.com') {
      try {
        const shopifyClient = require('../services/shopifyClient');
        session = await shopifyClient.getSession(shop);
      } catch (error) {
        console.log(`⚠️ No session found for shop ${shop} - pickup location fetch may fail`);
      }
    }
    
    const mappingConfig = {
      service_type_id: req.body.service_type_id || parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      shop: shop, // Pass shop domain to fetch pickup location from Shopify store address
      session: session, // Pass session if available
      destination: req.body.destination_mapping || {
        block_id: parseInt(process.env.DEFAULT_DESTINATION_BLOCK_ID) || 1,
        road_id: parseInt(process.env.DEFAULT_DESTINATION_ROAD_ID) || 1,
        building_id: parseInt(process.env.DEFAULT_DESTINATION_BUILDING_ID) || 1,
      },
      // Pickup location will be fetched from Shopify store address for this shop
    };

    const result = await orderProcessor.processOrder(
      mockOrder,
      null, // No Shopify session for mock orders
      mappingConfig
    );

    res.json({
      success: true,
      message: 'Mock order processed',
      mockOrder: {
        order_number: mockOrder.order_number,
        customer: mockOrder.customer,
        shipping_address: mockOrder.shipping_address,
        billing_address: mockOrder.billing_address,
        line_items: mockOrder.line_items,
      },
      result,
    });
  } catch (error) {
    console.error('Error processing mock order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * Test endpoint to process multiple mock orders
 */
router.post('/process-mock-orders', async (req, res) => {
  try {
    const count = req.body.count || 3;
    const mockOrders = generateMockShopifyOrders(count, req.body.orderOverrides || {});
    
    console.log(`Processing ${mockOrders.length} mock Shopify orders`);

    // Get shop domain from request or use test shop
    const shop = req.body.shop || 'test-store.myshopify.com';
    
    // For test endpoints, try to get session if shop is provided
    let session = null;
    if (shop && shop !== 'test-store.myshopify.com') {
      try {
        const shopifyClient = require('../services/shopifyClient');
        session = await shopifyClient.getSession(shop);
      } catch (error) {
        console.log(`⚠️ No session found for shop ${shop} - pickup location fetch may fail`);
      }
    }
    
    const mappingConfig = {
      service_type_id: req.body.service_type_id || parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      shop: shop, // Pass shop domain to fetch pickup location from Shopify store address
      session: session, // Pass session if available
      destination: req.body.destination_mapping || {
        block_id: parseInt(process.env.DEFAULT_DESTINATION_BLOCK_ID) || 1,
        road_id: parseInt(process.env.DEFAULT_DESTINATION_ROAD_ID) || 1,
        building_id: parseInt(process.env.DEFAULT_DESTINATION_BUILDING_ID) || 1,
      },
      // Pickup location will be fetched from Shopify store address for this shop
    };

    const results = [];
    for (const order of mockOrders) {
      const result = await orderProcessor.processOrder(
        order,
        null,
        mappingConfig
      );
      results.push({
        order_number: order.order_number,
        result,
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.result.success).length;
    const failureCount = results.filter(r => !r.result.success).length;

    res.json({
      success: true,
      message: `Processed ${mockOrders.length} mock orders`,
      summary: {
        total: mockOrders.length,
        successful: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error processing mock orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * Get a sample mock order (for testing/viewing structure)
 */
router.get('/mock-order-sample', (req, res) => {
  const sampleOrder = generateMockShopifyOrder({
    orderNumber: 12345,
    customerFirstName: 'John',
    customerLastName: 'Doe',
    shippingAddress1: '123 Test Street',
    shippingCity: 'Test City',
  });
  
  res.json({
    message: 'Sample mock Shopify order structure',
    order: sampleOrder,
    note: 'Use this structure to understand what data is needed for order processing',
  });
});

/**
 * Test pickup location fetching
 * GET /test/pickup-location?shop=store.myshopify.com
 */
router.get('/pickup-location', async (req, res) => {
  try {
    const shop = req.query.shop || 'test-store.myshopify.com';
    
    console.log(`🧪 Testing pickup location fetch for shop: ${shop}`);
    
    // Try to get session for this shop
    let session = null;
    try {
      const shopifyClient = require('../services/shopifyClient');
      session = await shopifyClient.getSession(shop);
      if (session) {
        console.log(`✅ Session found for shop: ${shop}`);
      } else {
        console.log(`⚠️ No session found for shop: ${shop} - will try to fetch session during pickup location fetch`);
      }
    } catch (error) {
      console.log(`⚠️ Could not get session: ${error.message}`);
    }
    
    // Try to fetch pickup location from Shopify store address
    const pickupLocation = await pickupLocationService.getPickupLocation(shop, session);
    
    // Get cached locations
    const cachedLocations = pickupLocationService.getCachedLocations();
    
    res.json({
      success: true,
      shop: shop,
      pickupLocation: pickupLocation,
      fromShopify: pickupLocation.fromShopify || false,
      cachedLocations: cachedLocations,
      note: pickupLocation.fromShopify 
        ? '✅ Pickup location fetched from Shopify store address'
        : '⚠️ Pickup location source unknown',
    });
  } catch (error) {
    console.error('Error testing pickup location:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      note: 'Make sure the shop has the app installed and has a store address configured in Shopify Admin → Settings → Store details. The address must contain Block and Road information.',
    });
  }
});

/**
 * Clear pickup location cache
 * POST /test/pickup-location/clear?shop=store.myshopify.com
 */
router.post('/pickup-location/clear', (req, res) => {
  const shop = req.query.shop;
  
  pickupLocationService.clearCache(shop);
  
  res.json({
    success: true,
    message: shop ? `Cache cleared for shop: ${shop}` : 'All pickup location cache cleared',
    cachedLocations: pickupLocationService.getCachedLocations(),
  });
});

module.exports = router;

