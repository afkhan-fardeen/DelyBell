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
   * Validate that block ID exists in Delybell master data
   * Block ID is MANDATORY. Road and Building IDs are OPTIONAL.
   * 
   * @param {number} blockId - Block ID to validate (MANDATORY)
   * @param {number|null} roadId - Road ID to validate (OPTIONAL - can be null)
   * @param {number|null} buildingId - Building ID to validate (OPTIONAL - can be null)
   * @returns {Promise<Object>} Validation result with details
   */
  async validateAddressIds(blockId, roadId = null, buildingId = null) {
    const validationErrors = [];
    
    try {
      // Validate Block ID exists (MANDATORY)
      if (!blockId) {
        validationErrors.push({
          field: 'block_id',
          value: blockId,
          message: `Block ID is required for order syncing`,
          suggestion: `Please ensure the customer address includes a Block number.`,
        });
        return { valid: false, errors: validationErrors };
      }
      
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
      
      // Validate Road ID exists for this Block (OPTIONAL - only validate if provided)
      if (roadId) {
        const roadsResponse = await delybellClient.getRoads(blockId);
        const roads = roadsResponse?.data || [];
        const roadExists = roads.some(road => road.id === roadId);
        
        if (!roadExists) {
          // Road is optional - log warning but don't fail
          console.warn(
            `Road ID ${roadId} not found for Block ${blockId} in Delybell master data. ` +
            `Road is optional - order will still sync with Block only.`
          );
        }
      } else {
        console.log(`Road ID not provided - Road is optional, order will sync with Block ${blockId} only`);
      }
      
      // Optionally validate Building ID (OPTIONAL - only validate if provided)
      if (buildingId && roadId) {
        const buildingsResponse = await delybellClient.getBuildings(roadId, blockId);
        const buildings = buildingsResponse?.data || [];
        const buildingExists = buildings.some(building => building.id === buildingId);
        
        if (!buildingExists) {
          // Building is optional - just warn, don't fail
          console.warn(
            `Building ID ${buildingId} not found for Road ${roadId} in Block ${blockId}. ` +
            `Building is optional - order will still sync.`
          );
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
      // 1️⃣ Store Shopify order ID (long ID for API calls) and order number (display number) separately
      // shopifyOrder.id = long ID (e.g., 10643266011430) - USE FOR API CALLS
      // shopifyOrder.order_number = display number (e.g., 1022) - USE FOR DISPLAY ONLY
      const shopifyOrderId = shopifyOrder.id?.toString() || shopifyOrder.order_number?.toString();
      const shopifyOrderNumber = shopifyOrder.order_number || null;
      const financialStatus = shopifyOrder.financial_status || null;
      
      if (!shopifyOrderId) {
        throw new Error('Shopify order ID is required');
      }
      
      console.log(`Processing Shopify order: ID=${shopifyOrderId}, Number=${shopifyOrderNumber || 'N/A'}`);

      // Extract shop domain from session or mappingConfig
      const shop = mappingConfig.shop || session?.shop || shopifyOrder.shop;
      
      // Extract customer name and phone for logging
      const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
      const customerName = shippingAddress?.name || 
        (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
          ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
          : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
      const phone = shippingAddress?.phone || shopifyOrder.customer?.phone || null;
      
      // Extract Shopify order creation time (when order was placed)
      const shopifyOrderCreatedAt = shopifyOrder.created_at || null;
      
      if (!shop) {
        console.warn('Shop domain not found - pickup location may not be fetched correctly');
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
      // FINAL RULE: Only Block ID is mandatory - Road/Building validation errors NEVER block order creation
      // Block ID is MANDATORY - if missing, fail
      // Road and Building IDs are OPTIONAL - validation errors are ignored
      console.log(`Validating destination address IDs: Block ID ${delybellOrderData.destination_block_id}${delybellOrderData.destination_road_id ? `, Road ID ${delybellOrderData.destination_road_id}` : ' (Road: optional)'}${delybellOrderData.destination_building_id ? `, Building ID ${delybellOrderData.destination_building_id}` : ' (Building: optional)'}...`);
      
      // Only validate Block ID (mandatory) - Road/Building validation errors are ignored
      if (!delybellOrderData.destination_block_id) {
        throw new Error(
          `Block ID is required for order syncing. ` +
          `Please verify the customer's address includes a valid Block number.`
        );
      }
      
      // Validate Block ID exists (only mandatory field)
      const validationResult = await this.validateAddressIds(
        delybellOrderData.destination_block_id,
        null, // Road ID validation errors are ignored
        null  // Building ID validation errors are ignored
      );
      
      // Only fail if Block ID validation fails
      if (!validationResult.valid && validationResult.errors.some(e => e.message.includes('Block'))) {
        const errorMessages = validationResult.errors.filter(e => e.message.includes('Block')).map(e => e.message).join('; ');
        throw new Error(
          `Block ID validation failed. ${errorMessages}. ` +
          `Block ID is required for order syncing.`
        );
      }
      
      // Road/Building validation errors are logged but ignored (non-blocking)
      const roadBuildingErrors = validationResult.errors.filter(e => 
        e.message.includes('Road') || e.message.includes('Building')
      );
      if (roadBuildingErrors.length > 0) {
        console.warn(`[OrderProcessor] ⚠️ Road/Building validation warnings (ignored - non-blocking):`, 
          roadBuildingErrors.map(e => e.message).join('; '));
      }
      
      console.log(`Destination address IDs validated: Block is valid; Road/Building validation errors ignored (non-blocking)`);

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

      // 🔒 Idempotency Guard: Check if order already synced BEFORE calling Delybell API
      // 5️⃣ Log duplicate webhooks as INFO, not ERROR
      // Use shopify_order_id (long ID) for lookup
      const existing = await this.findOrderLog(shop, shopifyOrderId);
      if (existing?.delybell_order_id) {
        // Duplicate webhook is normal - log as INFO
        console.log(`[OrderProcessor] ℹ️ Duplicate webhook detected - Order ${shopifyOrderId} already synced to Delybell (${existing.delybell_order_id}), skipping`);
        return {
          success: true,
          shopifyOrderId: shopifyOrderId,
          delybellOrderId: existing.delybell_order_id,
          message: 'Order already synced',
          skipped: true,
          isDuplicate: true, // Flag to indicate this is a duplicate
        };
      }

      // Step 3: Create order in Delybell
      // FINAL RULE: Prioritize delivery continuity over strict validation
      // - Ignore non-fatal API errors (validation warnings, address text errors)
      // - Treat order as SUCCESS if order ID is returned OR order already exists
      // - Only fail if order ID cannot be retrieved
      let delybellResponse;
      try {
        delybellResponse = await delybellClient.createOrder(delybellOrderData);
      } catch (error) {
        // ✅ "Order already exists" - MUST fetch existing order and get orderId
        // Treat as SUCCESS if order exists (even if we can't get ID immediately)
        if (
          error.response?.status === 400 &&
          (error.response?.data?.message?.includes('already exists') ||
           error.response?.data?.message?.includes('duplicate') ||
           error.response?.data?.message?.toLowerCase().includes('exist'))
        ) {
          console.warn(`[OrderProcessor] Order ${shopifyOrderId} already exists in Delybell, fetching existing order...`);
          
          // Try to extract order ID from error response first
          let existingOrderId = error.response?.data?.orderId || 
                               error.response?.data?.data?.orderId ||
                               error.response?.data?.existing_order_id;
          
          // If not in error response, fetch order using customer_input_order_id
          if (!existingOrderId) {
            try {
              // Use customer_input_order_id to fetch the existing order
              const customerInputOrderId = delybellOrderData.customer_input_order_id;
              console.log(`[OrderProcessor] Fetching existing order using customer_input_order_id: ${customerInputOrderId}`);
              
              const trackingResponse = await delybellClient.trackOrder(customerInputOrderId);
              // Extract orderId from tracking response
              existingOrderId = trackingResponse?.data?.orderId || 
                               trackingResponse?.orderId ||
                               trackingResponse?.data?.id;
              
              if (existingOrderId) {
                console.log(`[OrderProcessor] Found existing order ID: ${existingOrderId}`);
              } else {
                console.error(`[OrderProcessor] Could not extract orderId from tracking response:`, JSON.stringify(trackingResponse).substring(0, 500));
              }
            } catch (fetchError) {
              console.error(`[OrderProcessor] Failed to fetch existing order:`, fetchError.message);
              // Continue to failure path below
            }
          }
          
          // Only mark as success if we have the orderId
          if (existingOrderId) {
            // Log as success with the existing order ID
            await this.logOrder({
              shop,
              shopifyOrderId: shopifyOrderId, // Long ID
              shopifyOrderNumber: shopifyOrderNumber, // Display number
              delybellOrderId: existingOrderId.toString(),
              status: 'processed',
              totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
              currency: shopifyOrder.currency || 'USD',
              customerName: customerName,
              phone: phone,
              shopifyOrderCreatedAt: shopifyOrderCreatedAt,
              financialStatus: financialStatus,
            });
            
            return {
              success: true,
              shopifyOrderId: shopifyOrderId,
              delybellOrderId: existingOrderId.toString(),
              message: 'Order already exists in Delybell',
              skipped: true,
            };
          } else {
            // Order exists but we couldn't get the orderId - FAILED
            console.error(`[OrderProcessor] Order ${shopifyOrderId} already exists in Delybell but orderId could not be retrieved - marking as FAILED`);
            await this.logOrder({
              shop,
              shopifyOrderId: shopifyOrderId, // Long ID
              shopifyOrderNumber: shopifyOrderNumber, // Display number
              delybellOrderId: null, // Must be null for failed status
              status: 'failed',
              errorMessage: 'Order already exists in Delybell but orderId could not be retrieved',
              totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
              currency: shopifyOrder.currency || 'USD',
              customerName: customerName,
              phone: phone,
              shopifyOrderCreatedAt: shopifyOrderCreatedAt,
              financialStatus: financialStatus,
            });
            
            return {
              success: false,
              shopifyOrderId: shopifyOrderId,
              error: 'Order already exists in Delybell but orderId could not be retrieved',
              message: 'Failed to process order',
            };
          }
        }
        
        // ✅ Ignore NON-FATAL API errors (validation warnings, address text errors)
        // Delybell dev said: "Ignore the response and proceed. We will update this later."
        // Only fail if it's a truly fatal error (network, auth, etc.)
        const errorStatus = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message || '';
        const errorData = error.response?.data || {};
        
        // Check if error is related to address validation or text fields
        // These are NON-FATAL - order might still be created
        const isValidationError = 
          errorStatus === 400 &&
          (
            errorMessage.toLowerCase().includes('validation') ||
            errorMessage.toLowerCase().includes('address') ||
            errorMessage.toLowerCase().includes('road') ||
            errorMessage.toLowerCase().includes('building') ||
            errorMessage.toLowerCase().includes('field') ||
            errorMessage.toLowerCase().includes('text') ||
            errorData.validation_errors ||
            errorData.errors
          );
        
        // Check if order ID might be in error response (sometimes API returns warnings but still creates order)
        const possibleOrderId = errorData?.orderId || 
                                errorData?.data?.orderId ||
                                errorData?.order_id;
        
        if (isValidationError && possibleOrderId) {
          // Validation error but order was created - treat as SUCCESS
          console.warn(`[OrderProcessor] ⚠️ Validation warnings for order ${shopifyOrderId}, but order ID found: ${possibleOrderId}. Treating as SUCCESS.`);
          console.warn(`[OrderProcessor] Validation errors (ignored per Delybell dev):`, JSON.stringify(errorData).substring(0, 500));
          
          await this.logOrder({
            shop,
            shopifyOrderId: shopifyOrderId,
            shopifyOrderNumber: shopifyOrderNumber,
            delybellOrderId: possibleOrderId.toString(),
            status: 'processed',
            errorMessage: `Validation warnings (ignored): ${errorMessage}`,
            totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
            currency: shopifyOrder.currency || 'USD',
            customerName: customerName,
            phone: phone,
            shopifyOrderCreatedAt: shopifyOrderCreatedAt,
            financialStatus: financialStatus,
          });
          
          return {
            success: true,
            shopifyOrderId: shopifyOrderId,
            delybellOrderId: possibleOrderId.toString(),
            message: 'Order created with validation warnings (ignored)',
            warnings: errorData,
          };
        }
        
        // For other validation errors without order ID, try to fetch order
        if (isValidationError) {
          console.warn(`[OrderProcessor] ⚠️ Validation errors for order ${shopifyOrderId}, attempting to fetch order...`);
          console.warn(`[OrderProcessor] Validation errors (may be non-fatal):`, JSON.stringify(errorData).substring(0, 500));
          
          // Try to fetch order using customer_input_order_id
          try {
            const customerInputOrderId = delybellOrderData.customer_input_order_id;
            const trackingResponse = await delybellClient.trackOrder(customerInputOrderId);
            const fetchedOrderId = trackingResponse?.data?.orderId || 
                                  trackingResponse?.orderId ||
                                  trackingResponse?.data?.id;
            
            if (fetchedOrderId) {
              // Order exists despite validation errors - SUCCESS
              console.log(`[OrderProcessor] ✅ Order ${shopifyOrderId} found in Delybell despite validation warnings. Order ID: ${fetchedOrderId}`);
              
              await this.logOrder({
                shop,
                shopifyOrderId: shopifyOrderId,
                shopifyOrderNumber: shopifyOrderNumber,
                delybellOrderId: fetchedOrderId.toString(),
                status: 'processed',
                errorMessage: `Validation warnings (ignored): ${errorMessage}`,
                totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
                currency: shopifyOrder.currency || 'USD',
                customerName: customerName,
                phone: phone,
                shopifyOrderCreatedAt: shopifyOrderCreatedAt,
                financialStatus: financialStatus,
              });
              
              return {
                success: true,
                shopifyOrderId: shopifyOrderId,
                delybellOrderId: fetchedOrderId.toString(),
                message: 'Order created despite validation warnings (ignored)',
                warnings: errorData,
              };
            }
          } catch (fetchError) {
            console.warn(`[OrderProcessor] Could not fetch order after validation error:`, fetchError.message);
            // Continue to failure path below
          }
        }
        
        // Re-throw if it's a fatal error (network, auth, etc.) or validation error without order ID
        throw error;
      }

      // ✅ Order ID Extraction (CRITICAL - EXACT FORMAT)
      // delybellClient.createOrder() returns response.data (already parsed)
      // So structure is: { status: true, data: { orderId: "..." } }
      // NOT: { data: { data: { orderId: "..." } } }
      // 
      // FINAL RULE: If order ID is returned OR order appears in Delybell → mark as SUCCESS
      // Even if API response contains validation warnings or text-field errors
      const delybellOrderId = delybellResponse?.data?.orderId ||
                              delybellResponse?.orderId ||
                              delybellResponse?.data?.id;

      // Debug log to verify extraction
      console.log('[OrderProcessor] DEBUG orderId extraction:', {
        hasResponse: !!delybellResponse,
        hasData: !!delybellResponse?.data,
        orderId: delybellOrderId,
        responseStructure: JSON.stringify(delybellResponse).substring(0, 300),
      });

      // ✅ If order ID is returned → SUCCESS (even if there are warnings)
      // Delybell dev said: "If order appears in Delybell dashboard → treat as SUCCESS"
      if (delybellOrderId) {
        console.log(`[OrderProcessor] ✅ Order ${shopifyOrderId} created successfully in Delybell. Order ID: ${delybellOrderId}`);
        
        // Check for warnings in response (but don't fail)
        const warnings = delybellResponse?.warnings || 
                        delybellResponse?.data?.warnings ||
                        (delybellResponse?.data?.validation_errors ? 'Validation warnings present' : null);
        
        if (warnings) {
          console.warn(`[OrderProcessor] ⚠️ Order created with warnings (ignored per Delybell dev):`, JSON.stringify(warnings).substring(0, 500));
        }
        
        // Log as SUCCESS (order ID is present)
        await this.logOrder({
          shop,
          shopifyOrderId: shopifyOrderId,
          shopifyOrderNumber: shopifyOrderNumber,
          delybellOrderId: delybellOrderId.toString(),
          status: 'processed',
          errorMessage: warnings ? `Warnings (ignored): ${JSON.stringify(warnings)}` : null,
          totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
          currency: shopifyOrder.currency || 'USD',
          customerName: customerName,
          phone: phone,
          shopifyOrderCreatedAt: shopifyOrderCreatedAt,
          financialStatus: financialStatus,
        });

      return {
        success: true,
          shopifyOrderId: shopifyOrderId,
          delybellOrderId: delybellOrderId.toString(),
          message: 'Order created successfully',
          warnings: warnings || null,
        };
      }

      // 2️⃣ Never mark as processed without Delybell orderId
      // Only fail if order ID truly cannot be retrieved
      const errorMessage = `No orderId returned. Raw response: ${JSON.stringify(delybellResponse).substring(0, 500)}`;
      console.error(`[OrderProcessor] ❌ Order ${shopifyOrderId} created but no orderId returned - marking as FAILED`);
      
      // Log as FAILED (delybell_order_id must be null for failed status)
      await this.logOrder({
        shop,
        shopifyOrderId: shopifyOrderId, // Long ID
        shopifyOrderNumber: shopifyOrderNumber, // Display number
        delybellOrderId: null, // Must be null for failed status
        status: 'failed',
        errorMessage: errorMessage,
        totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
        currency: shopifyOrder.currency || 'USD',
        financialStatus: financialStatus,
      });
      
      throw new Error(errorMessage);
    } catch (error) {
      console.error('[OrderProcessor] ❌ Error processing order:', error);
      console.error('[OrderProcessor] Error stack:', error.stack);
      
      // Extract detailed error message from Delybell API response
      const errorDetails = error.response?.data || {};
      const errorMessage = errorDetails.message || error.message;
      const errorStatus = error.response?.status;
      
      // Log failed order
      const shop = mappingConfig.shop || session?.shop || shopifyOrder.shop;
      // Use long ID for shopifyOrderId, order_number for display
      const failedShopifyOrderId = shopifyOrder.id?.toString() || shopifyOrder.order_number?.toString();
      const failedShopifyOrderNumber = shopifyOrder.order_number || null;
      
      console.log(`[OrderProcessor] Attempting to log failed order ${failedShopifyOrderId} to database...`);
      if (shop) {
        try {
          // Extract customer name and phone for failed orders
          const failedShippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
          const failedCustomerName = failedShippingAddress?.name || 
            (shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name 
              ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` 
              : shopifyOrder.customer?.first_name || shopifyOrder.customer?.last_name || null);
          const failedPhone = failedShippingAddress?.phone || shopifyOrder.customer?.phone || null;
          const failedShopifyOrderCreatedAt = shopifyOrder.created_at || null;
          
          await this.logOrder({
            shop,
            shopifyOrderId: failedShopifyOrderId, // Long ID
            shopifyOrderNumber: failedShopifyOrderNumber, // Display number
            status: 'failed',
            errorMessage: errorMessage,
            totalPrice: shopifyOrder.total_price ? parseFloat(shopifyOrder.total_price) : null,
            currency: shopifyOrder.currency || 'USD',
            customerName: failedCustomerName,
            phone: failedPhone,
            shopifyOrderCreatedAt: failedShopifyOrderCreatedAt,
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
   * @param {string} params.shopifyOrderId - Shopify order ID (long ID like 10643266011430) - USE FOR API CALLS
   * @param {number} params.shopifyOrderNumber - Shopify order number (display number like 1022) - USE FOR DISPLAY ONLY
   * @param {string} params.delybellOrderId - Delybell order ID (required for 'processed', must be null for 'failed')
   * @param {string} params.status - Status ('processed', 'failed')
   * @param {string} params.errorMessage - Error message (optional)
   * @param {number} params.totalPrice - Order total price from Shopify (optional)
   * @param {string} params.currency - Order currency from Shopify (optional, defaults to USD)
   * @param {string} params.customerName - Customer name (optional)
   * @param {string} params.phone - Customer phone number (optional)
   * @param {string} params.shopifyOrderCreatedAt - Shopify order creation time (when order was placed) (optional)
   */
  async logOrder({ shop, shopifyOrderId, shopifyOrderNumber = null, delybellOrderId = null, status, errorMessage = null, totalPrice = null, currency = 'USD', customerName = null, phone = null, shopifyOrderCreatedAt = null, financialStatus = null }) {
    if (!process.env.SUPABASE_URL) {
      // Supabase not configured - skip logging
      return { success: true, skipped: true, reason: 'Supabase not configured' };
    }

    try {
      // 4️⃣ Fix Supabase status rules
      // Rule: processed → delybell_order_id is REQUIRED
      // Rule: failed → delybell_order_id is NULL
      if (status === 'processed' && !delybellOrderId) {
        console.error(`[OrderProcessor] ❌ Invalid state: status='processed' but delybell_order_id is null. This should never happen.`);
        // Force to failed status if processed without orderId
        status = 'failed';
        delybellOrderId = null;
        errorMessage = errorMessage || 'Order marked as processed but delybell_order_id is missing';
      }
      
      if (status === 'failed' && delybellOrderId !== null) {
        console.warn(`[OrderProcessor] ⚠️ Invalid state: status='failed' but delybell_order_id is provided. Setting delybell_order_id to null.`);
        delybellOrderId = null;
      }

      // Build insert object
      const insertData = {
        shop,
        shopify_order_id: shopifyOrderId, // Long ID (e.g., 10643266011430) - USE FOR API CALLS
        shopify_order_number: shopifyOrderNumber, // Display number (e.g., 1022) - USE FOR DISPLAY ONLY
        delybell_order_id: delybellOrderId, // null for failed, required for processed
        status,
        total_price: totalPrice, // Order total from Shopify
        currency: currency || 'USD', // Order currency from Shopify
        customer_name: customerName, // Customer name
        phone: phone, // Customer phone number
        shopify_order_created_at: shopifyOrderCreatedAt, // When order was placed in Shopify
        financial_status: financialStatus || null, // Payment status (paid, pending, authorized, etc.)
      };

      // Add synced_at timestamp if order is processed (synced to Delybell)
      if (status === 'processed' && delybellOrderId) {
        insertData.synced_at = new Date().toISOString();
      }
      
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
      
      // Use upsert to update existing records instead of creating duplicates
      // Match on shop + shopify_order_id to update existing orders
      // Use manual check-and-update/insert since Supabase upsert onConflict syntax can be tricky
      let error = null;
      
      // Check if order already exists
      const { data: existing, error: findError } = await supabase
        .from('order_logs')
        .select('id')
        .eq('shop', shop)
        .eq('shopify_order_id', shopifyOrderId)
        .limit(1)
        .single();
      
      if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned (expected if new)
        console.warn('[OrderProcessor] Error checking for existing order:', findError.message);
      }
      
      if (existing && existing.id) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('order_logs')
          .update(insertData)
          .eq('id', existing.id);
        error = updateError;
        
        if (!error) {
          console.log(`[OrderProcessor] ✅ Updated existing order ${shopifyOrderId} with status: ${status}, shop: ${shop}`);
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('order_logs')
          .insert(insertData);
        error = insertError;
        
        if (!error) {
          console.log(`[OrderProcessor] ✅ Inserted new order ${shopifyOrderId} with status: ${status}, shop: ${shop}`);
        }
      }
      
      // If error is about missing column (error_message), try without it
      if (error && error.message && error.message.includes('error_message')) {
        console.warn('[OrderProcessor] error_message column not found, retrying without it');
        delete insertData.error_message;
        
        // Retry with same logic (check and update/insert)
        const { data: existingRetry } = await supabase
          .from('order_logs')
          .select('id')
          .eq('shop', shop)
          .eq('shopify_order_id', shopifyOrderId)
          .limit(1)
          .single();
        
        if (existingRetry && existingRetry.id) {
          const { error: updateError } = await supabase
            .from('order_logs')
            .update(insertData)
            .eq('id', existingRetry.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('order_logs')
            .insert(insertData);
          error = insertError;
        }
      }

      if (error) {
        console.error(`[OrderProcessor] Failed to log order ${shopifyOrderId}:`, error.message);
        console.error(`[OrderProcessor] Error details:`, JSON.stringify(error, null, 2));
        // Don't throw - logging failures shouldn't break order processing
        // Caller can check return value if needed
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (logError) {
      // Don't throw - logging failures shouldn't break order processing
      console.error(`[OrderProcessor] Error logging order ${shopifyOrderId}:`, logError.message);
      return { success: false, error: logError.message };
    }
  }
}

module.exports = new OrderProcessor();

