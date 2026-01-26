/**
 * Pickup Location Service
 * Fetches pickup location from Shopify store address
 * Uses the store's configured address in Shopify as pickup location
 */

const shopifyClient = require('./shopifyClient');
const addressMapper = require('./addressMapper');
const addressIdMapper = require('./addressIdMapper');

class PickupLocationService {
  constructor() {
    // Cache pickup locations per shop to avoid repeated API calls
    this.pickupCache = new Map();
  }

  /**
   * Get pickup location for a Shopify store from Shopify store address
   * Uses the store's configured address in Shopify as pickup location
   * 
   * @param {string} shop - Shopify shop domain (e.g., 'store.myshopify.com')
   * @param {Object} session - Shopify session (optional, will fetch if not provided)
   * @returns {Promise<Object>} Pickup location configuration with IDs
   */
  async getPickupLocation(shop, session = null) {
    try {
      // Check cache first
      if (this.pickupCache.has(shop)) {
        const cached = this.pickupCache.get(shop);
        console.log(`Using cached pickup location for shop: ${shop}`);
        return cached;
      }

      console.log(`Fetching pickup location from Shopify store address for shop: ${shop}`);

      // Get Shopify session if not provided
      if (!session) {
        session = await shopifyClient.getSession(shop);
        if (!session) {
          throw new Error(`No Shopify session found for shop: ${shop}. Please install the app first.`);
        }
      }

      // Fetch shop information from Shopify API
      const shopInfo = await shopifyClient.getShop(session);
      
      if (!shopInfo) {
        throw new Error(`Could not fetch shop information from Shopify for shop: ${shop}`);
      }

      // Extract store address from Shopify shop info
      // Shopify shop object contains: address1, address2, city, province, zip, country
      const storeAddress = {
        address1: shopInfo.address1 || '',
        address2: shopInfo.address2 || '',
        city: shopInfo.city || '',
        zip: shopInfo.zip || '',
        province: shopInfo.province || '',
        country: shopInfo.country || '',
      };

      console.log(`Shopify store address:`, storeAddress);

      // Validate that store has an address configured
      if (!storeAddress.address1 && !storeAddress.city) {
        throw new Error(
          `Shop ${shop} does not have a store address configured in Shopify. ` +
          `Please configure the store address in Shopify Admin → Settings → Store details.`
        );
      }

      // Parse the store address to extract block/road/building numbers
      const addressNumbers = addressMapper.parseShopifyAddress(storeAddress);

      // For pickup location, we're more flexible - Block is required, Road is optional
      // If zip code is available, use it as Block number (common in Bahrain)
      if (!addressNumbers || !addressNumbers.block_number) {
        // Try to use zip code as Block if available
        if (storeAddress.zip && /^\d+$/.test(storeAddress.zip.trim())) {
          const zipAsBlock = parseInt(storeAddress.zip.trim());
          if (zipAsBlock > 0 && zipAsBlock < 10000) {
            console.log(`Using zip code ${zipAsBlock} as Block number for pickup location`);
            // Create a minimal address mapping with just Block from zip
            // Road will need to be looked up or we'll use a default
            const minimalMapping = {
              block_number: zipAsBlock,
              road_number: null, // Will need to be provided or looked up
              building_number: null,
              flat_number: 'N/A',
            };
            
            // If we still can't get Road, throw a helpful error
            throw new Error(
              `Could not parse store address for shop ${shop}. ` +
              `Store address must contain Road information. ` +
              `Received: ${storeAddress.address1}, ${storeAddress.city}, ${storeAddress.zip}. ` +
              `Using zip code ${zipAsBlock} as Block, but Road is still required. ` +
              `Expected format: "Building X, Road Y, Block Z" or "Road Y" in address fields. ` +
              `Please update the store address in Shopify Admin → Settings → Store details to include Road number.`
            );
          }
        }
        
        throw new Error(
          `Could not parse store address for shop ${shop}. ` +
          `Store address must contain Block and Road information in parseable format. ` +
          `Received: ${storeAddress.address1}, ${storeAddress.city}, ${storeAddress.zip}. ` +
          `Expected format: "Building X, Road Y, Block Z" or "Building: X, Road: Y, Block: Z" or similar. ` +
          `Please update the store address in Shopify Admin → Settings → Store details.`
        );
      }
      
      // Road is required for pickup location
      if (!addressNumbers.road_number) {
        throw new Error(
          `Could not parse Road number from store address for shop ${shop}. ` +
          `Store address must contain Road information. ` +
          `Received: ${storeAddress.address1}, ${storeAddress.city}, ${storeAddress.zip}. ` +
          `Block found: ${addressNumbers.block_number}, but Road is missing. ` +
          `Please update the store address in Shopify Admin → Settings → Store details to include Road number.`
        );
      }

      console.log(`Parsed address numbers: Block ${addressNumbers.block_number}, Road ${addressNumbers.road_number}, Building ${addressNumbers.building_number || 'N/A'}`);

      // Extract area name from address2 first (often contains area like "Ras Ruman"), then fallback to city
      // Example: address2: "Block 306, Ras Ruman" -> area is "Ras Ruman"
      let areaName = null;
      if (storeAddress.address2) {
        // Try to extract area name from address2 (common format: "Block 306, Ras Ruman")
        const address2Parts = storeAddress.address2.split(',').map(p => p.trim());
        // Look for parts that don't contain block/road/building numbers (likely area name)
        const areaParts = address2Parts.filter(part => {
          const lower = part.toLowerCase();
          return !lower.match(/\b(block|road|building|blk|rd|bldg)\s*:?\s*\d+/i) && 
                 !/^\d+$/.test(part) && // Not just a number
                 part.length > 2; // Not too short
        });
        if (areaParts.length > 0) {
          areaName = areaParts.join(' ').trim();
          console.log(`Extracted area name from address2: "${areaName}"`);
        }
      }
      
      // Fallback to city if no area found in address2
      if (!areaName && storeAddress.city) {
        areaName = storeAddress.city.trim();
        console.log(`Using city as area name: "${areaName}"`);
      }

      // Convert address numbers to Delybell IDs
      console.log(`Converting address numbers to Delybell IDs...`);
      const addressIds = await addressIdMapper.convertNumbersToIds(addressNumbers, areaName);

      console.log(`Mapped to Delybell IDs: Block ID ${addressIds.block_id}, Road ID ${addressIds.road_id}, Building ID ${addressIds.building_id || 'N/A'}`);

      // Build formatted address string
      const addressParts = [];
      if (addressNumbers.building_number) addressParts.push(`Building ${addressNumbers.building_number}`);
      if (addressNumbers.road_number) addressParts.push(`Road ${addressNumbers.road_number}`);
      if (addressNumbers.block_number) addressParts.push(`Block ${addressNumbers.block_number}`);
      if (storeAddress.city) addressParts.push(storeAddress.city);
      const formattedAddress = addressParts.join(', ');

      // Build pickup config object
      const pickupConfig = {
        shop: shop,
        address: formattedAddress,
        block_id: addressIds.block_id,
        road_id: addressIds.road_id,
        building_id: addressIds.building_id || null,
        block_number: addressNumbers.block_number,
        road_number: addressNumbers.road_number,
        building_number: addressNumbers.building_number || null,
        customer_name: shopInfo.name || 
          process.env.DEFAULT_PICKUP_CUSTOMER_NAME || 
          'Store',
        mobile_number: shopInfo.phone || 
          process.env.DEFAULT_PICKUP_MOBILE_NUMBER || 
          '+97300000000',
        fromShopify: true, // Flag to indicate this came from Shopify
      };

      // Cache the pickup location
      this.pickupCache.set(shop, pickupConfig);

      console.log(`Fetched pickup location from Shopify store address for shop ${shop}:`);
      console.log(`   Address: ${pickupConfig.address}`);
      console.log(`   Block ID: ${pickupConfig.block_id}, Road ID: ${pickupConfig.road_id}, Building ID: ${pickupConfig.building_id || 'N/A'}`);

      return pickupConfig;
    } catch (error) {
      console.error(`Error fetching pickup location for shop ${shop}:`, error.message);
      throw error;
    }
  }

  /**
   * Clear pickup location cache for a specific shop
   * Useful when store address is updated in Shopify
   * 
   * @param {string} shop - Shopify shop domain
   */
  clearCache(shop) {
    if (shop) {
      this.pickupCache.delete(shop);
      console.log(`Cleared pickup location cache for shop: ${shop}`);
    } else {
      this.pickupCache.clear();
      console.log(`Cleared all pickup location cache`);
    }
  }

  /**
   * Get all cached pickup locations (for debugging)
   * @returns {Array} Array of cached pickup locations
   */
  getCachedLocations() {
    return Array.from(this.pickupCache.entries()).map(([shop, config]) => ({
      shop,
      ...config,
    }));
  }
}

module.exports = new PickupLocationService();
