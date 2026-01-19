const express = require('express');
const router = express.Router();
const orderProcessor = require('../services/orderProcessor');
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
    // ⚠️ CRITICAL: Ensure pickup address is provided (from request body or environment)
    const pickupMapping = req.body.pickup_mapping || {};
    if (!pickupMapping.address) {
      // Fallback to environment variable (REQUIRED)
      pickupMapping.address = process.env.DEFAULT_PICKUP_ADDRESS || '';
      pickupMapping.block_id = pickupMapping.block_id || parseInt(process.env.DEFAULT_PICKUP_BLOCK_ID) || 1;
      pickupMapping.road_id = pickupMapping.road_id || parseInt(process.env.DEFAULT_PICKUP_ROAD_ID) || 1;
      pickupMapping.building_id = pickupMapping.building_id || parseInt(process.env.DEFAULT_PICKUP_BUILDING_ID) || 1;
      pickupMapping.customer_name = pickupMapping.customer_name || process.env.DEFAULT_PICKUP_CUSTOMER_NAME || '';
      pickupMapping.mobile_number = pickupMapping.mobile_number || process.env.DEFAULT_PICKUP_MOBILE_NUMBER || '';
    }
    
    const mappingConfig = {
      service_type_id: req.body.service_type_id || parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      destination: req.body.destination_mapping || {
        block_id: parseInt(process.env.DEFAULT_DESTINATION_BLOCK_ID) || 1,
        road_id: parseInt(process.env.DEFAULT_DESTINATION_ROAD_ID) || 1,
        building_id: parseInt(process.env.DEFAULT_DESTINATION_BUILDING_ID) || 1,
      },
      pickup: pickupMapping,
    };
    
    // Validate pickup address is provided
    if (!mappingConfig.pickup.address || mappingConfig.pickup.address.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'CRITICAL: Pickup address is required. ' +
               'Either provide pickup_mapping.address in request body or set DEFAULT_PICKUP_ADDRESS in environment variables.',
        help: 'The pickup address MUST match exactly what is registered in Delybell system.',
      });
    }

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

    // ⚠️ CRITICAL: Ensure pickup address is provided (from request body or environment)
    const pickupMapping = req.body.pickup_mapping || {};
    if (!pickupMapping.address) {
      // Fallback to environment variable (REQUIRED)
      pickupMapping.address = process.env.DEFAULT_PICKUP_ADDRESS || '';
      pickupMapping.block_id = pickupMapping.block_id || parseInt(process.env.DEFAULT_PICKUP_BLOCK_ID) || 1;
      pickupMapping.road_id = pickupMapping.road_id || parseInt(process.env.DEFAULT_PICKUP_ROAD_ID) || 1;
      pickupMapping.building_id = pickupMapping.building_id || parseInt(process.env.DEFAULT_PICKUP_BUILDING_ID) || 1;
      pickupMapping.customer_name = pickupMapping.customer_name || process.env.DEFAULT_PICKUP_CUSTOMER_NAME || '';
      pickupMapping.mobile_number = pickupMapping.mobile_number || process.env.DEFAULT_PICKUP_MOBILE_NUMBER || '';
    }
    
    const mappingConfig = {
      service_type_id: req.body.service_type_id || parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      destination: req.body.destination_mapping || {
        block_id: parseInt(process.env.DEFAULT_DESTINATION_BLOCK_ID) || 1,
        road_id: parseInt(process.env.DEFAULT_DESTINATION_ROAD_ID) || 1,
        building_id: parseInt(process.env.DEFAULT_DESTINATION_BUILDING_ID) || 1,
      },
      pickup: pickupMapping,
    };
    
    // Validate pickup address is provided
    if (!mappingConfig.pickup.address || mappingConfig.pickup.address.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'CRITICAL: Pickup address is required. ' +
               'Either provide pickup_mapping.address in request body or set DEFAULT_PICKUP_ADDRESS in environment variables.',
        help: 'The pickup address MUST match exactly what is registered in Delybell system.',
      });
    }

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

module.exports = router;

