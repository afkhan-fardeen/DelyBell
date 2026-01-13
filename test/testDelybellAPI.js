require('dotenv').config();
const delybellClient = require('../services/delybellClient');

/**
 * Test Delybell API Connection and Endpoints
 */
async function testDelybellAPI() {
  console.log('🧪 Testing Delybell API Connection...\n');
  console.log(`API URL: ${process.env.DELYBELL_API_URL || 'https://new.api.delybell.com'}\n`);

  const results = {
    passed: [],
    failed: [],
  };

  // Test 1: Service Types
  console.log('1️⃣  Testing Service Types endpoint...');
  try {
    const serviceTypes = await delybellClient.getServiceTypes();
    console.log('✅ Service Types:', JSON.stringify(serviceTypes, null, 2));
    results.passed.push('Service Types');
  } catch (error) {
    console.error('❌ Service Types failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Service Types', error: error.response?.data || error.message });
  }
  console.log('');

  // Test 2: Blocks
  console.log('2️⃣  Testing Blocks endpoint...');
  try {
    const blocks = await delybellClient.getBlocks();
    console.log('✅ Blocks:', JSON.stringify(blocks, null, 2));
    results.passed.push('Blocks');
  } catch (error) {
    console.error('❌ Blocks failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Blocks', error: error.response?.data || error.message });
  }
  console.log('');

  // Test 3: Roads (if we have a block_id)
  console.log('3️⃣  Testing Roads endpoint...');
  try {
    // Try with block_id = 1 (common test value)
    const roads = await delybellClient.getRoads(1);
    console.log('✅ Roads (block_id=1):', JSON.stringify(roads, null, 2));
    results.passed.push('Roads');
  } catch (error) {
    console.error('❌ Roads failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Roads', error: error.response?.data || error.message });
  }
  console.log('');

  // Test 4: Buildings (if we have a road_id)
  console.log('4️⃣  Testing Buildings endpoint...');
  try {
    // Try with road_id = 1 (common test value)
    const buildings = await delybellClient.getBuildings(1);
    console.log('✅ Buildings (road_id=1):', JSON.stringify(buildings, null, 2));
    results.passed.push('Buildings');
  } catch (error) {
    console.error('❌ Buildings failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Buildings', error: error.response?.data || error.message });
  }
  console.log('');

  // Test 5: Shipping Charge Calculation
  console.log('5️⃣  Testing Shipping Charge Calculation...');
  try {
    const shippingData = {
      service_type_id: 1,
      destination_block_id: 1,
      destination_road_id: 1,
      destination_building_id: 1,
      pickup_block_id: 1,
      pickup_road_id: 1,
      pickup_building_id: 1,
      weight: 1.0,
      items: [
        {
          name: 'Test Item',
          quantity: 1,
          weight: 1.0,
          price: 10.0,
        },
      ],
    };
    const shippingCharge = await delybellClient.calculateShippingCharge(shippingData);
    console.log('✅ Shipping Charge:', JSON.stringify(shippingCharge, null, 2));
    results.passed.push('Shipping Charge');
  } catch (error) {
    console.error('❌ Shipping Charge failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Shipping Charge', error: error.response?.data || error.message });
  }
  console.log('');

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ Successful endpoints:');
    results.passed.forEach(endpoint => console.log(`   - ${endpoint}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed endpoints:');
    results.failed.forEach(({ endpoint, error }) => {
      console.log(`   - ${endpoint}: ${JSON.stringify(error)}`);
    });
  }

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
testDelybellAPI().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
