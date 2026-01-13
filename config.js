require('dotenv').config();

module.exports = {
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecret: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_SCOPES || 'read_orders,write_orders',
    hostName: process.env.SHOPIFY_HOST,
  },
  delybell: {
    apiUrl: process.env.DELYBELL_API_URL || 'https://new.api.delybell.com',
    accessKey: process.env.DELYBELL_ACCESS_KEY,
    secretKey: process.env.DELYBELL_SECRET_KEY,
  },
  server: {
    port: process.env.PORT || 3000,
  },
};

