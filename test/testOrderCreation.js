require('dotenv').config();
const orderProcessor = require('../services/orderProcessor');
const { generateMockShopifyOrder } = require('./mockShopifyOrder');

/**
 * Test Order Creation End-to-End
 * This test verifies that order creation works properly with Delybell API
 */
async function testOrderCreation() {
  console.log('\n🧪 Testing Order Creation End-to-End...\n');

  // Check required environment variables
  const requiredVars = [
    'DELYBELL_ACCESS_KEY',
    'DELYBELL_SECRET_KEY',
    'DEFAULT_PICKUP_ADDRESS',
    'DEFAULT_DESTINATION_BLOCK_ID',
    'DEFAULT_DESTINATION_ROAD_ID',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these in your .env file before testing order creation.');
    process.exit(1);
  }

  console.log('✅ All required environment variables are set\n');

  // Create mapping config from environment variables
  const mappingConfig = {
    service_type_id: parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
    destination: {
      block_id: parseInt(process.env.DEFAULT_DESTINATION_BLOCK_ID),
      road_id: parseInt(process.env.DEFAULT_DESTINATION_ROAD_ID),
      building_id: parseInt(process.env.DEFAULT_DESTINATION_BUILDING_ID) || null,
      flat_number: process.env.DEFAULT_DESTINATION_FLAT_NUMBER || 'N/A',
    },
    pickup: {
      address: process.env.DEFAULT_PICKUP_ADDRESS,
      block_id: parseInt(process.env.DEFAULT_PICKUP_BLOCK_ID) || 5,
      road_id: parseInt(process.env.DEFAULT_PICKUP_ROAD_ID) || 1447,
      building_id: parseInt(process.env.DEFAULT_PICKUP_BUILDING_ID) || null,
      customer_name: process.env.DEFAULT_PICKUP_CUSTOMER_NAME || 'Test Store',
      mobile_number: process.env.DEFAULT_PICKUP_MOBILE_NUMBER || '+97300000000',
    },
  };

  console.log('📋 Configuration:');
  console.log(`   Service Type ID: ${mappingConfig.service_type_id}`);
  console.log(`   Destination: Block ${mappingConfig.destination.block_id}, Road ${mappingConfig.destination.road_id}`);
  console.log(`   Pickup Address: ${mappingConfig.pickup.address}`);
  console.log('');

  // Generate a test order
  const testOrder = generateMockShopifyOrder({
    orderNumber: `TEST-${Date.now()}`,
    customerFirstName: 'John',
    customerLastName: 'Doe',
    customerPhone: '+97312345678',
    shippingAddress1: 'Building 50',
    shippingAddress2: 'Road 1901',
    shippingCity: 'Block 319',
    shippingCountry: 'Bahrain',
    shippingPhone: '+97312345678',
    totalPrice: '100.00',
  });

  console.log('📦 Test Order Details:');
  console.log(`   Order Number: ${testOrder.order_number}`);
  console.log(`   Customer: ${testOrder.customer.first_name} ${testOrder.customer.last_name}`);
  console.log(`   Shipping Address: ${testOrder.shipping_address.address1}, ${testOrder.shipping_address.city}`);
  console.log(`   Total Price: ${testOrder.total_price}`);
  console.log('');

  try {
    console.log('🚀 Processing order...\n');
    
    // Process the order (without Shopify session for testing)
    const result = await orderProcessor.processOrder(
      testOrder,
      null, // No Shopify session for test
      mappingConfig
    );

    console.log('\n📊 Result:');
    console.log('====================');
    
    if (result.success) {
      console.log('✅ Order created successfully!');
      console.log(`   Shopify Order ID: ${result.shopifyOrderId}`);
      console.log(`   Delybell Order ID: ${result.delybellOrderId}`);
      console.log(`   Customer Order ID: ${result.customerOrderId}`);
      if (result.shippingCharge) {
        console.log(`   Shipping Charge: ${result.shippingCharge} BHD`);
      }
      if (result.trackingUrl) {
        console.log(`   Tracking URL: ${result.trackingUrl}`);
      }
      console.log(`   Message: ${result.message}`);
      
      console.log('\n✅ Order creation test PASSED!');
      process.exit(0);
    } else {
      console.log('❌ Order creation failed!');
      console.log(`   Error: ${result.error}`);
      if (result.errorStatus) {
        console.log(`   HTTP Status: ${result.errorStatus}`);
      }
      if (result.errorDetails) {
        console.log(`   Details: ${JSON.stringify(result.errorDetails, null, 2)}`);
      }
      
      console.log('\n❌ Order creation test FAILED!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Fatal error during order creation:');
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   HTTP Status: ${error.response.status}`);
      console.error(`   Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    console.error(`   Stack: ${error.stack}`);
    
    console.log('\n❌ Order creation test FAILED!');
    process.exit(1);
  }
}

// Run test
testOrderCreation().catch(err => {
  console.error('💥 Test suite failed:', err);
  process.exit(1);
});
