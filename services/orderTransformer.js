/**
 * Order Transformer Service
 * Transforms Shopify order data to Delybell API format
 * Converts human-readable address numbers to Delybell IDs by looking them up in master data
 */

const addressMapper = require('./addressMapper');
const addressIdMapper = require('./addressIdMapper');
const pickupLocationService = require('./pickupLocationService');

class OrderTransformer {
  /**
   * Transform Shopify order to Delybell order format
   * @param {Object} shopifyOrder - Shopify order object
   * @param {Object} mappingConfig - Configuration for mapping Shopify fields to Delybell fields
   * @param {string} shop - Shopify shop domain (e.g., 'store.myshopify.com') - used to fetch pickup location
   * @returns {Promise<Object>} Delybell order format
   */
  async transformShopifyToDelybell(shopifyOrder, mappingConfig = {}, shop = null) {
    // Extract shipping address (destination) - fallback to billing if missing
    const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
    
    // Extract billing address (pickup/sender)
    const billingAddress = shopifyOrder.billing_address;
    
    // Validate mandatory fields
    if (!shippingAddress) {
      throw new Error('Order must have a shipping address or billing address');
    }

    // Pickup address is fetched from Shopify store address
    // Every Shopify store has a store address configured in Shopify settings
    // We use that address as the pickup location
    
    // Get shop domain from order or parameter
    const shopDomain = shop || shopifyOrder.shop || mappingConfig.shop;
    
    if (!shopDomain) {
      throw new Error(
        'Shop domain is required to fetch pickup location from Shopify store address. ' +
        'The app uses the store address configured in Shopify settings as pickup location.'
      );
    }

    // Get Shopify session from mappingConfig (passed from orderProcessor)
    const session = mappingConfig.session || null;

    // Fetch pickup location from Shopify store address
    console.log(`Fetching pickup location from Shopify store address for shop: ${shopDomain}`);
    const pickupConfig = await pickupLocationService.getPickupLocation(shopDomain, session);
    
    console.log(`Using pickup location from Shopify store address for shop ${shopDomain}:`);
    console.log(`   Address: ${pickupConfig.address}`);
    console.log(`   Block ID: ${pickupConfig.block_id}, Road ID: ${pickupConfig.road_id}, Building ID: ${pickupConfig.building_id || 'N/A'}`);

    // Destination address mapping comes from Shopify address
    // Default destination values are only allowed for test endpoints
    // For real orders, we parse the Shopify shipping address and lookup IDs
    
    let destinationIds; // Will contain block_id, road_id, building_id
    let flatNumber = 'N/A'; // Flat number from parsed address
    
    if (mappingConfig.destination && mappingConfig.destination.block_id && mappingConfig.destination.road_id) {
      // This is from test endpoint - use provided IDs directly (already looked up)
      console.log('Using provided destination IDs (test mode)');
      destinationIds = {
        block_id: mappingConfig.destination.block_id,
        road_id: mappingConfig.destination.road_id,
        building_id: mappingConfig.destination.building_id || null,
      };
      flatNumber = mappingConfig.destination.flat_number || 'N/A';
    } else {
      // Real order - parse from Shopify address and lookup IDs
      console.log('Parsing destination address from Shopify shipping address...');
      const addressNumbers = addressMapper.parseShopifyAddress(shippingAddress);
      
      if (!addressMapper.isValidMapping(addressNumbers)) {
        const addressPreview = [
          shippingAddress.address1,
          shippingAddress.address2,
          shippingAddress.city,
        ].filter(Boolean).join(', ') || 'No address provided';
        
        // Check what was found vs what's missing
        const parsed = addressMapper.parseShopifyAddress(shippingAddress);
        let missingFields = [];
        if (!parsed || !parsed.block_number) missingFields.push('Block (required)');
        // Road and Building are optional - don't include in error
        
        const missingText = missingFields.length > 0 
          ? `Missing: ${missingFields.join(', ')}. ` 
          : '';
        
        throw new Error(
          `Cannot map destination address to Delybell structured format. ${missingText}` +
          'The shipping address must contain Block number in a parseable format. ' +
          `Received address: "${addressPreview}". ` +
          'Expected format: "Block Z" or "Building X, Road Y, Block Z" or similar. ' +
          'Block is required. Road and Building are optional - drivers will call customer if clarification is needed.'
        );
      }
      
      flatNumber = addressNumbers.flat_number || 'N/A';
      
      // Extract area name from shipping address city (e.g., "Ras Ruman", "Al Hajiyat")
      // This is used to disambiguate blocks with the same code number
      const areaName = shippingAddress.city ? shippingAddress.city.trim() : null;
      
      console.log(`Parsed address numbers: Block ${addressNumbers.block_number}${addressNumbers.road_number ? `, Road ${addressNumbers.road_number}` : ' (Road: not provided)'}${addressNumbers.building_number ? `, Building ${addressNumbers.building_number}` : ' (Building: not provided)'}${areaName ? `, Area: ${areaName}` : ''}`);
      
      // Convert numbers to Delybell IDs
      // Block Number (929) → Block ID (370) - matched by code AND area name (MANDATORY)
      // Road Number (3953) → Road ID (XXXX) - OPTIONAL but will be sent if found
      // Building Number (2733) → Building ID (YYYY) - OPTIONAL, can be null
      console.log('Looking up Delybell IDs from address numbers...');
      if (addressNumbers.road_number) {
        console.log(`Attempting to lookup Road ID for Road Number ${addressNumbers.road_number}...`);
      }
      destinationIds = await addressIdMapper.convertNumbersToIds(addressNumbers, areaName);
      
      console.log(`Mapped to Delybell IDs: Block ID ${destinationIds.block_id}${destinationIds.road_id ? `, Road ID ${destinationIds.road_id} (will be sent to Delybell)` : ' (Road ID: null - not found or not provided)'}${destinationIds.building_id ? `, Building ID ${destinationIds.building_id}` : ' (Building ID: null - optional)'}`);
    }

    // Calculate total weight from line items
    const totalWeight = this.calculateTotalWeight(shopifyOrder.line_items);

    // Build package details from line items
    const packageDetails = this.buildPackageDetails(shopifyOrder.line_items);

    // Build Delybell order object according to API specification
    // Simplified payload - only required fields
    const delybellOrder = {
      // Mandatory fields
      order_type: 1, // Domestic = 1, International = 2 (currently only Domestic is supported)
      service_type_id: mappingConfig.service_type_id || 1, // Provided by the List of Services API
      // Use Shopify long order ID for globally unique customer_input_order_id
      // This prevents Delybell from rejecting orders due to duplicate customer_input_order_id
      // Format: Use shopifyOrder.id (long ID like 10643266011430) instead of order_number (1019, 1020, etc.)
      // For retries, use retryCustomerInputOrderId from mappingConfig
      customer_input_order_id: mappingConfig.retryCustomerInputOrderId || shopifyOrder.id?.toString() || shopifyOrder.order_number?.toString(),
      
      // Destination (Recipient) Information
      destination_customer_name: shippingAddress?.name || 
        (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
          ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
          : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || 'Customer'),
      // ✅ Always send destination_mobile_number (MANDATORY)
      destination_mobile_number: shippingAddress?.phone || shopifyOrder.customer?.phone || '+97300000000',
      
      // Optional: Alternate number (only include if exists)
      ...(shippingAddress?.phone_alt && {
        destination_alternate_number: shippingAddress.phone_alt,
      }),
      
      // Structured address fields
      // VALIDATION FLOW (using Delybell Master Data APIs):
      // 1. ✅ Call /v1/customer/external/master/blocks → Find block_id
      // 2. ✅ Call /v1/customer/external/master/roads?block_id=X → Validate road
      // 3. ✅ Call /v1/customer/external/master/buildings?block_id=X&road_id=Y → Validate building
      // 
      // FINAL LOGIC:
      // ✅ Always send:
      //   - destination_block_id (MANDATORY - from master/blocks API)
      //   - destination_address (full free text, MANDATORY - preserves all original text)
      //   - destination_mobile_number (MANDATORY)
      //   - delivery_instructions (full raw text, MANDATORY - includes full address + notes)
      // ➖ Conditionally send:
      //   - destination_road_id → ONLY if road.code matches customer's road number in master data
      //   - destination_building_id → ONLY if building.code matches customer's building number in master data
      //   - destination_flat_or_office_number → For unit/flat/floor numbers (not building IDs)
      // ❌ Never:
      //   - Guess road from a number
      //   - Guess building from "flat"
      //   - Force mapping if master data doesn't match
      // 
      // SYSTEM PHILOSOPHY:
      // Structured IDs are optional helpers for routing.
      // Free-text address is the source of truth for delivery.
      // 
      // Example: Customer enters "Block 338, road 2392, near Adliya Post Office, flat 1"
      // - Call /master/roads?block_id=7 → Check if road code "2392" exists
      // - If road.code === "2392" → send destination_road_id
      // - If road.code !== "2392" → DON'T send destination_road_id
      // - BUT ALWAYS keep full text in delivery_instructions: "Block 338, road 2392, near Adliya Post Office, flat 1"
      // Result: Driver sees full address with landmarks, delivery works even if IDs don't match
      // 
      // If not valid → null (field not included in payload, but text preserved in delivery_instructions)
      destination_block_id: destinationIds.block_id, // ✅ ALWAYS SENT (MANDATORY - validated via /master/blocks)
      
      // ➖ Road ID: Only include if road.code matches customer's road number in master data
      // Validation: GET /master/roads?block_id=X → Check if road.code === roadNumber
      // If road doesn't exist in master data → null (field not sent, but road text preserved in delivery_instructions)
      ...(destinationIds.road_id ? { destination_road_id: destinationIds.road_id } : {}),
      
      // ➖ Building ID: Only include if building.code matches customer's building number in master data
      // Validation: GET /master/buildings?block_id=X&road_id=Y → Check if building.code === buildingNumber
      // If building doesn't exist in master data → null (field not sent, but building text preserved in delivery_instructions)
      // Building lookup requires valid roadId - only looks up if road is valid
      ...(destinationIds.building_id ? { destination_building_id: destinationIds.building_id } : {}),
      
      // Optional: Flat/Office number
      ...(flatNumber && flatNumber !== 'N/A' && {
        destination_flat_or_office_number: flatNumber,
      }),

      // ✅ Destination address (full free text, MANDATORY)
      // SYSTEM PHILOSOPHY: Free-text address is the source of truth for delivery
      // Structured IDs are optional helpers - they help with routing but are not required
      // 
      // ALWAYS preserve the FULL original address text from Shopify, including:
      // - Landmarks ("near Adliya Post Office")
      // - Notes and additional context
      // - All text exactly as customer entered it
      // 
      // This ensures:
      // - No data loss (even if road/building IDs aren't found)
      // - Drivers see full context (landmarks > road numbers in real life)
      // - Works with messy real-world data
      // - Avoids sync failures due to missing master data
      destination_address: (() => {
        // Build full address from original Shopify fields (preserve everything)
        const addressParts = [
          shippingAddress.address1,
          shippingAddress.address2,
          shippingAddress.city,
          shippingAddress.zip,
        ].filter(Boolean);
        
        // Always return the full original address text
        // This is the source of truth - drivers will use this for delivery
        return addressParts.length > 0 
          ? addressParts.join(', ')
          : 'Address not provided';
      })(),

      // ✅ Delivery instructions (full raw text, MANDATORY)
      // BEST PRACTICE: Always send delivery_instructions with full raw text
      // This ensures driver sees what customer typed even if structured fields fail
      // 
      // Include:
      // - Full address text (all fields combined)
      // - Customer notes (if any)
      // - Any additional context
      // 
      // This is critical because:
      // - If road/building IDs don't match master data, driver still sees the text
      // - Landmarks and notes are preserved
      // - No data loss even when structured validation fails
      delivery_instructions: (() => {
        const parts = [];
        
        // Always include full address text (raw, as customer entered it)
        const addressParts = [
          shippingAddress.address1,
          shippingAddress.address2,
          shippingAddress.city,
          shippingAddress.zip,
        ].filter(Boolean);
        
        if (addressParts.length > 0) {
          parts.push(addressParts.join(', '));
        }
        
        // Add customer notes if available
        if (shopifyOrder.note) {
          parts.push(`Note: ${shopifyOrder.note}`);
        } else if (shippingAddress?.note) {
          parts.push(`Note: ${shippingAddress.note}`);
        }
        
        // Return combined text, or default if empty
        return parts.length > 0 
          ? parts.join('. ')
          : 'Handle with care';
      })(),

      // Payment Information
      // Determine payment type based on Shopify order financial status
      ...(this.getPaymentFields(shopifyOrder)),

      // Package Details (mandatory)
      package_details: this.formatPackageDetails(packageDetails),
    };

    return delybellOrder;
  }

  /**
   * Calculate total weight from line items
   * @param {Array} lineItems - Shopify line items
   * @returns {number} Total weight in kg
   */
  calculateTotalWeight(lineItems) {
    if (!lineItems || lineItems.length === 0) {
      return 1; // Default weight if no items
    }

    return lineItems.reduce((total, item) => {
      // Shopify weight is typically in grams, convert to kg
      const itemWeight = item.grams ? item.grams / 1000 : item.weight || 0.5;
      return total + (itemWeight * item.quantity);
    }, 0);
  }

  /**
   * Build package details array from line items
   * @param {Array} lineItems - Shopify line items
   * @returns {Array} Package details array
   */
  buildPackageDetails(lineItems) {
    if (!lineItems || lineItems.length === 0) {
      return [{
        name: 'Order Package',
        quantity: 1,
        weight: 1,
        price: 0,
      }];
    }

    return lineItems.map(item => ({
      name: item.name || item.title || 'Product',
      quantity: item.quantity || 1,
      weight: item.grams ? item.grams / 1000 : item.weight || 0.5, // Convert grams to kg
      price: parseFloat(item.price) || 0,
      package_description: item.variant_title || item.sku || '',
    }));
  }

  /**
   * Format package details to match Delybell API format
   * @param {Array} packageDetails - Package details from buildPackageDetails
   * @returns {Array} Formatted package details for Delybell API
   */
  formatPackageDetails(packageDetails) {
    return packageDetails.map(pkg => ({
      weight: Math.max(1, Math.round(pkg.weight)), // Weight in kg (integer, minimum 1)
      package_description: pkg.package_description || pkg.name || 'Package',
      customer_input_package_value: Math.max(1, Math.round(pkg.price) || 1), // Package value (integer, minimum 1)
    }));
  }

  /**
   * Get pickup date based on cutoff rule (12:00 PM Bahrain time)
   * Orders placed before 12:00 PM → Same-day pickup
   * Orders placed after 12:00 PM → Next-day pickup
   * 
   * @param {string} preferredDate - Optional preferred date (YYYY-MM-DD format) to override cutoff logic
   * @returns {string} Pickup date in YYYY-MM-DD format
   */
  getPickupDate(preferredDate = null) {
    // If preferred date is provided, use it (for testing/override)
    if (preferredDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(preferredDate)) {
        console.log(`Using provided pickup date: ${preferredDate}`);
        return preferredDate;
      }
      console.warn(`Invalid pickup date format: ${preferredDate}. Using cutoff-based logic instead.`);
    }
    
    // Step 1: Generate pickup date based on cutoff rule
    const now = new Date();
    const bahrainTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bahrain" }));
    
    const hour = bahrainTime.getHours();
    const pickupDate = new Date(bahrainTime);
    
    if (hour >= 12) {
      pickupDate.setDate(pickupDate.getDate() + 1);
    }
    
    const formattedDate = pickupDate.toISOString().split("T")[0]; // YYYY-MM-DD
    console.log(`Pickup date calculated: ${formattedDate} (hour: ${hour}, ${hour >= 12 ? 'next-day' : 'same-day'})`);
    
    return formattedDate;
  }

  /**
   * Get pickup slot (default: Morning = 1)
   * Slot types: Morning = 1, Afternoon = 2, Evening = 3
   * 
   * @param {number} preferredSlot - Optional preferred slot (1, 2, or 3)
   * @returns {number} Pickup slot (1, 2, or 3)
   */
  getPickupSlot(preferredSlot = null) {
    // If preferred slot provided, use it
    if (preferredSlot !== null && [1, 2, 3].includes(parseInt(preferredSlot))) {
      return parseInt(preferredSlot);
    }
    
    // Default: Morning (1)
    const PICKUP_SLOT = parseInt(process.env.DEFAULT_PICKUP_SLOT_TYPE) || 1;
    return PICKUP_SLOT;
  }

  /**
   * Check if order is Cash on Delivery
   * @param {Object} shopifyOrder - Shopify order object
   * @returns {boolean} True if COD
   */
  isCOD(shopifyOrder) {
    // Check financial status
    if (shopifyOrder.financial_status === 'pending' || shopifyOrder.financial_status === 'authorized') {
      // Check payment gateway names
      const paymentGateways = shopifyOrder.payment_gateway_names || [];
      const codGateways = ['cod', 'cash on delivery', 'cash-on-delivery'];
      const gatewayName = paymentGateways[0]?.toLowerCase() || '';
      
      if (codGateways.some(cod => gatewayName.includes(cod))) {
        return true;
      }
      
      // If pending and no payment gateway specified, assume COD
      return true;
    }
    
    return false;
  }

  /**
   * Map Shopify address to Delybell structured address format
   * 
   * Delybell requires structured address format with separate fields:
   * - Block No (required)
   * - Road No (required)
   * - Building No (optional but recommended)
   * - Flat/Office Number (optional, can be value or "N/A")
   * 
   * Single-line addresses are not accepted and will cause auto-assignment failures.
   * 
   * @param {Object} address - Shopify address object
   * @param {Object} mappingConfig - Pre-configured mapping (block_id, road_id, building_id, flat_number)
   * @returns {Object} Delybell structured address mapping
   */
  mapAddressToDelybell(address, mappingConfig = {}) {
    // Extract flat number (can be value or "N/A")
    const flatNumber = mappingConfig.flat_number || this.extractFlatNumber(address) || 'N/A';
    
    // If mapping config provides required fields, use them
    if (mappingConfig.block_id && mappingConfig.road_id) {
      return {
        block_id: mappingConfig.block_id,
        road_id: mappingConfig.road_id,
        building_id: mappingConfig.building_id || null, // Optional
        flat_number: flatNumber,
      };
    }

    // TODO: Implement address lookup/mapping logic
    // This could involve:
    // 1. Searching Delybell's master APIs (blocks, roads, buildings) by address
    // 2. Using a mapping table/database
    // 3. Geocoding and matching coordinates
    // 4. Parsing Shopify address fields to extract block/road/building numbers
    
    // For now, return values from config (these MUST be configured)
    // Note: block_id and road_id are REQUIRED - validation happens at higher level
    return {
      block_id: mappingConfig.block_id,
      road_id: mappingConfig.road_id,
      building_id: mappingConfig.building_id || null,
      flat_number: flatNumber,
    };
  }

  /**
   * Extract flat number from address
   * Returns "N/A" if not found (as per Delybell format requirements)
   * @param {Object} address - Address object
   * @returns {string} Flat number or "N/A"
   */
  extractFlatNumber(address) {
    if (!address) return 'N/A';
    
    // Try to extract from address1 or address2
    const addressLine = address.address1 || address.address2 || '';
    const flatMatch = addressLine.match(/(?:flat|apt|apartment|unit|#)\s*([a-z0-9]+)/i);
    return flatMatch ? flatMatch[1] : 'N/A';
  }

  /**
   * Format address as string (for pickup/sender address)
   * @param {Object} address - Address object
   * @returns {string} Formatted address
   */
  formatAddress(address) {
    if (!address) return '';
    
    const parts = [
      address.address1,
      address.address2,
      address.city,
      address.province,
      address.zip,
      address.country,
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Format destination address for display purposes (optional field)
   * 
   * This field is for display/reference only. Delybell's routing engine uses the separate structured fields:
   * - destination_block_id
   * - destination_road_id
   * - destination_building_id
   * - destination_flat_or_office_number
   * 
   * This formatted string is not used for auto-assignment.
   * Single-line addresses should not be sent as the primary address.
   * 
   * @param {Object} address - Shopify shipping address object
   * @param {Object} mapping - Delybell address mapping (block_id, road_id, building_id)
   * @returns {string} Formatted destination address for display (optional field)
   */
  formatDestinationAddress(address, mapping) {
    if (!address) {
      throw new Error('Shipping address is required for order processing');
    }
    
    // Build structured address format: "Building X, Road Y, Block Z"
    // This format is required for Delybell's auto-assignment system
    // Single-line addresses will not work - orders will fail to be assigned to drivers
    const parts = [];
    
    // Priority 1: Use mapping IDs if provided (most reliable)
    if (mapping?.building_id) {
      parts.push(`Building ${mapping.building_id}`);
    }
    if (mapping?.road_id) {
      parts.push(`Road ${mapping.road_id}`);
    }
    if (mapping?.block_id) {
      parts.push(`Block ${mapping.block_id}`);
    }
    
    // If we have all mapping IDs, we have a proper structured address
    if (parts.length >= 3) {
      // Add flat/office number if available
      if (mapping?.flat_number) {
        parts.push(`Flat ${mapping.flat_number}`);
      }
      return parts.join(', ');
    }
    
    // Priority 2: Try to extract structured components from address fields
    // Extract building from address1
    if (!mapping?.building_id && address.address1) {
      const buildingMatch = address.address1.match(/building\s*(\d+)/i);
      if (buildingMatch) {
        parts.push(`Building ${buildingMatch[1]}`);
      } else if (address.address1.trim()) {
        // If no building pattern found, use address1 as building reference
        parts.push(`Building ${address.address1.trim()}`);
      }
    }
    
    // Extract road from address2
    if (!mapping?.road_id && address.address2) {
      const roadMatch = address.address2.match(/road\s*(\d+)/i);
      if (roadMatch) {
        parts.push(`Road ${roadMatch[1]}`);
      } else {
        // Check if address2 contains road info
        const roadInfo = address.address2.trim();
        if (roadInfo && !roadInfo.match(/(?:flat|apt|apartment|unit|#)/i)) {
          parts.push(`Road ${roadInfo}`);
        }
      }
    }
    
    // Extract block from city
    if (!mapping?.block_id && address.city) {
      const blockMatch = address.city.match(/block\s*(\d+)/i);
      if (blockMatch) {
        parts.push(`Block ${blockMatch[1]}`);
      } else if (address.city.trim()) {
        parts.push(`Block ${address.city.trim()}`);
      }
    }
    
    // Add flat/office number if available
    if (mapping?.flat_number) {
      parts.push(`Flat ${mapping.flat_number}`);
    } else if (address.address2) {
      const flatMatch = address.address2.match(/(?:flat|apt|apartment|unit|#)\s*([a-z0-9]+)/i);
      if (flatMatch) {
        parts.push(`Flat ${flatMatch[1]}`);
      }
    }
    
    // Ensure we have at least Building, Road, Block structure
    if (parts.length >= 3) {
      return parts.join(', ');
    }
    
    // If we don't have proper structure, build it from available fields
    // This ensures we always return structured format (not single line)
    const structuredParts = [];
    
    // Building component
    if (address.address1) {
      structuredParts.push(`Building ${address.address1.trim()}`);
    } else {
      structuredParts.push('Building Not Specified');
    }
    
    // Road component
    if (address.address2 && !address.address2.match(/(?:flat|apt|apartment|unit|#)/i)) {
      structuredParts.push(`Road ${address.address2.trim()}`);
    } else if (address.address2) {
      // If address2 has flat info, use it for road reference
      structuredParts.push(`Road ${address.address2.trim()}`);
    } else {
      structuredParts.push('Road Not Specified');
    }
    
    // Block component
    if (address.city) {
      structuredParts.push(`Block ${address.city.trim()}`);
    } else {
      structuredParts.push('Block Not Specified');
    }
    
    // Add flat if found
    if (address.address2) {
      const flatMatch = address.address2.match(/(?:flat|apt|apartment|unit|#)\s*([a-z0-9]+)/i);
      if (flatMatch) {
        structuredParts.push(`Flat ${flatMatch[1]}`);
      }
    }
    
    // Always return structured format (comma-separated, not single line)
    return structuredParts.join(', ');
  }

  /**
   * Map Shopify payment status to Delybell payment type
   * @param {string} financialStatus - Shopify financial status
   * @param {Array} paymentGateways - Payment gateway names
   * @returns {string} Delybell payment type (COD or Prepaid)
   */
  mapPaymentType(financialStatus, paymentGateways = []) {
    // If paid, it's prepaid
    if (financialStatus === 'paid') {
      return 'Prepaid';
    }
    
    // If pending or authorized, check payment gateway
    // Some gateways might indicate COD
    const codGateways = ['cod', 'cash on delivery', 'cash-on-delivery'];
    const gatewayName = paymentGateways?.[0]?.toLowerCase() || '';
    
    if (codGateways.some(cod => gatewayName.includes(cod))) {
      return 'COD';
    }
    
    // Default to COD for pending payments
    if (financialStatus === 'pending' || financialStatus === 'authorized') {
      return 'COD';
    }
    
    // Default to Prepaid
    return 'Prepaid';
  }

  /**
   * Get payment fields for Delybell order payload
   * Returns payment_type and cod_amount based on Shopify order financial status
   * @param {Object} shopifyOrder - Shopify order object
   * @returns {Object} Payment fields object with payment_type and optionally cod_amount
   */
  getPaymentFields(shopifyOrder) {
    const financialStatus = shopifyOrder.financial_status || 'pending';
    const paymentGateways = shopifyOrder.payment_gateway_names || [];
    const totalPrice = parseFloat(shopifyOrder.total_price) || 0;
    
    // Determine if order is COD or Prepaid
    const isCOD = this.isCOD(shopifyOrder);
    const paymentType = isCOD ? 'COD' : 'Prepaid';
    
    console.log(`Payment status: ${financialStatus}, Payment type: ${paymentType}, Total: ${totalPrice}`);
    
    // Build payment fields object
    const paymentFields = {
      payment_type: paymentType,
    };
    
    // If COD, include cod_amount (amount to collect on delivery)
    if (isCOD && totalPrice > 0) {
      paymentFields.cod_amount = totalPrice;
    }
    
    return paymentFields;
  }
}

module.exports = new OrderTransformer();

