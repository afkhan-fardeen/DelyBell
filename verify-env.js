require('dotenv').config();
const config = require('./config');

console.log('🔍 Checking Environment Configuration...\n');

console.log('📋 Environment Variables:');
console.log('  DELYBELL_API_URL:', process.env.DELYBELL_API_URL || '❌ NOT SET');
console.log('  DELYBELL_ACCESS_KEY:', process.env.DELYBELL_ACCESS_KEY ? `${process.env.DELYBELL_ACCESS_KEY.substring(0, 20)}...` : '❌ NOT SET');
console.log('  DELYBELL_SECRET_KEY:', process.env.DELYBELL_SECRET_KEY ? `${process.env.DELYBELL_SECRET_KEY.substring(0, 20)}...` : '❌ NOT SET');
console.log('');

console.log('⚙️  Loaded Configuration:');
console.log('  API URL:', config.delybell.apiUrl || '❌ NOT SET');
console.log('  Access Key:', config.delybell.accessKey ? `${config.delybell.accessKey.substring(0, 20)}...` : '❌ NOT SET');
console.log('  Secret Key:', config.delybell.secretKey ? `${config.delybell.secretKey.substring(0, 20)}...` : '❌ NOT SET');
console.log('');

// Check if using correct URL
if (config.delybell.apiUrl === 'https://new.api.delybell.com') {
  console.log('✅ API URL is correct: https://new.api.delybell.com');
} else if (config.delybell.apiUrl === 'https://api.delybell.com') {
  console.log('❌ API URL is WRONG: https://api.delybell.com (old URL)');
  console.log('   Fix: Update .env file with DELYBELL_API_URL=https://new.api.delybell.com');
} else {
  console.log('⚠️  API URL:', config.delybell.apiUrl);
}

console.log('');
console.log('💡 If values show "NOT SET" or wrong URL:');
console.log('   1. Check .env file exists: ls -la .env');
console.log('   2. Check .env content: cat .env | grep DELYBELL');
console.log('   3. Make sure each variable is on its own line');
console.log('   4. Restart server after updating .env');

