const axios = require('axios');

/**
 * Test with WORKING credentials
 */
async function testWorkingCredentials() {
  const apiUrl = 'https://new.api.delybell.com';
  const accessKey = 'a6cce0c6d10bea3ad9f4f3ce5fca982649adb83bd798c303ab5672ca0c542066';
  const secretKey = 'c22cf52a7bd7d3d7ebd2bb94769460bb4b575b534c5aaa1af67e92a9b0692044';

  console.log('🧪 Testing with WORKING credentials...\n');
  console.log(`API URL: ${apiUrl}`);
  console.log(`Access Key: ${accessKey.substring(0, 20)}...`);
  console.log(`Secret Key: ${secretKey.substring(0, 20)}...\n`);

  const headers = {
    'x-access-key': accessKey,
    'x-secret-key': secretKey,
    'Content-Type': 'application/json',
  };

  const results = {
    passed: [],
    failed: [],
  };

  // Test 1: Service Types
  console.log('1️⃣  Testing Service Types endpoint...');
  try {
    const response = await axios.get(
      `${apiUrl}/v1/customer/external/master/service_types`,
      { headers }
    );
    console.log('✅ Service Types:', JSON.stringify(response.data, null, 2));
    results.passed.push('Service Types');
  } catch (error) {
    console.error('❌ Service Types failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Service Types', error: error.response?.data || error.message });
  }
  console.log('');

  // Test 2: Blocks
  console.log('2️⃣  Testing Blocks endpoint...');
  try {
    const response = await axios.get(
      `${apiUrl}/v1/customer/external/master/blocks`,
      { headers }
    );
    console.log('✅ Blocks:', JSON.stringify(response.data, null, 2));
    results.passed.push('Blocks');
  } catch (error) {
    console.error('❌ Blocks failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Blocks', error: error.response?.data || error.message });
  }
  console.log('');

  // Test 3: Roads
  console.log('3️⃣  Testing Roads endpoint (block_id=1)...');
  try {
    const response = await axios.get(
      `${apiUrl}/v1/customer/external/master/roads`,
      { 
        headers,
        params: { block_id: 1 }
      }
    );
    console.log('✅ Roads:', JSON.stringify(response.data, null, 2));
    results.passed.push('Roads');
  } catch (error) {
    console.error('❌ Roads failed:', error.response?.data || error.message);
    results.failed.push({ endpoint: 'Roads', error: error.response?.data || error.message });
  }
  console.log('');

  // Test 4: Buildings
  console.log('4️⃣  Testing Buildings endpoint (road_id=1)...');
  try {
    const response = await axios.get(
      `${apiUrl}/v1/customer/external/master/buildings`,
      { 
        headers,
        params: { road_id: 1 }
      }
    );
    console.log('✅ Buildings:', JSON.stringify(response.data, null, 2));
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
      order_type: 1,
      service_type_id: 1,
      destination_block_id: 1,
      package_details: [
        {
          weight: 5
        }
      ]
    };
    const response = await axios.post(
      `${apiUrl}/v1/customer/external/order/shipping_charge`,
      shippingData,
      { headers }
    );
    console.log('✅ Shipping Charge:', JSON.stringify(response.data, null, 2));
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

  if (results.passed.length > 0) {
    console.log('\n🎉 Credentials are working! Update your .env file with:');
    console.log('DELYBELL_API_URL=https://new.api.delybell.com');
    console.log(`DELYBELL_ACCESS_KEY=${accessKey}`);
    console.log(`DELYBELL_SECRET_KEY=${secretKey}`);
  }
}

testWorkingCredentials().catch(console.error);

