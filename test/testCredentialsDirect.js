const axios = require('axios');

/**
 * Test Delybell API with credentials provided directly
 */
async function testCredentialsDirect() {
  const apiUrl = 'https://new.api.delybell.com';
  const accessKey = 'fb74e2976aca54c81f28cb65284c279df7cdc8e06b77a0d03c84ea99bc078a77';
  const secretKey = '660990668c85cafa6bf4b6b45ea492fd14b974ac69bba6df99e8a8daa7437bc3';

  console.log('🧪 Testing Delybell API with provided credentials...\n');
  console.log(`API URL: ${apiUrl}`);
  console.log(`Access Key: ${accessKey.substring(0, 20)}...`);
  console.log(`Secret Key: ${secretKey.substring(0, 20)}...\n`);

  const headers = {
    'x-access-key': accessKey,
    'x-secret-key': secretKey,
    'Content-Type': 'application/json',
  };

  // Test 1: Service Types
  console.log('1️⃣  Testing Service Types endpoint...');
  try {
    const response = await axios.get(
      `${apiUrl}/v1/customer/external/master/service_types`,
      { headers }
    );
    console.log('✅ Service Types:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Service Types failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
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
  } catch (error) {
    console.error('❌ Blocks failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
  console.log('');

  // Test 3: Test with old API URL (in case credentials are for old URL)
  console.log('3️⃣  Testing with OLD API URL (api.delybell.com)...');
  try {
    const oldApiUrl = 'https://api.delybell.com';
    const response = await axios.get(
      `${oldApiUrl}/v1/customer/external/master/service_types`,
      { headers }
    );
    console.log('✅ Old API URL works! Credentials are for old URL.');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    console.log('\n💡 Solution: Use DELYBELL_API_URL=https://api.delybell.com in your .env');
  } catch (error) {
    console.error('❌ Old API URL also failed:', error.response?.data || error.message);
  }
}

testCredentialsDirect().catch(console.error);

