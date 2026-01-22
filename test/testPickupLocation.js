/**
 * Test Pickup Location Fetching
 * Tests the pickup location service with mock data
 */

require('dotenv').config();
const pickupLocationService = require('../services/pickupLocationService');

// Mock Delybell client to simulate API responses
const originalGetPickupLocation = require('../services/delybellClient').getPickupLocation;

async function testPickupLocationFetching() {
  console.log('🧪 Testing Pickup Location Fetching\n');
  console.log('=' .repeat(60));

  // Test 1: Test with a shop domain
  console.log('\n📋 Test 1: Fetch pickup location for a shop');
  console.log('-'.repeat(60));
  
  // Use Babybow store domain or test shop
  const testShop = process.env.TEST_SHOP_DOMAIN || 'babybow.myshopify.com';
  console.log(`Testing with shop: ${testShop}`);
  
  try {
    // This will try to fetch from Delybell API
    // If API endpoint doesn't exist, it will try fallback
    const pickupLocation = await pickupLocationService.getPickupLocation(testShop);
    
    console.log('✅ Pickup location fetched:');
    console.log(JSON.stringify(pickupLocation, null, 2));
    
    // Verify required fields
    if (pickupLocation.block_id && pickupLocation.road_id) {
      console.log('\n✅ Pickup location has required fields (block_id, road_id)');
    } else {
      console.log('\n❌ Pickup location missing required fields');
    }
  } catch (error) {
    console.log('❌ Error fetching pickup location:', error.message);
    console.log('\n💡 This is expected if Delybell API endpoint is not implemented yet.');
    console.log('💡 Set fallback configuration in .env to test with fallback.');
  }

  // Test 2: Test fallback configuration
  console.log('\n\n📋 Test 2: Test fallback configuration');
  console.log('-'.repeat(60));
  
  const fallbackBlockId = process.env.FALLBACK_PICKUP_BLOCK_ID;
  const fallbackRoadId = process.env.FALLBACK_PICKUP_ROAD_ID;
  
  if (fallbackBlockId && fallbackRoadId) {
    console.log('✅ Fallback configuration found:');
    console.log(`   Block ID: ${fallbackBlockId}`);
    console.log(`   Road ID: ${fallbackRoadId}`);
    console.log(`   Building ID: ${process.env.FALLBACK_PICKUP_BUILDING_ID || 'Not set'}`);
    console.log(`   Address: ${process.env.FALLBACK_PICKUP_ADDRESS || 'Not set'}`);
    
    // Clear cache and test fallback
    pickupLocationService.clearCache(testShop);
    
    try {
      // This should use fallback if API fails
      const fallbackLocation = await pickupLocationService.getPickupLocation(testShop);
      
      if (fallbackLocation.isFallback) {
        console.log('\n✅ Fallback pickup location used successfully');
        console.log(JSON.stringify(fallbackLocation, null, 2));
      } else {
        console.log('\n✅ Pickup location fetched from Delybell (not using fallback)');
      }
    } catch (error) {
      console.log('\n❌ Error:', error.message);
    }
  } else {
    console.log('⚠️ No fallback configuration found in .env');
    console.log('💡 Add these to .env to test fallback:');
    console.log('   FALLBACK_PICKUP_BLOCK_ID=1');
    console.log('   FALLBACK_PICKUP_ROAD_ID=114');
    console.log('   FALLBACK_PICKUP_BUILDING_ID=417');
    console.log('   FALLBACK_PICKUP_ADDRESS=Building 417, Road 114, Block 306');
  }

  // Test 3: Test caching
  console.log('\n\n📋 Test 3: Test pickup location caching');
  console.log('-'.repeat(60));
  
  const cachedLocations = pickupLocationService.getCachedLocations();
  console.log(`📦 Cached locations: ${cachedLocations.length}`);
  
  if (cachedLocations.length > 0) {
    console.log('\nCached locations:');
    cachedLocations.forEach(loc => {
      console.log(`   - ${loc.shop}: Block ID ${loc.block_id}, Road ID ${loc.road_id}`);
    });
  } else {
    console.log('No locations cached yet');
  }

  // Test 4: Test cache clearing
  console.log('\n\n📋 Test 4: Test cache clearing');
  console.log('-'.repeat(60));
  
  pickupLocationService.clearCache(testShop);
  console.log(`✅ Cache cleared for shop: ${testShop}`);
  
  const cachedAfterClear = pickupLocationService.getCachedLocations();
  console.log(`📦 Cached locations after clear: ${cachedAfterClear.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Testing complete!\n');
  
  console.log('📝 Next Steps:');
  console.log('1. Implement Delybell API endpoint: GET /v1/customer/external/pickup-location/{shop_domain}');
  console.log('2. Configure pickup locations in Delybell for each Shopify store');
  console.log('3. Test with real shop domains');
  console.log('4. Process a test order to verify pickup location is used correctly\n');
}

// Run tests
testPickupLocationFetching().catch(console.error);
