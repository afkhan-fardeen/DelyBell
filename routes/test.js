const express = require('express');
const router = express.Router();
const orderProcessor = require('../services/orderProcessor');
const { generateMockShopifyOrder, generateMockShopifyOrders } = require('../test/mockShopifyOrder');

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
    // Note: You'll need to provide mapping config for addresses
    const mappingConfig = {
      service_type_id: req.body.service_type_id || 1,
      destination: req.body.destination_mapping || {
        block_id: 1,
        road_id: 1,
        building_id: 1,
      },
      pickup: req.body.pickup_mapping || {
        block_id: 1,
        road_id: 1,
        building_id: 1,
      },
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

    const mappingConfig = {
      service_type_id: req.body.service_type_id || 1,
      destination: req.body.destination_mapping || {
        block_id: 1,
        road_id: 1,
        building_id: 1,
      },
      pickup: req.body.pickup_mapping || {
        block_id: 1,
        road_id: 1,
        building_id: 1,
      },
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

module.exports = router;

