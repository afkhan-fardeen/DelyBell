const express = require('express');
const router = express.Router();
const shopifyClient = require('../services/shopifyClient');
const sessionStorage = require('../services/sessionStorage');

/**
 * Connect Custom App (No OAuth, uses Admin API access token)
 * POST /custom-app/connect
 * Body: { shop: 'store.myshopify.com', accessToken: 'shpat_...' }
 */
router.post('/connect', async (req, res) => {
  try {
    const { shop, accessToken } = req.body;

    if (!shop || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Shop and accessToken are required',
      });
    }

    // Normalize shop
    let normalizedShop = shop.trim().toLowerCase();
    normalizedShop = normalizedShop.replace(/^https?:\/\//, '').split('/')[0];
    
    if (!normalizedShop.includes('.myshopify.com')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shop domain format',
      });
    }

    // Validate access token format (should start with shpat_)
    if (!accessToken.startsWith('shpat_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid access token format. Should start with "shpat_"',
      });
    }

    console.log(`[CustomApp] Connecting custom app for shop: ${normalizedShop}`);

    // Test the access token by making a simple API call
    try {
      const testSession = {
        shop: normalizedShop,
        accessToken: accessToken,
        id: `custom_${normalizedShop}`, // Custom session ID format
      };

      // Test API call to verify token works
      const client = new shopifyClient.shopify.clients.Rest({ session: testSession });
      const shopInfo = await client.get({ path: 'shop' });

      if (!shopInfo || !shopInfo.body || !shopInfo.body.shop) {
        throw new Error('Invalid response from Shopify API');
      }

      console.log(`[CustomApp] Access token validated for shop: ${normalizedShop}`);

      // Create session object (similar to OAuth session)
      const session = {
        id: `custom_${normalizedShop}`,
        shop: normalizedShop,
        accessToken: accessToken,
        isOnline: false,
        scope: 'read_orders,write_orders', // Custom apps have full access
        expires: null, // Custom app tokens don't expire
        state: 'custom_app', // Flag to identify custom app sessions
      };

      // Store session
      await sessionStorage.storeSession(session.id, session);
      console.log(`[CustomApp] Session stored for shop: ${normalizedShop}`);

      // Register webhooks using Admin API
      try {
        const webhookUrl = process.env.SHOPIFY_HOST 
          ? `https://${process.env.SHOPIFY_HOST}`
          : 'https://delybell.onrender.com';

        const webhooks = [
          {
            topic: 'orders/create',
            address: `${webhookUrl}/webhooks/orders/create`,
            format: 'json',
          },
          {
            topic: 'orders/updated',
            address: `${webhookUrl}/webhooks/orders/update`,
            format: 'json',
          },
          {
            topic: 'app/uninstalled',
            address: `${webhookUrl}/webhooks/app/uninstalled`,
            format: 'json',
          },
        ];

        // Register webhooks using Admin API
        for (const webhook of webhooks) {
          try {
            await client.post({
              path: 'webhooks',
              data: {
                webhook: {
                  topic: webhook.topic,
                  address: webhook.address,
                  format: webhook.format,
                },
              },
            });
            console.log(`[CustomApp] Registered webhook: ${webhook.topic}`);
          } catch (webhookError) {
            // Check if webhook already exists
            if (webhookError.response?.body?.errors?.address?.includes('already been taken')) {
              console.log(`[CustomApp] Webhook ${webhook.topic} already exists`);
            } else {
              console.error(`[CustomApp] Failed to register webhook ${webhook.topic}:`, webhookError.message);
            }
          }
        }
      } catch (webhookError) {
        console.error('[CustomApp] Webhook registration error (non-critical):', webhookError.message);
        // Don't fail connection if webhooks fail - they can be registered manually
      }

      res.json({
        success: true,
        message: 'Store connected successfully',
        shop: normalizedShop,
      });
    } catch (apiError) {
      console.error('[CustomApp] API test failed:', apiError.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid access token. Please check your Admin API access token.',
        details: apiError.message,
      });
    }
  } catch (error) {
    console.error('[CustomApp] Connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Check if custom app is connected
 * GET /custom-app/check?shop=store.myshopify.com
 */
router.get('/check', async (req, res) => {
  try {
    const { shop } = req.query;

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop parameter is required',
      });
    }

    // Normalize shop
    let normalizedShop = shop.trim().toLowerCase();
    normalizedShop = normalizedShop.replace(/^https?:\/\//, '').split('/')[0];

    // Check for custom app session
    const customSessionId = `custom_${normalizedShop}`;
    const session = await sessionStorage.loadSession(customSessionId);

    if (session && session.accessToken && session.state === 'custom_app') {
      res.json({
        success: true,
        connected: true,
        shop: normalizedShop,
        type: 'custom_app',
      });
    } else {
      res.json({
        success: true,
        connected: false,
        shop: normalizedShop,
      });
    }
  } catch (error) {
    console.error('[CustomApp] Check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
