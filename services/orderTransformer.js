/**
 * Order Transformer Service
 * Transforms Shopify order data to Delybell API format
 */

class OrderTransformer {
  /**
   * Transform Shopify order to Delybell order format
   * @param {Object} shopifyOrder - Shopify order object
   * @param {Object} mappingConfig - Configuration for mapping Shopify fields to Delybell fields
   * @returns {Object} Delybell order format
   */
  transformShopifyToDelybell(shopifyOrder, mappingConfig = {}) {
    // Extract shipping address (destination) - fallback to billing if missing
    const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
    
    // Extract billing address (pickup/sender)
    const billingAddress = shopifyOrder.billing_address;
    
    // Validate mandatory fields
    if (!shippingAddress) {
      throw new Error('Order must have a shipping address or billing address');
    }

    // Calculate total weight from line items
    const totalWeight = this.calculateTotalWeight(shopifyOrder.line_items);

    // Build package details from line items
    const packageDetails = this.buildPackageDetails(shopifyOrder.line_items);

    // Map addresses to Delybell format
    // Note: You'll need to map Shopify addresses to Delybell's block/road/building IDs
    // This requires additional API calls or a mapping table
    const destinationMapping = this.mapAddressToDelybell(
      shippingAddress,
      mappingConfig.destination
    );
    const pickupMapping = this.mapAddressToDelybell(
      billingAddress,
      mappingConfig.pickup
    );

    // Build Delybell order object according to API specification
    const delybellOrder = {
      // Mandatory fields
      order_type: 1, // Domestic = 1, International = 2 (currently only support Domestic)
      service_type_id: mappingConfig.service_type_id || 1,
      customer_input_order_id: shopifyOrder.order_number?.toString() || shopifyOrder.id?.toString(),
      
      // Pickup (Sender) Information
      // IMPORTANT: Pickup address must match EXACTLY what's registered in Delybell system
      // Use configured pickup address from environment variables, not from Shopify billing address
      pickup_customer_name: mappingConfig.pickup?.customer_name || billingAddress?.name || 'Shopify Store',
      pickup_mobile_number: mappingConfig.pickup?.mobile_number || billingAddress?.phone || shopifyOrder.customer?.phone || '',
      pickup_block_id: pickupMapping.block_id,
      pickup_road_id: pickupMapping.road_id,
      pickup_building_id: pickupMapping.building_id,
      // Use configured pickup address (must match registered Delybell address exactly)
      sender_address: mappingConfig.pickup?.address || this.formatAddress(billingAddress) || '',

      // Destination (Recipient) Information (mandatory)
      // IMPORTANT: Destination address must be in STANDARD FORMAT (not single line)
      // Format: "Building X, Road Y, Block Z" for auto-assignment based on location blocks
      destination_customer_name: shippingAddress?.name || 
        (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
          ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
          : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || 'Customer'),
      destination_mobile_number: shippingAddress?.phone || shopifyOrder.customer?.phone || '+97300000000', // Default phone if missing (mandatory field)
      // Format destination address in standard structured format for auto-assignment
      destination_address: this.formatDestinationAddress(shippingAddress, destinationMapping) || (shippingAddress?.address1 || 'Address not provided'),
      
      // Optional destination fields
      destination_alternate_number: shippingAddress?.phone_alt || '',
      destination_block_id: destinationMapping.block_id,
      destination_road_id: destinationMapping.road_id,
      destination_building_id: destinationMapping.building_id,
      destination_flat_or_office_number: destinationMapping.flat_number || '',

      // Mandatory: Delivery instructions
      delivery_instructions: shopifyOrder.note || shippingAddress?.note || 'Handle with care',

      // Package Details (mandatory)
      package_details: this.formatPackageDetails(packageDetails),

      // Optional: COD fields
      ...(this.isCOD(shopifyOrder) && {
        is_cod: true,
        cod_amount: Math.round(parseFloat(shopifyOrder.total_price) || 0),
      }),
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
   * Map Shopify address to Delybell block/road/building IDs
   * This is a placeholder - you'll need to implement actual mapping logic
   * based on your address data or use Delybell's master APIs to find matching IDs
   * @param {Object} address - Shopify address object
   * @param {Object} mappingConfig - Pre-configured mapping (block_id, road_id, building_id)
   * @returns {Object} Delybell address mapping
   */
  mapAddressToDelybell(address, mappingConfig = {}) {
    // If mapping config is provided, use it
    if (mappingConfig.block_id && mappingConfig.road_id && mappingConfig.building_id) {
      return {
        block_id: mappingConfig.block_id,
        road_id: mappingConfig.road_id,
        building_id: mappingConfig.building_id,
        flat_number: mappingConfig.flat_number || this.extractFlatNumber(address),
      };
    }

    // TODO: Implement address lookup/mapping logic
    // This could involve:
    // 1. Searching Delybell's master APIs (blocks, roads, buildings) by address
    // 2. Using a mapping table/database
    // 3. Geocoding and matching coordinates
    
    // For now, return default values (these should be configured)
    return {
      block_id: mappingConfig.block_id || 1,
      road_id: mappingConfig.road_id || 1,
      building_id: mappingConfig.building_id || 1,
      flat_number: mappingConfig.flat_number || this.extractFlatNumber(address),
    };
  }

  /**
   * Extract flat number from address
   * @param {Object} address - Address object
   * @returns {string} Flat number
   */
  extractFlatNumber(address) {
    if (!address) return '';
    
    // Try to extract from address1 or address2
    const addressLine = address.address1 || address.address2 || '';
    const flatMatch = addressLine.match(/(?:flat|apt|apartment|unit|#)\s*([a-z0-9]+)/i);
    return flatMatch ? flatMatch[1] : '';
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
   * Format destination address in standard structured format
   * IMPORTANT: Must be in format "Building X, Road Y, Block Z" for auto-assignment
   * This is required because Delybell uses auto-assignment based on location blocks
   * @param {Object} address - Shopify shipping address object
   * @param {Object} mapping - Delybell address mapping (block_id, road_id, building_id)
   * @returns {string} Formatted destination address in standard format
   */
  formatDestinationAddress(address, mapping) {
    if (!address) return '';
    
    // Build structured address format: "Building X, Road Y, Block Z"
    // This format is required for Delybell's auto-assignment system
    const parts = [];
    
    // Add building information if available
    if (mapping?.building_id) {
      parts.push(`Building ${mapping.building_id}`);
    } else if (address.address1) {
      // Try to extract building from address1
      const buildingMatch = address.address1.match(/building\s*(\d+)/i);
      if (buildingMatch) {
        parts.push(`Building ${buildingMatch[1]}`);
      } else {
        parts.push(address.address1);
      }
    }
    
    // Add road information
    if (mapping?.road_id) {
      parts.push(`Road ${mapping.road_id}`);
    } else if (address.address2) {
      const roadMatch = address.address2.match(/road\s*(\d+)/i);
      if (roadMatch) {
        parts.push(`Road ${roadMatch[1]}`);
      } else {
        parts.push(address.address2);
      }
    }
    
    // Add block information
    if (mapping?.block_id) {
      parts.push(`Block ${mapping.block_id}`);
    } else if (address.city) {
      const blockMatch = address.city.match(/block\s*(\d+)/i);
      if (blockMatch) {
        parts.push(`Block ${blockMatch[1]}`);
      } else {
        parts.push(address.city);
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
    
    // If we have structured parts, return them
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    // Fallback to standard format if no structured data found
    const fallbackParts = [
      address.address1,
      address.address2,
      address.city,
    ].filter(Boolean);
    
    return fallbackParts.join(', ');
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
}

module.exports = new OrderTransformer();

