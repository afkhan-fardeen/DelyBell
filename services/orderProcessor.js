const delybellClient = require('./delybellClient');
const orderTransformer = require('./orderTransformer');
const shopifyClient = require('./shopifyClient');

/**
 * Order Processor Service
 * Handles the complete order processing workflow
 */
class OrderProcessor {
  /**
   * Validate that block/road IDs exist in Delybell master data
   * @param {number} blockId - Block ID to validate
   * @param {number} roadId - Road ID to validate
   * @param {number} buildingId - Building ID to validate (optional)
   * @returns {Promise<Object>} Validation result with details
   */
  async validateAddressIds(blockId, roadId, buildingId = null) {
    const validationErrors = [];
    
    try {
      // Validate Block ID exists
      const blocksResponse = await delybellClient.getBlocks();
      const blocks = blocksResponse?.data || [];
      const blockExists = blocks.some(block => block.id === blockId);
      
      if (!blockExists) {
        validationErrors.push({
          field: 'block_id',
          value: blockId,
          message: `Block ID ${blockId} does not exist in Delybell master data`,
          suggestion: `Available blocks: ${blocks.slice(0, 10).map(b => b.id).join(', ')}${blocks.length > 10 ? '...' : ''}`,
        });
        return { valid: false, errors: validationErrors };
      }
      
      // Validate Road ID exists for this Block
      const roadsResponse = await delybellClient.getRoads(blockId);
      const roads = roadsResponse?.data || [];
      const roadExists = roads.some(road => road.id === roadId);
      
      if (!roadExists) {
        validationErrors.push({
          field: 'road_id',
          value: roadId,
          message: `Road ID ${roadId} does not exist for Block ${blockId} in Delybell master data`,
          suggestion: `Available roads for Block ${blockId}: ${roads.slice(0, 10).map(r => r.id).join(', ')}${roads.length > 10 ? '...' : ''}`,
        });
        return { valid: false, errors: validationErrors };
      }
      
      // Optionally validate Building ID
      if (buildingId) {
        const buildingsResponse = await delybellClient.getBuildings(roadId, blockId);
        const buildings = buildingsResponse?.data || [];
        const buildingExists = buildings.some(building => building.id === buildingId);
        
        if (!buildingExists) {
          // Building validation is optional - just warn, don't fail
          console.warn(`⚠️ Building ID ${buildingId} not found for Road ${roadId} in Block ${blockId}, but continuing...`);
        }
      }
      
      return { valid: true, errors: [] };
    } catch (error) {
      console.error('Error validating address IDs:', error.message);
      // If validation API fails, log warning but don't block order creation
      // (Delybell API will validate anyway)
      console.warn('⚠️ Could not validate address IDs against master data, proceeding with order creation...');
      return { valid: true, errors: [], warning: 'Validation API unavailable' };
    }
  }

  /**
   * Process a Shopify order and create it in Delybell
   * @param {Object} shopifyOrder - Shopify order object
   * @param {Object} session - Shopify session
   * @param {Object} mappingConfig - Address mapping configuration
   * @returns {Promise<Object>} Processing result
   */
  async processOrder(shopifyOrder, session, mappingConfig = {}) {
    try {
      console.log(`Processing Shopify order: ${shopifyOrder.order_number || shopifyOrder.id}`);

      // Step 1: Transform Shopify order to Delybell format (async - includes ID lookup)
      const delybellOrderData = await orderTransformer.transformShopifyToDelybell(
        shopifyOrder,
        mappingConfig
      );

      // Step 1.5: Validate destination address IDs exist in Delybell master data
      // Note: IDs are already looked up from numbers in orderTransformer, but we validate as safety check
      console.log(`🔍 Validating destination address IDs: Block ID ${delybellOrderData.destination_block_id}, Road ID ${delybellOrderData.destination_road_id}...`);
      const validationResult = await this.validateAddressIds(
        delybellOrderData.destination_block_id,
        delybellOrderData.destination_road_id,
        delybellOrderData.destination_building_id
      );
      
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map(e => e.message).join('; ');
        const suggestions = validationResult.errors.map(e => e.suggestion).filter(Boolean).join(' ');
        
        throw new Error(
          `CRITICAL: Destination address validation failed. ${errorMessages}. ` +
          `${suggestions} ` +
          `The Delybell IDs (Block ID: ${delybellOrderData.destination_block_id}, Road ID: ${delybellOrderData.destination_road_id}) ` +
          `do not exist in Delybell's master data. ` +
          `This should not happen if address lookup worked correctly. Please verify the customer's address is correct.`
        );
      }
      
      console.log(`✅ Destination address IDs validated successfully`);

      // Step 2: Calculate shipping charge (optional, for verification)
      let shippingCharge = null;
      try {
        const shippingData = await delybellClient.calculateShippingCharge({
          service_type_id: delybellOrderData.service_type_id,
          destination_block_id: delybellOrderData.destination_block_id,
          package_details: delybellOrderData.package_details.map(pkg => ({
            weight: pkg.weight,
          })),
        });
        shippingCharge = shippingData.data?.shipping_charge;
        console.log(`Calculated shipping charge: ${shippingCharge}`);
      } catch (error) {
        console.warn('Could not calculate shipping charge:', error.message);
        // Continue with order creation even if shipping calculation fails
      }

      // Step 3: Create order in Delybell
      const createOrderResponse = await delybellClient.createOrder(delybellOrderData);

      if (!createOrderResponse.status) {
        throw new Error(`Delybell API error: ${createOrderResponse.message}`);
      }

      const delybellOrderId = createOrderResponse.data?.order_id;
      const customerOrderId = createOrderResponse.data?.customer_input_order_id;

      console.log(`Order created successfully in Delybell: ${delybellOrderId}`);

      // Step 4: Update Shopify order with Delybell tracking info
      if (session && shopifyOrder.id) {
        try {
          const tags = [
            `delybell-synced`,
            `delybell-order-id:${delybellOrderId}`,
            `delybell-tracking:${createOrderResponse.data?.tracking_url || ''}`,
          ];
          
          // Keep existing tags
          const existingTags = shopifyOrder.tags ? shopifyOrder.tags.split(', ') : [];
          const allTags = [...new Set([...existingTags, ...tags])];
          
          await shopifyClient.updateOrderTags(session, shopifyOrder.id, allTags);
          console.log(`Updated Shopify order tags`);
        } catch (error) {
          console.warn('Could not update Shopify order tags:', error.message);
          // Don't fail the whole process if tag update fails
        }
      }

      return {
        success: true,
        shopifyOrderId: shopifyOrder.order_number || shopifyOrder.id,
        delybellOrderId,
        customerOrderId,
        shippingCharge,
        trackingUrl: createOrderResponse.data?.tracking_url,
        message: 'Order processed successfully',
      };
    } catch (error) {
      console.error('Error processing order:', error);
      
      // Extract detailed error message from Delybell API response
      const errorDetails = error.response?.data || {};
      const errorMessage = errorDetails.message || error.message;
      const errorStatus = error.response?.status;
      
      return {
        success: false,
        shopifyOrderId: shopifyOrder.order_number || shopifyOrder.id,
        error: errorMessage,
        errorStatus: errorStatus,
        errorDetails: errorDetails,
        message: 'Failed to process order',
      };
    }
  }

  /**
   * Process multiple orders in batch
   * @param {Array} shopifyOrders - Array of Shopify orders
   * @param {Object} session - Shopify session
   * @param {Object} mappingConfig - Address mapping configuration
   * @returns {Promise<Array>} Array of processing results
   */
  async processOrdersBatch(shopifyOrders, session, mappingConfig = {}) {
    const results = [];
    
    for (const order of shopifyOrders) {
      const result = await this.processOrder(order, session, mappingConfig);
      results.push(result);
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }
}

module.exports = new OrderProcessor();

