require('dotenv').config();
const addressMapper = require('../services/addressMapper');

/**
 * Test Address Parser
 * Tests various address formats to ensure parsing works correctly
 */

const testAddresses = [
  {
    name: 'Colon format with zip as Block (Bahrain format)',
    address: {
      address1: 'Building: 2733, Road: 3953,',
      address2: '21',
      city: 'Al Hajiyat',
      zip: '939',
    },
    expected: {
      building_id: 2733,
      road_id: 3953,
      block_id: 939, // Zip code used as Block (common in Bahrain)
      flat_number: '21',
    },
  },
  {
    name: 'Standard format',
    address: {
      address1: 'Building 134',
      address2: 'Road 354',
      city: 'Block 306',
      zip: '12345',
    },
    expected: {
      building_id: 134,
      road_id: 354,
      block_id: 306,
      flat_number: 'N/A',
    },
  },
  {
    name: 'Colon format with Block',
    address: {
      address1: 'Building: 134, Road: 354, Block: 306',
      address2: '',
      city: 'Manama',
      zip: '12345',
    },
    expected: {
      building_id: 134,
      road_id: 354,
      block_id: 306,
      flat_number: 'N/A',
    },
  },
  {
    name: 'Mixed format',
    address: {
      address1: 'Building 50',
      address2: 'Road: 1901',
      city: 'Block 319',
      zip: '12345',
    },
    expected: {
      building_id: 50,
      road_id: 1901,
      block_id: 319,
      flat_number: 'N/A',
    },
  },
];

console.log('🧪 Testing Address Parser\n');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

testAddresses.forEach((testCase, index) => {
  console.log(`\n${index + 1}. Testing: ${testCase.name}`);
  console.log(`   Address: ${JSON.stringify(testCase.address)}`);
  
  const result = addressMapper.parseShopifyAddress(testCase.address);
  
  if (!result) {
    console.log(`   ❌ Result: NULL (parsing failed)`);
    console.log(`   Expected: ${JSON.stringify(testCase.expected)}`);
    failed++;
    return;
  }
  
  const isValid = addressMapper.isValidMapping(result);
  const matches = 
    result.building_id === testCase.expected.building_id &&
    result.road_id === testCase.expected.road_id &&
    result.block_id === testCase.expected.block_id &&
    result.flat_number === testCase.expected.flat_number;
  
  console.log(`   Result: ${JSON.stringify(result)}`);
  console.log(`   Valid Mapping: ${isValid ? '✅' : '❌'}`);
  console.log(`   Matches Expected: ${matches ? '✅' : '❌'}`);
  
  if (!matches) {
    console.log(`   Expected: ${JSON.stringify(testCase.expected)}`);
  }
  
  if (matches && isValid) {
    passed++;
  } else {
    failed++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Summary:`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);

// Test the problematic address from the error
console.log('\n🔍 Testing problematic address from error log:');
const problematicAddress = {
  address1: 'Building: 2733, Road: 3953,',
  address2: '21',
  city: 'Al Hajiyat',
  zip: '939',
};

const parsed = addressMapper.parseShopifyAddress(problematicAddress);
console.log(`   Parsed result: ${JSON.stringify(parsed)}`);
console.log(`   Is valid: ${addressMapper.isValidMapping(parsed)}`);

if (!parsed || !addressMapper.isValidMapping(parsed)) {
  console.log(`   ⚠️  Issue: Block is missing from address`);
  console.log(`   💡 Solution: Customer address must include Block number`);
  console.log(`      Example: "Building: 2733, Road: 3953, Block: 939"`);
}

process.exit(failed > 0 ? 1 : 0);
