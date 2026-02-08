// Import Node.js adapter for Shopify API runtime
// This must be imported before shopifyApi to ensure proper runtime setup
try {
  require('@shopify/shopify-api/adapters/node');
} catch (error) {
  console.error('[Shopify] Failed to load Node.js adapter:', error.message);
  console.error('[Shopify] Make sure @shopify/shopify-api is installed: npm install');
  throw error;
}

const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const config = require('../config');
const sessionStorage = require('../services/sessionStorage');

/**
 * Shopify API Client Setup
 * Uses Shopify CLI recommended configuration
 * Compatible with @shopify/shopify-api v9.0.0
 */
let shopify;

try {
  shopify = shopifyApi({
    apiKey: config.shopify.apiKey,
    apiSecretKey: config.shopify.apiSecret,
    scopes: config.shopify.scopes.split(','),
    hostName: config.shopify.hostName?.replace(/^https?:\/\//, '') || 'localhost:3000',
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true,
    // Custom session storage using Supabase
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
  
  console.log('[Shopify] ✅ Shopify API client initialized successfully');
} catch (error) {
  console.error('[Shopify] ❌ Failed to initialize Shopify API client:', error.message);
  console.error('[Shopify] Check your SHOPIFY_API_KEY and SHOPIFY_API_SECRET environment variables');
  throw error;
}

module.exports = { shopify };
