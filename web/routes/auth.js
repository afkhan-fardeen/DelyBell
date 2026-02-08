const express = require('express');
const router = express.Router();
const { shopify } = require('../shopify');
const { upsertShop } = require('../../services/shopRepo');
const { normalizeShop } = require('../../utils/normalizeShop');
const config = require('../../config');

/**
 * OAuth Install Route
 * Uses Shopify API's built-in OAuth flow
 * GET /auth/install?shop=your-shop.myshopify.com
 */
router.get('/install', async (req, res) => {
  try {
    let { shop } = req.query;

    if (!shop) {
      return res.status(400).send('Missing shop parameter. Use: /auth/install?shop=your-shop.myshopify.com');
    }

    // Normalize shop parameter
    shop = shop.trim().toLowerCase();
    shop = shop.replace(/^https?:\/\//, '');
    shop = shop.split('/')[0];
    
    // Validate shop domain format
    if (!shop.includes('.myshopify.com')) {
      return res.status(400).send('Invalid shop domain. Must be in format: your-shop.myshopify.com');
    }
    
    if (!shop.endsWith('.myshopify.com')) {
      return res.status(400).send('Invalid shop domain. Must end with .myshopify.com');
    }

    console.log(`[Auth] Starting OAuth for shop: ${shop}`);

    // Use Shopify API's OAuth begin method
    await shopify.auth.begin({
      shop,
      callbackPath: '/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (error) {
    console.error('OAuth install error:', error);
    res.status(500).send(`OAuth install failed: ${error.message}`);
  }
});

/**
 * OAuth Callback Route
 * Handles the callback from Shopify after authorization
 * GET /auth/callback?shop=...&code=...&hmac=...
 */
router.get('/callback', async (req, res) => {
  try {
    const { shop: shopParam, code, hmac } = req.query;

    console.log('[Auth] OAuth callback received:', {
      shop: shopParam,
      hasCode: !!code,
      hasHmac: !!hmac,
      cookies: req.cookies ? Object.keys(req.cookies) : 'no cookies',
      cookieHeader: req.headers.cookie ? 'present' : 'missing',
    });

    if (!shopParam || !code) {
      return res.status(400).send('Missing required parameters: shop or code');
    }

    let callbackResponse;
    
    // Try Shopify API's callback handler first
    try {
      callbackResponse = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });
    } catch (callbackError) {
      // If cookie-based OAuth fails, try manual OAuth flow
      // Check for various cookie-related error messages
      const cookieErrorMessages = [
        'cookie',
        'OAuth cookie',
        'Could not find an OAuth cookie',
        'CookieNotFound',
      ];
      
      const isCookieError = callbackError.message && 
        cookieErrorMessages.some(msg => callbackError.message.includes(msg));
      
      if (isCookieError) {
        console.error('[Auth] Cookie-based OAuth failed, attempting manual OAuth flow...');
        console.error('[Auth] Error:', callbackError.message);
        
        // Manual OAuth fallback
        const crypto = require('crypto');
        
        // Verify HMAC manually
        if (hmac) {
          const queryString = Object.keys(req.query)
            .filter(key => key !== 'hmac' && key !== 'signature')
            .sort()
            .map(key => `${key}=${req.query[key]}`)
            .join('&');
          
          const calculatedHmac = crypto
            .createHmac('sha256', config.shopify.apiSecret)
            .update(queryString)
            .digest('hex');
          
          if (hmac !== calculatedHmac) {
            throw new Error('Invalid HMAC signature');
          }
        }
        
        // Exchange code for access token manually
        const tokenResponse = await fetch(`https://${shopParam}/admin/oauth/access_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: config.shopify.apiKey,
            client_secret: config.shopify.apiSecret,
            code: code,
          }),
        });
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${errorText}`);
        }
        
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const scopes = tokenData.scope;
        
        console.log('[Auth] ✅ Manual OAuth successful, received access token');
        
        // Create session object manually
        const session = {
          id: `offline_${shopParam}`,
          shop: shopParam,
          accessToken: accessToken,
          scope: scopes,
          scopes: scopes,
          isOnline: false,
        };
        
        callbackResponse = { session };
      } else {
        // Re-throw if it's not a cookie error
        throw callbackError;
      }
    }

    // Store the session
    const session = callbackResponse.session;
    if (session && session.id) {
      console.log('[Auth] OAuth callback successful, storing session...');
      
      // Normalize shop domain
      const normalizedShop = normalizeShop(session.shop || shopParam);
      console.log('[Auth] Normalized shop:', normalizedShop);
      
      // Store in Supabase
      try {
        await upsertShop({
          shop: normalizedShop,
          accessToken: session.accessToken,
          scopes: session.scope || config.shopify.scopes,
        });
        console.log('[Auth] ✅ Shop saved to Supabase:', normalizedShop);
      } catch (dbError) {
        console.error('[Auth] ❌ Failed to save shop to Supabase:', dbError.message);
        throw new Error(`Failed to save shop to database: ${dbError.message}`);
      }
    } else {
      throw new Error('Failed to create session');
    }

    // Redirect to main app (embedded in Shopify admin)
    const shopDomain = session?.shop || shopParam;
    if (!shopDomain) {
      console.error('[Auth] ❌ CRITICAL: No shop domain available for redirect!');
      return res.status(500).send('OAuth callback error: Missing shop domain');
    }
    
    const redirectShop = normalizeShop(shopDomain);
    const host = req.query.host;
    
    console.log('[Auth] ✅ Redirecting to app dashboard');
    
    // Redirect to /app with shop parameter
    const protocol = req.protocol || 'https';
    const baseUrl = config.shopify.hostName 
      ? (config.shopify.hostName.includes('localhost') ? 'http://' : 'https://') + config.shopify.hostName
      : `${protocol}://${req.get('host')}`;
    
    let redirectUrl = `${baseUrl}/app?shop=${encodeURIComponent(redirectShop)}`;
    if (host) {
      redirectUrl += `&host=${encodeURIComponent(host)}`;
    }
    
    console.log(`[Auth] Final redirect URL: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback failed:', error);
    res.status(500).send(`OAuth callback failed: ${error.message}`);
  }
});

module.exports = router;
