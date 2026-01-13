// Import Node.js adapter for Shopify API runtime
require('@shopify/shopify-api/adapters/node');
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const config = require('../config');
const sessionStorage = require('./sessionStorage');

/**
 * Shopify API Client
 * Handles communication with Shopify API
 */
class ShopifyClient {
  constructor() {
    // hostName should be without https:// (e.g., "localhost:3000" or "your-domain.com")
    // This is used to construct callback URLs
    let hostName = config.shopify.hostName || 'localhost:3000';
    
    // Remove https:// or http:// if present
    hostName = hostName.replace(/^https?:\/\//, '');
    
    this.shopify = shopifyApi({
      apiKey: config.shopify.apiKey,
      apiSecretKey: config.shopify.apiSecret,
      scopes: config.shopify.scopes.split(','),
      hostName: hostName,
      apiVersion: LATEST_API_VERSION,
      isEmbeddedApp: true, // Set to true for embedded apps (as per guide)
      // Use custom session storage
      sessionStorage: {
        storeSession: async (session) => {
          await sessionStorage.storeSession(session.id, session);
        },
        loadSession: async (id) => {
          return await sessionStorage.loadSession(id);
        },
        deleteSession: async (id) => {
          await sessionStorage.deleteSession(id);
        },
      },
    });
  }

  /**
   * Get Shopify session from shop domain
   * @param {string} shop - Shop domain (e.g., 'your-shop.myshopify.com')
   * @returns {Object|null} Shopify session or null if not authenticated
   */
  async getSession(shop) {
    try {
      // Normalize shop parameter
      shop = shop.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
      
      // For offline sessions, use getOfflineId (not getJwtSessionId)
      // This matches the session ID format used when storing sessions: "offline_shop.myshopify.com"
      const sessionId = this.shopify.session.getOfflineId(shop);
      return await sessionStorage.loadSession(sessionId);
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Get Shopify session from request
   * @param {Object} req - Express request object
   * @returns {Object|null} Shopify session or null if not authenticated
   */
  async getSessionFromRequest(req) {
    const shop = req.query.shop || req.body.shop || req.headers['x-shopify-shop-domain'];
    if (!shop) {
      return null;
    }
    return await this.getSession(shop);
  }

  /**
   * Get all orders from Shopify
   * @param {Object} session - Shopify session
   * @param {Object} options - Query options (limit, status, etc.)
   * @returns {Promise<Array>} Array of orders
   */
  async getOrders(session, options = {}) {
    try {
      if (!session || !session.accessToken) {
        throw new Error('No valid session found. Please authenticate first.');
      }

      const client = new this.shopify.clients.Rest({ session });
      
      const params = {
        limit: options.limit || 250,
        status: options.status || 'any',
        ...options,
      };

      const response = await client.get({
        path: 'orders',
        query: params,
      });

      return response.body.orders || [];
    } catch (error) {
      console.error('Error fetching Shopify orders:', error);
      throw error;
    }
  }

  /**
   * Get a specific order by ID
   * @param {Object} session - Shopify session
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order object
   */
  async getOrder(session, orderId) {
    try {
      if (!session || !session.accessToken) {
        throw new Error('No valid session found. Please authenticate first.');
      }

      const client = new this.shopify.clients.Rest({ session });
      
      const response = await client.get({
        path: `orders/${orderId}`,
      });

      return response.body.order;
    } catch (error) {
      console.error('Error fetching Shopify order:', error);
      throw error;
    }
  }

  /**
   * Update order tags (useful for tracking sync status)
   * @param {Object} session - Shopify session
   * @param {string} orderId - Order ID
   * @param {Array} tags - Array of tags
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderTags(session, orderId, tags) {
    try {
      if (!session || !session.accessToken) {
        throw new Error('No valid session found. Please authenticate first.');
      }

      const client = new this.shopify.clients.Rest({ session });
      
      const response = await client.put({
        path: `orders/${orderId}`,
        data: {
          order: {
            id: orderId,
            tags: tags.join(', '),
          },
        },
      });

      return response.body.order;
    } catch (error) {
      console.error('Error updating order tags:', error);
      throw error;
    }
  }

  /**
   * Register webhooks with Shopify
   * @param {Object} session - Shopify session
   * @param {Array} webhooks - Array of webhook configurations
   * @returns {Promise<Array>} Registered webhooks
   */
  async registerWebhooks(session, webhooks) {
    try {
      if (!session || !session.accessToken) {
        throw new Error('No valid session found. Please authenticate first.');
      }

      const client = new this.shopify.clients.Rest({ session });
      const registered = [];

      for (const webhook of webhooks) {
        try {
          const response = await client.post({
            path: 'webhooks',
            data: {
              webhook: {
                topic: webhook.topic,
                address: webhook.address,
                format: webhook.format || 'json',
              },
            },
          });
          registered.push(response.body.webhook);
          console.log(`✅ Registered webhook: ${webhook.topic}`);
        } catch (error) {
          // Check if webhook already exists (422 with "already been taken")
          const errorBody = error.response?.body || {};
          const errorMessage = JSON.stringify(errorBody);
          
          if (errorMessage.includes('already been taken') || errorMessage.includes('already exists')) {
            console.log(`ℹ️ Webhook ${webhook.topic} already registered (this is fine - webhook is active)`);
            // Try to get existing webhook to include in response
            try {
              const listResponse = await client.get({
                path: 'webhooks',
                query: { topic: webhook.topic },
              });
              const existingWebhook = listResponse.body.webhooks?.find(
                w => w.address === webhook.address && w.topic === webhook.topic
              );
              if (existingWebhook) {
                registered.push(existingWebhook);
                console.log(`✅ Found existing webhook: ${webhook.topic} at ${webhook.address}`);
              }
            } catch (listError) {
              // Ignore list error, webhook exists anyway
            }
          } else {
            console.error(`❌ Failed to register webhook ${webhook.topic}:`, error.message);
          }
        }
      }

      return registered;
    } catch (error) {
      console.error('Error registering webhooks:', error);
      throw error;
    }
  }
}

module.exports = new ShopifyClient();

