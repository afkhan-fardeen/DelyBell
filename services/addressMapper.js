/**
 * Address Mapper Service
 * Maps Shopify addresses to Delybell structured address format
 * Extracts block_number, road_number, building_number from address strings
 * 
 * This service extracts human-readable numbers, not Delybell IDs.
 * Numbers must be looked up in Delybell master data to get corresponding IDs.
 * 
 * Example:
 *   Address: "Block 929, Road 3953, Building 2733"
 *   Returns: { block_number: 929, road_number: 3953, building_number: 2733 }
 *   NOT:     { block_id: 929, road_id: 3953, building_id: 2733 }
 */

class AddressMapper {
  /**
   * Parse Shopify address to extract structured components
   * Attempts to extract block, road, building NUMBERS (not IDs) from address fields
   * 
   * Supports formats like:
   * - "Building 134, Road 354, Block 306"
   * - "Block 306, Road 354, Building 134"
   * - "Bldg 134, Rd 354, Blk 306"
   * - "Building: 2733, Road: 3953" (with zip code as Block - common in Bahrain)
   * - Address1: "Building 134", Address2: "Road 354", City: "Block 306"
   * 
   * Note: In some countries (like Bahrain), postal code IS the block number.
   * If Block is not found in address text, zip code will be automatically used as Block.
   * 
   * @param {Object} address - Shopify address object
   * @returns {Object|null} Mapping object with block_number, road_number, building_number, flat_number or null if cannot parse
   */
  parseShopifyAddress(address) {
    if (!address) return null;

    const address1 = (address.address1 || '').trim();
    const address2 = (address.address2 || '').trim();
    const city = (address.city || '').trim();
    const zip = (address.zip || '').trim();
    
    // Combine all address fields for parsing (preserve case for better matching)
    const fullAddress = `${address1} ${address2} ${city} ${zip}`;
    const fullAddressLower = fullAddress.toLowerCase();

    let blockId = null;
    let roadId = null;
    let buildingId = null;
    let flatNumber = 'N/A';

    // Pattern: Block 306, Road 354, Building 134
    // Also handles: Building: 2733, Road: 3953 (with colons)
    // Try to extract block number (multiple patterns)
    const blockPatterns = [
      /\bblock\s*:?\s*(\d+)\b/i,           // "Block 306" or "Block: 306"
      /\bblk\s*:?\s*(\d+)\b/i,              // "Blk 306" or "Blk: 306"
      /\bblock\s*no\.?\s*:?\s*(\d+)\b/i,   // "Block No. 306" or "Block No.: 306"
      /\bblock\s*number\s*:?\s*(\d+)\b/i,  // "Block Number 306"
    ];
    
    for (const pattern of blockPatterns) {
      const match = fullAddressLower.match(pattern);
      if (match) {
        blockId = parseInt(match[1]);
        break;
      }
    }

    // Try to extract road number (multiple patterns)
    const roadPatterns = [
      /\broad\s*:?\s*(\d+)\b/i,             // "Road 354" or "Road: 354"
      /\brd\s*:?\s*(\d+)\b/i,               // "Rd 354" or "Rd: 354"
      /\broad\s*no\.?\s*:?\s*(\d+)\b/i,     // "Road No. 354" or "Road No.: 354"
      /\broad\s*number\s*:?\s*(\d+)\b/i,   // "Road Number 354"
    ];
    
    for (const pattern of roadPatterns) {
      const match = fullAddressLower.match(pattern);
      if (match) {
        roadId = parseInt(match[1]);
        break;
      }
    }

    // Try to extract building number (multiple patterns)
    const buildingPatterns = [
      /\bbuilding\s*:?\s*(\d+)\b/i,         // "Building 134" or "Building: 134"
      /\bbldg\s*:?\s*(\d+)\b/i,             // "Bldg 134" or "Bldg: 134"
      /\bbuilding\s*no\.?\s*:?\s*(\d+)\b/i, // "Building No. 134" or "Building No.: 134"
      /\bbuilding\s*number\s*:?\s*(\d+)\b/i, // "Building Number 134"
    ];
    
    for (const pattern of buildingPatterns) {
      const match = fullAddressLower.match(pattern);
      if (match) {
        buildingId = parseInt(match[1]);
        break;
      }
    }

    // Try to extract flat/office number
    // ❌ Never guess building from "flat" - only extract if explicitly stated
    const flatPatterns = [
      /\bflat\s*:?\s*(\w+)\b/i,            // "Flat 12" or "Flat: 12"
      /\bapt\s*:?\s*(\w+)\b/i,              // "Apt 12" or "Apt: 12"
      /\bapartment\s*:?\s*(\w+)\b/i,        // "Apartment 12"
      /\bunit\s*:?\s*(\w+)\b/i,             // "Unit 12"
      /#\s*(\w+)\b/i,                        // "#12"
    ];
    
    for (const pattern of flatPatterns) {
      const match = fullAddressLower.match(pattern);
      if (match) {
        flatNumber = match[1];
        break;
      }
    }
    
    // ❌ Never guess building from flat number - removed guessing logic
    // Only use flat number if explicitly stated in address text

    // If Block is missing but we have Road and Building, try to extract Block from city/zip
    // Sometimes Block is in city field or zip code
    if (!blockId && roadId) {
      // Try to extract block from city field (e.g., "Block 306" or "Blk 306")
      const cityBlockPatterns = [
        /\bblock\s*:?\s*(\d+)\b/i,
        /\bblk\s*:?\s*(\d+)\b/i,
      ];
      
      for (const pattern of cityBlockPatterns) {
        const match = city.toLowerCase().match(pattern);
        if (match) {
          blockId = parseInt(match[1]);
          break;
        }
      }
      
      // If still no block, use zip code as block number
      // In some countries (like Bahrain), postal code IS the block number
      if (!blockId && zip && /^\d+$/.test(zip.trim())) {
        const zipNum = parseInt(zip.trim());
        // Use zip as block if it's a reasonable number (typically 1-10000 range)
        if (zipNum > 0 && zipNum < 10000) {
          blockId = zipNum;
          console.log(`Using zip code ${zipNum} as Block number (common in Bahrain and similar countries)`);
        }
      }
    }

    // If we found block, return the mapping (Road and Building are optional)
    // Return numbers, not IDs. IDs must be looked up separately.
    if (blockId) {
      return {
        block_number: blockId,      // Human-readable block number (e.g., 929) - MANDATORY
        road_number: roadId || null, // Human-readable road number (e.g., 3953) - OPTIONAL
        building_number: buildingId || null, // Human-readable building number (e.g., 2733) - OPTIONAL
        flat_number: flatNumber,     // Flat/office number (string)
      };
    }

    // Could not parse - return null
    // Log what we tried to parse for debugging
    const parsedComponents = {
      blockId: blockId || 'NOT FOUND',
      roadId: roadId || 'NOT FOUND',
      buildingId: buildingId || 'NOT FOUND',
      flatNumber: flatNumber,
    };
    
    // Final check: Block is mandatory, Road and Building are optional
    if (!blockId) {
      console.warn('Could not parse address:', {
        address1,
        address2,
        city,
        zip,
        fullAddress: fullAddress.substring(0, 100),
        parsedComponents,
        note: 'Block is required. If zip code is the block number, ensure zip code is provided.',
      });
      console.warn(`Block is required for Delybell order syncing. Road and Building are optional.`);
    } else if (!roadId) {
      // Block found but Road missing - this is OK, just log info
      console.log(`Block ${blockId} found, but Road is missing (Road is optional - order will still sync)`);
    }
    
    return null;
  }

  /**
   * Validate that address mapping is complete
   * @param {Object} mapping - Address mapping object
   * @returns {boolean} True if mapping is valid (has block_number - Road is optional)
   */
  isValidMapping(mapping) {
    return mapping && 
           typeof mapping.block_number === 'number' && 
           mapping.block_number > 0;
    // Road and Building are optional - only Block is mandatory
  }

  /**
   * Get Company pickup address configuration
   * This is hardcoded to match the company's registered Delybell address
   * Used for ALL Shopify stores - this is the company's pickup location
   * 
   * Address Mapping:
   * - Block Number: 306 → Block ID: 1
   * - Road Number: 114 → Road ID: 114
   * - Building Number: 417 → Building ID: 417
   * - Area: Ras Ruman
   * 
   * @returns {Object} Company pickup configuration with numbers and IDs
   */
  getBabybowPickupConfig() {
    return {
      address: 'Building 417, Road 114, Block 306, Ras Ruman',
      // Human-readable numbers (from address)
      block_number: 306,
      road_number: 114,
      building_number: 417,
      // Delybell IDs (from registration - these are known and fixed)
      // Block Number 306 → Block ID 1
      // Road Number 114 → Road ID 114
      // Building Number 417 → Building ID 417
      block_id: 1,        // Block ID for Block Number 306
      road_id: 114,      // Road ID for Road Number 114
      building_id: 417,   // Building ID for Building Number 417
      customer_name: process.env.DEFAULT_PICKUP_CUSTOMER_NAME || 'Company',
      mobile_number: process.env.DEFAULT_PICKUP_MOBILE_NUMBER || '+97300000000',
    };
  }
}

module.exports = new AddressMapper();
