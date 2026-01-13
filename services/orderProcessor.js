const delybellClient = require('./delybellClient');
const orderTransformer = require('./orderTransformer');
const shopifyClient = require('./shopifyClient');

/**
 * Order Processor Service
 * Handles the complete order processing workflow
 */
class OrderProcessor {
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

      // Step 1: Transform Shopify order to Delybell format
      const delybellOrderData = orderTransformer.transformShopifyToDelybell(
        shopifyOrder,
        mappingConfig
      );

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

