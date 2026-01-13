require('dotenv').config();
const config = require('../config');
const axios = require('axios');

/**
 * Debug script to check credentials and test API connection
 */
async function debugCredentials() {
  console.log('🔍 Debugging Delybell API Credentials...\n');
  
  // Check config
  console.log('📋 Configuration:');
  console.log('  API URL:', config.delybell.apiUrl);
  console.log('  Access Key:', config.delybell.accessKey ? `${config.delybell.accessKey.substring(0, 20)}...` : 'NOT SET');
  console.log('  Secret Key:', config.delybell.secretKey ? `${config.delybell.secretKey.substring(0, 20)}...` : 'NOT SET');
  console.log('');
  
  // Check environment variables
  console.log('🌍 Environment Variables:');
  console.log('  DELYBELL_API_URL:', process.env.DELYBELL_API_URL || 'NOT SET');
  console.log('  DELYBELL_ACCESS_KEY:', process.env.DELYBELL_ACCESS_KEY ? `${process.env.DELYBELL_ACCESS_KEY.substring(0, 20)}...` : 'NOT SET');
  console.log('  DELYBELL_SECRET_KEY:', process.env.DELYBELL_SECRET_KEY ? `${process.env.DELYBELL_SECRET_KEY.substring(0, 20)}...` : 'NOT SET');
  console.log('');
  
  // Test API call with full headers
  console.log('🧪 Testing API Call...');
  try {
    const headers = {
      'x-access-key': config.delybell.accessKey,
      'x-secret-key': config.delybell.secretKey,
      'Content-Type': 'application/json',
    };
    
    console.log('  Headers being sent:');
    console.log('    x-access-key:', headers['x-access-key'] ? `${headers['x-access-key'].substring(0, 20)}...` : 'MISSING');
    console.log('    x-secret-key:', headers['x-secret-key'] ? `${headers['x-secret-key'].substring(0, 20)}...` : 'MISSING');
    console.log('');
    
    const response = await axios.get(
      `${config.delybell.apiUrl}/v1/customer/external/master/service_types`,
      { headers }
    );
    
    console.log('✅ API Call Successful!');
    console.log('  Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ API Call Failed!');
    console.log('  Status:', error.response?.status);
    console.log('  Status Text:', error.response?.statusText);
    console.log('  Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('  Error Message:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Possible Issues:');
      console.log('  1. Credentials might be for the old API URL (api.delybell.com)');
      console.log('  2. Credentials might need to be regenerated for new.api.delybell.com');
      console.log('  3. Check if credentials are correct in .env file');
    }
  }
}

debugCredentials().catch(console.error);

