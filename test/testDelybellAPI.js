require('dotenv').config();
const delybellClient = require('../services/delybellClient');

/**
 * Test Delybell API Connection and Endpoints
 */
async function testDelybellAPI() {
  console.log('\n🧪 Testing Delybell API Connection...\n');
  console.log(`API URL: ${process.env.DELYBELL_API_URL}\n`);

  const results = {
    passed: [],
    failed: [],
  };

  // 1. Service Types
  console.log('1️⃣  Testing Service Types endpoint...');
  try {
    const response = await delybellClient.getServiceTypes();
    const serviceTypes = response?.data || [];
    const count = Array.isArray(serviceTypes) ? serviceTypes.length : 0;
    console.log(`✅ Found ${count} service type(s)`);
    if (count > 0 && serviceTypes.length <= 5) {
      console.log(`   Sample: ${serviceTypes.slice(0, 3).map(s => s.name || s.id).join(', ')}`);
    }
    results.passed.push('Service Types');
  } catch (error) {
    console.error('❌ Service Types failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Service Types', error: error.response?.data || error.message });
  }

  // 2. Blocks
  console.log('\n2️⃣  Testing Blocks endpoint...');
  try {
    const response = await delybellClient.getBlocks();
    const blocks = response?.data || [];
    const count = Array.isArray(blocks) ? blocks.length : 0;
    console.log(`✅ Found ${count} block(s)`);
    if (count > 0 && blocks.length <= 5) {
      console.log(`   Sample: ${blocks.slice(0, 3).map(b => b.name || `Block ${b.id}`).join(', ')}`);
    }
    results.passed.push('Blocks');
  } catch (error) {
    console.error('❌ Blocks failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Blocks', error: error.response?.data || error.message });
  }

  // 3. Roads
  console.log('\n3️⃣  Testing Roads endpoint (block_id=5)...');
  try {
    const response = await delybellClient.getRoads(5);
    const roads = response?.data || [];
    const count = Array.isArray(roads) ? roads.length : 0;
    console.log(`✅ Found ${count} road(s)`);
    if (count > 0 && roads.length <= 5) {
      console.log(`   Sample: ${roads.slice(0, 3).map(r => r.name || `Road ${r.id}`).join(', ')}`);
    }
    results.passed.push('Roads');
  } catch (error) {
    console.error('❌ Roads failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Roads', error: error.response?.data || error.message });
  }

  // 4. Buildings
  console.log('\n4️⃣  Testing Buildings endpoint (road_id=1447, block_id=5)...');
  try {
    const response = await delybellClient.getBuildings(1447, 5);
    const buildings = response?.data || [];
    const count = Array.isArray(buildings) ? buildings.length : 0;
    console.log(`✅ Found ${count} building(s)`);
    if (count > 0 && buildings.length <= 5) {
      console.log(`   Sample: ${buildings.slice(0, 3).map(b => b.name || `Building ${b.id}`).join(', ')}`);
    }
    results.passed.push('Buildings');
  } catch (error) {
    console.error('❌ Buildings failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Buildings', error: error.response?.data || error.message });
  }

  // 5. Shipping Charge (VALID PAYLOAD)
  console.log('\n5️⃣  Testing Shipping Charge Calculation...');
  try {
    const shippingData = {
      order_type: 1,
      service_type_id: 1,
      destination_block_id: 5,
      package_details: [
        { weight: 1 }
      ]
    };

    const shippingCharge = await delybellClient.calculateShippingCharge(shippingData);
    const charge = shippingCharge?.data?.shippingCharge || shippingCharge?.shippingCharge || 'N/A';
    console.log(`✅ Shipping Charge calculated: ${charge} BHD`);
    if (shippingCharge?.status) {
      console.log(`   Status: ${shippingCharge.status}, Message: ${shippingCharge.message || 'Success'}`);
    }
    results.passed.push('Shipping Charge');
  } catch (error) {
    console.error('❌ Shipping Charge failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Shipping Charge', error: error.response?.data || error.message });
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('====================');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.passed.length) {
    console.log('\nSuccessful:');
    results.passed.forEach(e => console.log(`  ✔ ${e}`));
  }

  if (results.failed.length) {
    console.log('\nFailures:');
    results.failed.forEach(f => console.log(`  ✖ ${f.endpoint}`));
  }

  process.exit(results.failed.length > 0 ? 1 : 0);
}

testDelybellAPI().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
