const axios = require('axios');
const config = require('../config');

/**
 * Delybell API Client
 * Handles all communication with Delybell External APIs
 */
class DelybellClient {
  constructor() {
    this.baseURL = config.delybell.apiUrl;
    this.accessKey = config.delybell.accessKey;
    this.secretKey = config.delybell.secretKey;
  }

  /**
   * Get default headers for API requests
   */
  getHeaders() {
    return {
      'x-access-key': this.accessKey,
      'x-secret-key': this.secretKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get list of service types
   * @param {string} search - Optional search term
   * @returns {Promise<Object>} Service types list
   */
  async getServiceTypes(search = null) {
    try {
      const params = search ? { search } : {};
      const response = await axios.get(
        `${this.baseURL}/v1/customer/external/master/service_types`,
        {
          headers: this.getHeaders(),
          params,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching service types:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get list of blocks
   * @param {string} search - Optional search term
   * @returns {Promise<Object>} Blocks list
   */
  async getBlocks(search = null) {
    try {
      const params = search ? { search } : {};
      const response = await axios.get(
        `${this.baseURL}/v1/customer/external/master/blocks`,
        {
          headers: this.getHeaders(),
          params,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching blocks:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get list of roads for a specific block
   * @param {number} blockId - Block ID
   * @param {string} search - Optional search term
   * @returns {Promise<Object>} Roads list
   */
  async getRoads(blockId, search = null) {
    try {
      const params = { block_id: blockId };
      if (search) params.search = search;
      
      const response = await axios.get(
        `${this.baseURL}/v1/customer/external/master/roads`,
        {
          headers: this.getHeaders(),
          params,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching roads:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get list of buildings for a specific road
   * @param {number} roadId - Road ID
   * @param {number} blockId - Block ID (required by API)
   * @param {string} search - Optional search term
   * @returns {Promise<Object>} Buildings list
   */
  async getBuildings(roadId, blockId, search = null) {
    try {
      const params = { 
        road_id: roadId,
        block_id: blockId 
      };
      if (search) params.search = search;
      
      const response = await axios.get(
        `${this.baseURL}/v1/customer/external/master/buildings`,
        {
          headers: this.getHeaders(),
          params,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching buildings:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Calculate shipping charge for an order
   * @param {Object} orderData - Order data for shipping calculation
   * @returns {Promise<Object>} Shipping charge calculation result
   */
  async calculateShippingCharge(orderData) {
    try {
      const response = await axios.post(
        `${this.baseURL}/v1/customer/external/order/shipping_charge`,
        orderData,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error calculating shipping charge:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create an external order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order details
   */
  async createOrder(orderData) {
    try {
      console.log('📦 Creating order in Delybell with payload:', JSON.stringify(orderData, null, 2));
      const response = await axios.post(
        `${this.baseURL}/v1/customer/external/order/create`,
        orderData,
        {
          headers: this.getHeaders(),
        }
      );
      console.log('✅ Order created successfully:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Error creating order:', error.response?.status, error.response?.statusText);
      console.error('❌ Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ Error message:', error.message);
      throw error;
    }
  }

  /**
   * Get order tracking information
   * @param {string} orderId - Order ID (can be customer_input_order_id or delybell order id)
   * @returns {Promise<Object>} Tracking information
   */
  async trackOrder(orderId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/customer/external/order/tracking/${orderId}`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error tracking order:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get order print sticker (base64)
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Base64 encoded sticker
   */
  async getOrderSticker(orderId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/customer/external/order/print`,
        {
          headers: this.getHeaders(),
          params: {
            file_type: 'base64',
            order_id: orderId,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching order sticker:', error.response?.data || error.message);
      throw error;
    }
  }

}

module.exports = new DelybellClient();

