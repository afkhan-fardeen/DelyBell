/**
 * Address ID Mapper Service
 * Maps human-readable address numbers to Delybell internal IDs
 * 
 * In Bahrain addresses, numbers and IDs are different:
 * - Block Number (929) ≠ Block ID (370)
 * - Road Number (3953) ≠ Road ID (XXXX)
 * - Building Number (2733) ≠ Building ID (YYYY)
 * 
 * This service performs the lookup from numbers to IDs using Delybell master data.
 */

const delybellClient = require('./delybellClient');

class AddressIdMapper {
  /**
   * Find Block ID from Block Number
   * Searches Delybell blocks for a block with matching code/number and optionally area name
   * 
   * @param {number} blockNumber - Human-readable block number (e.g., 929)
   * @param {string} areaName - Optional area name from shipping_address.city (e.g., "Ras Ruman")
   * @returns {Promise<number|null>} Block ID (e.g., 370) or null if not found
   */
  async findBlockId(blockNumber, areaName = null) {
    try {
      console.log(`Looking up Block ID for Block Number: ${blockNumber}${areaName ? `, Area: ${areaName}` : ''}`);
      
      // Get all blocks from Delybell
      const blocksResponse = await delybellClient.getBlocks();
      const blocks = blocksResponse?.data || [];
      
      if (!Array.isArray(blocks) || blocks.length === 0) {
        console.warn('No blocks found in Delybell master data');
        return null;
      }
      
      // Normalize area name for matching (lowercase, trim)
      const normalizedAreaName = areaName ? areaName.toLowerCase().trim() : null;
      
      // Try to find block by code field AND area name (if provided)
      // Match by code AND name contains area name
      const blockByCodeAndArea = blocks.find(block => {
        // Check if block has a code field that matches
        const codeMatches = block.code && String(block.code) === String(blockNumber);
        
        if (!codeMatches) {
          return false;
        }
        
        // If area name provided, also check if block name contains it
        if (normalizedAreaName && block.name) {
          const blockNameLower = block.name.toLowerCase();
          return blockNameLower.includes(normalizedAreaName);
        }
        
        // If no area name provided, just match by code
        return true;
      });
      
      if (blockByCodeAndArea) {
        console.log(`Found Block ID ${blockByCodeAndArea.id} for Block Number ${blockNumber}${areaName ? `, Area: ${areaName}` : ''} (matched by code${areaName ? ' and area name' : ''})`);
        return blockByCodeAndArea.id;
      }
      
      // Fallback: Try to find block by code only (if area name didn't match or wasn't provided)
      // This is important because area names might not match exactly (e.g., "Manama" vs "Ras Ruman")
      const blockByCode = blocks.find(block => {
        return block.code && String(block.code) === String(blockNumber);
      });
      
      if (blockByCode) {
        if (normalizedAreaName) {
          // Area was provided but didn't match - log warning but still return the block
          console.warn(`Block Number ${blockNumber} found by code, but area "${normalizedAreaName}" didn't match block name "${blockByCode.name}". Using block anyway.`);
        }
        console.log(`Found Block ID ${blockByCode.id} for Block Number ${blockNumber} (matched by code only)`);
        return blockByCode.id;
      }
      
      // Fallback: Try to extract number from name (e.g., "BLK 457" or "Block 929")
      const blockByName = blocks.find(block => {
        if (!block.name) return false;
        
        // Try patterns like "BLK 457", "Block 929", "929", etc.
        const nameLower = block.name.toLowerCase();
        const patterns = [
          new RegExp(`\\b${blockNumber}\\b`),           // Exact number match
          new RegExp(`blk\\s*:?\\s*${blockNumber}\\b`, 'i'),  // "BLK 929"
          new RegExp(`block\\s*:?\\s*${blockNumber}\\b`, 'i'), // "Block 929"
        ];
        
        return patterns.some(pattern => pattern.test(nameLower));
      });
      
      if (blockByName) {
        console.log(`Found Block ID ${blockByName.id} for Block Number ${blockNumber} (matched by name: "${blockByName.name}")`);
        return blockByName.id;
      }
      
      // Not found
      console.error(`Block Number ${blockNumber} not found in Delybell master data`);
      console.log(`   Available blocks (first 10): ${blocks.slice(0, 10).map(b => `${b.name || 'N/A'} (ID: ${b.id}${b.code ? `, Code: ${b.code}` : ''})`).join(', ')}`);
      return null;
    } catch (error) {
      console.error(`Error looking up Block ID for Block Number ${blockNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Find Road ID from Road Number within a Block
   * Searches Delybell roads for a road with matching number/name within the specified block
   * 
   * @param {number} blockId - Block ID (from findBlockId)
   * @param {number} roadNumber - Human-readable road number (e.g., 3953)
   * @returns {Promise<number|null>} Road ID or null if not found
   */
  async findRoadId(blockId, roadNumber) {
    try {
      console.log(`Looking up Road ID for Road Number: ${roadNumber} in Block ID: ${blockId}`);
      
      // Get all roads for this block
      const roadsResponse = await delybellClient.getRoads(blockId);
      const roads = roadsResponse?.data || [];
      
      if (!Array.isArray(roads) || roads.length === 0) {
        console.warn(`No roads found for Block ID ${blockId}`);
        return null;
      }
      
      // Try to find road by code field (if it exists)
      const roadByCode = roads.find(road => {
        if (road.code && String(road.code) === String(roadNumber)) {
          return true;
        }
        return false;
      });
      
      if (roadByCode) {
        console.log(`Found Road ID ${roadByCode.id} for Road Number ${roadNumber} (matched by code)`);
        return roadByCode.id;
      }
      
      // Fallback: Try to extract number from name (e.g., "Road 3953", "3953", etc.)
      const roadByName = roads.find(road => {
        if (!road.name) return false;
        
        const nameLower = road.name.toLowerCase();
        const patterns = [
          new RegExp(`\\b${roadNumber}\\b`),           // Exact number match
          new RegExp(`road\\s*:?\\s*${roadNumber}\\b`, 'i'),  // "Road 3953"
          new RegExp(`rd\\s*:?\\s*${roadNumber}\\b`, 'i'),     // "Rd 3953"
        ];
        
        return patterns.some(pattern => pattern.test(nameLower));
      });
      
      if (roadByName) {
        console.log(`Found Road ID ${roadByName.id} for Road Number ${roadNumber} (matched by name: "${roadByName.name}")`);
        return roadByName.id;
      }
      
      // Not found
      console.error(`Road Number ${roadNumber} not found in Block ID ${blockId}`);
      console.log(`   Available roads (first 10): ${roads.slice(0, 10).map(r => `${r.name || 'N/A'} (ID: ${r.id}${r.code ? `, Code: ${r.code}` : ''})`).join(', ')}`);
      return null;
    } catch (error) {
      console.error(`Error looking up Road ID for Road Number ${roadNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Find Building ID from Building Number within a Road/Block
   * Searches Delybell buildings for a building with matching number/name
   * 
   * @param {number} blockId - Block ID
   * @param {number} roadId - Road ID
   * @param {number} buildingNumber - Human-readable building number (e.g., 2733)
   * @returns {Promise<number|null>} Building ID or null if not found
   */
  async findBuildingId(blockId, roadId, buildingNumber) {
    if (!buildingNumber) {
      return null; // Building is optional
    }
    
    try {
      console.log(`Looking up Building ID for Building Number: ${buildingNumber} in Block ID: ${blockId}, Road ID: ${roadId}`);
      
      // Get all buildings for this road/block
      const buildingsResponse = await delybellClient.getBuildings(roadId, blockId);
      const buildings = buildingsResponse?.data || [];
      
      if (!Array.isArray(buildings) || buildings.length === 0) {
        console.warn(`No buildings found for Block ID ${blockId}, Road ID ${roadId}`);
        return null; // Building is optional, so return null instead of error
      }
      
      // Try to find building by code field (if it exists)
      const buildingByCode = buildings.find(building => {
        if (building.code && String(building.code) === String(buildingNumber)) {
          return true;
        }
        return false;
      });
      
      if (buildingByCode) {
        console.log(`Found Building ID ${buildingByCode.id} for Building Number ${buildingNumber} (matched by code)`);
        return buildingByCode.id;
      }
      
      // Fallback: Try to extract number from name
      const buildingByName = buildings.find(building => {
        if (!building.name) return false;
        
        const nameLower = building.name.toLowerCase();
        const patterns = [
          new RegExp(`\\b${buildingNumber}\\b`),                    // Exact number match
          new RegExp(`building\\s*:?\\s*${buildingNumber}\\b`, 'i'), // "Building 2733"
          new RegExp(`bldg\\s*:?\\s*${buildingNumber}\\b`, 'i'),     // "Bldg 2733"
        ];
        
        return patterns.some(pattern => pattern.test(nameLower));
      });
      
      if (buildingByName) {
        console.log(`Found Building ID ${buildingByName.id} for Building Number ${buildingNumber} (matched by name: "${buildingByName.name}")`);
        return buildingByName.id;
      }
      
      // Not found - but building is optional, so just warn
      console.warn(`Building Number ${buildingNumber} not found in Block ID ${blockId}, Road ID ${roadId} (building is optional)`);
      return null;
    } catch (error) {
      console.warn(`Error looking up Building ID for Building Number ${buildingNumber}:`, error.message);
      // Building is optional, so don't throw error
      return null;
    }
  }

  /**
   * Convert address numbers to Delybell IDs
   * Performs the complete lookup chain: Block Number → Block ID → Road ID → Building ID
   * 
   * @param {Object} addressNumbers - Object with block_number, road_number, building_number, area_name (optional)
   * @param {string} areaName - Optional area name from shipping_address.city (e.g., "Ras Ruman")
   * @returns {Promise<Object>} Object with block_id, road_id, building_id
   */
  async convertNumbersToIds(addressNumbers, areaName = null) {
    const { block_number, road_number, building_number } = addressNumbers;
    
    if (!block_number || !road_number) {
      throw new Error('block_number and road_number are required');
    }
    
    // Use areaName from addressNumbers if provided, otherwise use parameter
    const areaNameToUse = addressNumbers.area_name || areaName;
    
    // Step 1: Find Block ID from Block Number and Area Name
    const blockId = await this.findBlockId(block_number, areaNameToUse);
    if (!blockId) {
      const areaHint = areaNameToUse ? ` in area "${areaNameToUse}"` : '';
      throw new Error(
        `Block Number ${block_number}${areaHint} not found in Delybell master data. ` +
        `Please verify the block number${areaHint ? ' and area name' : ''} is correct.`
      );
    }
    
    // Step 2: Find Road ID from Road Number within that Block
    const roadId = await this.findRoadId(blockId, road_number);
    if (!roadId) {
      throw new Error(
        `Road Number ${road_number} not found in Block ${block_number} (Block ID: ${blockId}). ` +
        `Please verify the road number is correct for this block.`
      );
    }
    
    // Step 3: Find Building ID from Building Number (optional)
    const buildingId = building_number 
      ? await this.findBuildingId(blockId, roadId, building_number)
      : null;
    
    return {
      block_id: blockId,
      road_id: roadId,
      building_id: buildingId,
    };
  }
}

module.exports = new AddressIdMapper();
