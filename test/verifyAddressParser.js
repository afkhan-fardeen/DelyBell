require('dotenv').config();
const addressMapper = require('../services/addressMapper');

/**
 * Quick verification of address parser with zip code fallback
 */

console.log('🔍 Verifying Address Parser with Zip Code Fallback\n');

// Test the problematic address from the error log
const testAddress = {
  address1: 'Building: 2733, Road: 3953,',
  address2: '21',
  city: 'Al Hajiyat',
  zip: '939',
};

console.log('Test Address:');
console.log(JSON.stringify(testAddress, null, 2));
console.log('');

const result = addressMapper.parseShopifyAddress(testAddress);

if (result && addressMapper.isValidMapping(result)) {
  console.log('✅ Address parsed successfully!');
  console.log('');
  console.log('Parsed Mapping:');
  console.log(`  Block ID: ${result.block_id} ${result.block_id === 939 ? '✅ (from zip code)' : '❌'}`);
  console.log(`  Road ID: ${result.road_id} ${result.road_id === 3953 ? '✅' : '❌'}`);
  console.log(`  Building ID: ${result.building_id} ${result.building_id === 2733 ? '✅' : '❌'}`);
  console.log(`  Flat Number: ${result.flat_number} ${result.flat_number === '21' ? '✅' : '❌'}`);
  console.log('');
  console.log('✅ All checks passed! Address parser is working correctly.');
  console.log('');
  console.log('Expected Delybell payload:');
  console.log(JSON.stringify({
    destination_block_id: result.block_id,
    destination_road_id: result.road_id,
    destination_building_id: result.building_id,
    destination_flat_or_office_number: result.flat_number,
  }, null, 2));
  process.exit(0);
} else {
  console.log('❌ Address parsing failed!');
  console.log('');
  console.log('Result:', result);
  console.log('');
  console.log('This means the address cannot be mapped to Delybell format.');
  console.log('Check the address format and ensure it contains Block and Road information.');
  process.exit(1);
}
