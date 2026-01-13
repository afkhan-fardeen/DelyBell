const axios = require('axios');

/**
 * Test Delybell API with NEW credentials
 */
async function testNewCredentials() {
  const apiUrl = 'https://new.api.delybell.com';
  const accessKey = 'fb74e2976aca54c81f28cb65284c279df7cdc8e06b77a0d03c84ea99bc078a77';
  const secretKey = 'ed1162b84ce857aef54b02903397bda4d374d4ab1837ec35d2784ab91552b9c8';

  console.log('🧪 Testing Delybell API with NEW credentials...\n');
  console.log(`API URL: ${apiUrl}`);
  console.log(`Access Key: ${accessKey.substring(0, 20)}...`);
  console.log(`Secret Key: ${secretKey.substring(0, 20)}...`);
  console.log(`Expiry: 2030-02-17T23:59:59.000+00:00\n`);

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

testNewCredentials().catch(console.error);

