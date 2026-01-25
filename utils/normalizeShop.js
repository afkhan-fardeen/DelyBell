/**
 * Shop Domain Normalization Utility
 * Normalizes shop domain to consistent format
 * Use this everywhere. No exceptions.
 * 
 * @param {string} shop - Shop domain (any format)
 * @returns {string} Normalized shop domain (e.g., 'store.myshopify.com')
 */
function normalizeShop(shop) {
  if (!shop || typeof shop !== 'string') {
    throw new Error('Shop parameter is required and must be a string');
  }

  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
}

module.exports = { normalizeShop };
