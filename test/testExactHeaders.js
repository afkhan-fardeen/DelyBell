const axios = require('axios');

/**
 * Test with EXACT headers as specified by DelyBell
 */
async function testExactHeaders() {
  const apiUrl = 'https://new.api.delybell.com';
  const accessKey = 'fb74e2976aca54c81f28cb65284c279df7cdc8e06b77a0d03c84ea99bc078a77';
  const secretKey = 'ed1162b84ce857aef54b02903397bda4d374d4ab1837ec35d2784ab91552b9c8';

  console.log('🧪 Testing with EXACT headers as specified by DelyBell...\n');
  console.log('Headers being sent:');
  console.log('  x-access-key:', accessKey);
  console.log('  x-secret-key:', secretKey);
  console.log('');

  // Use EXACT header names as specified
  const headers = {
    'x-access-key': accessKey,
    'x-secret-key': secretKey,
    'Content-Type': 'application/json',
  };

  console.log('📋 Full headers object:');
  console.log(JSON.stringify(headers, null, 2));
  console.log('');

  // Test Service Types endpoint
  console.log('1️⃣  Testing Service Types endpoint...');
  try {
    const response = await axios.get(
      `${apiUrl}/v1/customer/external/master/service_types`,
      { 
        headers,
        // Add verbose logging
        validateStatus: function (status) {
          return status < 500; // Don't throw on 4xx errors
        }
      }
    );
    
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
    // Also log the actual request headers sent
    console.log('\n📤 Request details:');
    console.log('  URL:', response.config.url);
    console.log('  Method:', response.config.method);
    console.log('  Headers sent:', JSON.stringify(response.config.headers, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Status Text:', error.response.statusText);
      console.error('  Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('  Request Headers:', JSON.stringify(error.config?.headers, null, 2));
    }
  }
}

testExactHeaders().catch(console.error);

