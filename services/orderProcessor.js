const delybellClient = require('./delybellClient');
const orderTransformer = require('./orderTransformer');
const shopifyClient = require('./shopifyClient');
const { supabase } = require('./db');

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
          console.warn(`Building ID ${buildingId} not found for Road ${roadId} in Block ${blockId}, but continuing...`);
        }
      }
      
      return { valid: true, errors: [] };
    } catch (error) {
      console.error('Error validating address IDs:', error.message);
      // If validation API fails, log warning but don't block order creation
      // (Delybell API will validate anyway)
      console.warn('Could not validate address IDs against master data, proceeding with order creation...');
      return { valid: true, errors: [], warning: 'Validation API unavailable' };
    }
  }

  /**
   * Process a Shopify order and create it in Delybell
   * @param {Object} shopifyOrder - Shopify order object
   * @param {Object} session - Shopify session (contains shop domain)
   * @param {Object} mappingConfig - Address mapping configuration (may contain shop domain)
   * @returns {Promise<Object>} Processing result
   */
  async processOrder(shopifyOrder, session, mappingConfig = {}) {
    try {
      const shopifyOrderId = shopifyOrder.order_number || shopifyOrder.id;
      console.log(`Processing Shopify order: ${shopifyOrderId}`);

      // Extract shop domain from session or mappingConfig
      const shop = mappingConfig.shop || session?.shop || shopifyOrder.shop;
      
      if (!shop) {
        console.warn('Shop domain not found - pickup location may not be fetched correctly');
      }

      // 3️⃣ Idempotency Guard: Skip if already synced
      const existing = await this.findOrderLog(shop, shopifyOrderId);
      if (existing?.delybell_order_id) {
        console.log(`[OrderProcessor] Order ${shopifyOrderId} already synced to Delybell (ID: ${existing.delybell_order_id}), skipping`);
        return {
          success: true,
          shopifyOrderId: shopifyOrderId,
          delybellOrderId: existing.delybell_order_id,
          message: 'Order already synced',
          skipped: true,
        };
      }

      // Step 1: Transform Shopify order to Delybell format (async - includes ID lookup and pickup location fetch)
      // Pass session to transformer so it can fetch store address from Shopify
      const transformerConfig = {
        ...mappingConfig,
        session: session, // Pass session so transformer can fetch store address
      };
      
      const delybellOrderData = await orderTransformer.transformShopifyToDelybell(
        shopifyOrder,
        transformerConfig,
        shop // Pass shop domain to fetch pickup location from Shopify store address
      );

      // Step 1.5: Validate destination address IDs exist in Delybell master data
      // Note: IDs are already looked up from numbers in orderTransformer, but we validate as safety check
      console.log(`Validating destination address IDs: Block ID ${delybellOrderData.destination_block_id}, Road ID ${delybellOrderData.destination_road_id}...`);
      const validationResult = await this.validateAddressIds(
        delybellOrderData.destination_block_id,
        delybellOrderData.destination_road_id,
        delybellOrderData.destination_building_id
      );
      
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map(e => e.message).join('; ');
        const suggestions = validationResult.errors.map(e => e.suggestion).filter(Boolean).join(' ');
        
        throw new Error(
          `Destination address validation failed. ${errorMessages}. ` +
          `${suggestions} ` +
          `The Delybell IDs (Block ID: ${delybellOrderData.destination_block_id}, Road ID: ${delybellOrderData.destination_road_id}) ` +
          `do not exist in Delybell's master data. ` +
          `This should not happen if address lookup worked correctly. Please verify the customer's address is correct.`
        );
      }
      
      console.log(`Destination address IDs validated successfully`);

      // Step 2: Calculate shipping charge (optional, non-blocking)
      // 4️⃣ Make Shipping Charge NON-BLOCKING - errors must NEVER fail the order
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
        // Ignore shipping charge errors - they must never fail the order
        console.warn('[OrderProcessor] Shipping charge calculation failed (non-blocking):', error.message);
      }

      // Step 3: Create order in Delybell
      const delybellResponse = await delybellClient.createOrder(delybellOrderData);

      // 1️⃣ Fix Order ID Extraction (CRITICAL - EXACT FORMAT)
      // delybellClient.createOrder() returns response.data (already parsed)
      // So structure is: { status: true, data: { orderId: "..." } }
      // NOT: { data: { data: { orderId: "..." } } }
      const delybellOrderId = delybellResponse?.data?.orderId;

      // Debug log to verify extraction
      console.log('[OrderProcessor] DEBUG orderId extraction:', {
        hasResponse: !!delybellResponse,
        hasData: !!delybellResponse?.data,
        orderId: delybellOrderId,
        responseStructure: JSON.stringify(delybellResponse).substring(0, 300),
      });

      if (!delybellOrderId) {
        throw new Error(
          `No orderId returned. Raw response: ${JSON.stringify(delybellResponse).substring(0, 500)}`
        );
      }

      console.log(`Order created successfully in Delybell: ${delybellOrderId}`);
      
      // 2️⃣ Log successful order and RETURN IMMEDIATELY (CRITICAL)
      await this.logOrder({
        shop,
        shopifyOrderId: shopifyOrder.id || shopifyOrder.order_number,
        delybellOrderId: delybellOrderId.toString(),
        status: 'processed',
      });
      
      console.log(`[OrderProcessor] ✅ Order ${shopifyOrder.order_number || shopifyOrder.id} logged to database`);
      
      // RETURN IMMEDIATELY - no code after this should run
      return {
        success: true,
        shopifyOrderId: shopifyOrder.order_number || shopifyOrder.id,
        delybellOrderId: delybellOrderId.toString(),
        shippingCharge,
        trackingUrl: delybellResponse?.data?.tracking_url,
        message: 'Order processed successfully',
      };
    } catch (error) {
      console.error('[OrderProcessor] ❌ Error processing order:', error);
      console.error('[OrderProcessor] Error stack:', error.stack);
      
      // Extract detailed error message from Delybell API response
      const errorDetails = error.response?.data || {};
      const errorMessage = errorDetails.message || error.message;
      const errorStatus = error.response?.status;
      
      // Log failed order
      const shop = mappingConfig.shop || session?.shop || shopifyOrder.shop;
      const shopifyOrderId = shopifyOrder.order_number || shopifyOrder.id;
      
      console.log(`[OrderProcessor] Attempting to log failed order ${shopifyOrderId} to database...`);
      if (shop) {
        try {
          await this.logOrder({
            shop,
            shopifyOrderId: shopifyOrderId,
            status: 'failed',
            errorMessage: errorMessage,
          });
          console.log(`[OrderProcessor] ✅ Failed order ${shopifyOrderId} logged to database`);
        } catch (logError) {
          console.error(`[OrderProcessor] ❌ Failed to log order to database:`, logError.message);
          console.error(`[OrderProcessor] Log error stack:`, logError.stack);
        }
      } else {
        console.error(`[OrderProcessor] ❌ Cannot log order - shop domain missing`);
      }
      
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

  /**
   * Find order log by Shopify order ID
   * 3️⃣ Idempotency Guard: Check if order already synced
   * @param {string} shop - Shop domain
   * @param {number|string} shopifyOrderId - Shopify order ID
   * @returns {Promise<Object|null>} Order log or null if not found
   */
  async findOrderLog(shop, shopifyOrderId) {
    if (!process.env.SUPABASE_URL) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('order_logs')
        .select('*')
        .eq('shop', shop)
        .eq('shopify_order_id', shopifyOrderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error(`[OrderProcessor] Error finding order log:`, error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`[OrderProcessor] Error finding order log:`, error.message);
      return null;
    }
  }

  /**
   * Log order processing result to database
   * @param {Object} params - Order log data
   * @param {string} params.shop - Shop domain
   * @param {number} params.shopifyOrderId - Shopify order ID
   * @param {string} params.delybellOrderId - Delybell order ID (optional)
   * @param {string} params.status - Status ('processed', 'failed')
   * @param {string} params.errorMessage - Error message (optional)
   */
  async logOrder({ shop, shopifyOrderId, delybellOrderId = null, status, errorMessage = null }) {
    if (!process.env.SUPABASE_URL) {
      // Supabase not configured - skip logging
      return;
    }

    try {
      // Build insert object
      const insertData = {
        shop,
        shopify_order_id: shopifyOrderId,
        delybell_order_id: delybellOrderId,
        status,
      };
      
      // Try to add error_message if provided
      // If column doesn't exist, this will fail gracefully
      if (errorMessage) {
        try {
          insertData.error_message = errorMessage;
        } catch (e) {
          // Column might not exist - log but continue
          console.warn('[OrderProcessor] error_message column might not exist, skipping');
        }
      }
      
      const { error } = await supabase
        .from('order_logs')
        .insert(insertData);
      
      // If error is about missing column, try without error_message
      if (error && error.message && error.message.includes('error_message')) {
        console.warn('[OrderProcessor] error_message column not found, inserting without it');
        delete insertData.error_message;
        const { error: retryError } = await supabase
          .from('order_logs')
          .insert(insertData);
        
        if (retryError) {
          throw retryError;
        }
        return; // Success on retry
      }

      if (error) {
        console.error(`[OrderProcessor] Failed to log order ${shopifyOrderId}:`, error.message);
      } else {
        console.log(`[OrderProcessor] ✅ Logged order ${shopifyOrderId} with status: ${status}`);
      }
    } catch (logError) {
      // Don't throw - logging failures shouldn't break order processing
      console.error(`[OrderProcessor] Error logging order:`, logError.message);
    }
  }
}

module.exports = new OrderProcessor();

