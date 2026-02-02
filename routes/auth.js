const express = require('express');
const router = express.Router();
const shopifyClient = require('../services/shopifyClient');
const sessionStorage = require('../services/sessionStorage'); // Keep for backward compatibility during migration
const config = require('../config');
const { upsertShop } = require('../services/shopRepo');
const { normalizeShop } = require('../utils/normalizeShop');

/**
 * OAuth Install Route
 * Redirects user to Shopify OAuth authorization page
 * GET /auth/install?shop=your-shop.myshopify.com
 */
router.get('/install', async (req, res) => {
  try {
    let { shop } = req.query;

    if (!shop) {
      return res.status(400).send('Missing shop parameter. Use: /auth/install?shop=your-shop.myshopify.com');
    }

    // Normalize shop parameter (Shopify library requires clean format)
    shop = shop.trim().toLowerCase();
    
    // Remove protocol if present
    shop = shop.replace(/^https?:\/\//, '');
    
    // Remove trailing slash and path
    shop = shop.split('/')[0];
    
    // Validate shop domain format
    if (!shop.includes('.myshopify.com')) {
      return res.status(400).send('Invalid shop domain. Must be in format: your-shop.myshopify.com');
    }
    
    // Ensure it ends with .myshopify.com (no extra characters)
    if (!shop.endsWith('.myshopify.com')) {
      return res.status(400).send('Invalid shop domain. Must end with .myshopify.com');
    }

    console.log(`[Auth] Starting OAuth for shop: ${shop}`);

    // Use Shopify library's OAuth flow
    await shopifyClient.shopify.auth.begin({
      shop,
      callbackPath: '/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (error) {
    console.error('OAuth install error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      shop: req.query.shop,
    });
    
    // Provide helpful error message for invalid shop domain
    let errorMessage = `OAuth install failed: ${error.message}`;
    
    if (error.message.includes('invalid shop') || error.message.includes('Invalid shop')) {
      errorMessage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Shop Domain</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #f6f6f7;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            h1 { color: #d72c0d; margin-bottom: 16px; }
            p { color: #6d7175; line-height: 1.6; margin-bottom: 12px; }
            code {
              background: #f6f6f7;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: monospace;
            }
            .steps {
              background: #f6f6f7;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .steps ol {
              margin-left: 20px;
              color: #202223;
            }
            .steps li {
              margin-bottom: 8px;
            }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background: #008060;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            }
            a:hover { background: #006e52; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Invalid Shop Domain</h1>
            <p>The shop domain <code>${req.query.shop || 'provided'}</code> is not valid or doesn't exist.</p>
            
            <div class="steps">
              <strong>To find your correct Shopify domain:</strong>
              <ol>
                <li>Go to your Shopify admin panel</li>
                <li>Look at the URL in your browser - it will show: <code>admin.shopify.com/store/YOUR-STORE-NAME</code></li>
                <li>Your Shopify domain is: <code>YOUR-STORE-NAME.myshopify.com</code></li>
                <li>Make sure it ends with <code>.myshopify.com</code></li>
              </ol>
            </div>
            
            <p><strong>Example:</strong> If your admin URL is <code>admin.shopify.com/store/babybow</code>, then your Shopify domain is <code>babybow.myshopify.com</code></p>
            
            <a href="/">← Go back and try again</a>
          </div>
        </body>
        </html>
      `;
    }
    
    res.status(500).send(errorMessage);
  }
});

/**
 * OAuth Callback Route
 * Handles the callback from Shopify after authorization
 * GET /auth/callback?shop=...&code=...&hmac=...
 */
router.get('/callback', async (req, res) => {
  try {
    const { shop: shopParam, code } = req.query;

    if (!shopParam || !code) {
      return res.status(400).send('Missing required parameters: shop or code');
    }

    // Use Shopify library's callback handler (works with ngrok HTTPS URLs)
    const callbackResponse = await shopifyClient.shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    // Store the session
    const session = callbackResponse.session;
    if (session && session.id) {
      console.log('[Auth] OAuth callback successful, storing session...');
      console.log('[Auth] Session ID:', session.id);
      console.log('[Auth] Shop from session:', session.shop);
      console.log('[Auth] Shop from query:', shopParam);
      console.log('[Auth] Has access token:', !!session.accessToken);
      console.log('[Auth] Scopes:', session.scope || 'not specified');
      
      // Normalize shop domain ONCE using utility
      const normalizedShop = normalizeShop(session.shop || shopParam);
      console.log('[Auth] Normalized shop:', normalizedShop);
      
      // Store in Supabase (persistent storage)
      try {
        await upsertShop({
          shop: normalizedShop,
          accessToken: session.accessToken,
          scopes: session.scope || config.shopify.scopes,
        });
        console.log('[Auth] ✅ Shop saved to Supabase:', normalizedShop);
      } catch (dbError) {
        console.error('[Auth] ❌ Failed to save shop to Supabase:', dbError.message);
        // Fallback to in-memory storage if Supabase not configured
        if (!process.env.SUPABASE_URL) {
          console.warn('[Auth] Supabase not configured, using in-memory storage (sessions will be lost on restart)');
          const sessionWithMetadata = {
            ...session,
            shop: normalizedShop,
            installedAt: new Date().toISOString(),
            scopes: session.scope || config.shopify.scopes,
          };
          await sessionStorage.storeSession(session.id, sessionWithMetadata);
        } else {
          // Supabase is configured but failed - this is an error
          throw new Error(`Failed to save shop to database: ${dbError.message}`);
        }
      }
      
      // Auto-register webhooks after successful installation
      try {
        const config = require('../config');
        const hostName = config.shopify.hostName || 'localhost:3000';
        const protocol = hostName.includes('localhost') ? 'http' : 'https';
        const webhookUrl = `${protocol}://${hostName}`;
        
        // Register order/app webhooks
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
        
        const registered = await shopifyClient.registerWebhooks(session, webhooks);
        console.log(`[Auth] Auto-registered ${registered.length} order/app webhooks for shop: ${session.shop}`);
        
        // Register GDPR compliance webhooks (required for public apps)
        try {
          const gdprWebhooks = await shopifyClient.registerGDPRWebhooks(session, webhookUrl);
          console.log(`[Auth] ✅ Auto-registered ${gdprWebhooks.length} GDPR compliance webhooks for shop: ${session.shop}`);
        } catch (gdprError) {
          // Log error but don't fail installation - GDPR webhooks can be registered manually later
          console.error('[Auth] ⚠️ Failed to auto-register GDPR webhooks (non-critical):', gdprError.message);
        }
      } catch (webhookError) {
        // Log error but don't fail installation - webhooks can be registered manually later
        console.error('[Auth] Failed to auto-register webhooks (non-critical):', webhookError.message);
      }
    } else {
      throw new Error('Failed to create session');
    }

    // Redirect to main app (embedded in Shopify admin)
    // Use normalized shop domain
    const shopDomain = session.shop || shopParam;
    let redirectShop = shopDomain;
    
    // Normalize shop domain for redirect ONCE using utility
    if (redirectShop) {
      redirectShop = normalizeShop(redirectShop);
    }
    
    console.log('[Auth] Redirecting to app with shop:', redirectShop);
    
    if (redirectShop) {
      // Redirect to /app (embedded admin UI) instead of / (public install page)
      const redirectUrl = `/app?shop=${encodeURIComponent(redirectShop)}`;
      console.log(`[Auth] Redirect URL: ${redirectUrl}`);
      res.redirect(redirectUrl);
    } else {
      console.log('[Auth] No shop for redirect, going to success page');
      res.redirect('/auth/success');
    }
  } catch (error) {
    console.error('OAuth callback failed:', error);
    res.status(500).send(`OAuth callback failed: ${error.message}`);
  }
});

/**
 * OAuth Success Page
 * Shows success message after installation
 */
router.get('/success', (req, res) => {
  res.send('🎉 App installed successfully!');
});

/**
 * Check if shop is authenticated
 * GET /auth/check?shop=your-shop.myshopify.com
 */
router.get('/check', async (req, res) => {
  const startTime = Date.now();
  let { shop } = req.query;

  try {
    console.log(`[Auth] /auth/check called for shop: ${shop || 'not provided'}`);

    if (!shop) {
      console.warn('[Auth] Missing shop parameter');
      return res.status(400).json({
        success: false,
        error: 'Shop parameter is required',
      });
    }

    // Normalize shop parameter ONCE using utility
    try {
      shop = normalizeShop(shop);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shop domain format',
      });
    }
    console.log(`[Auth] Normalized shop: ${shop}`);

    // Check Supabase first (primary source of truth)
    const { getShop } = require('../services/shopRepo');
    
    try {
      const shopData = await getShop(shop);
      
      if (shopData && shopData.access_token) {
        const totalDuration = Date.now() - startTime;
        console.log(`[Auth] ✅ Shop found in Supabase for ${shop}, authenticated: true (total: ${totalDuration}ms)`);
        return res.json({
          success: true,
          authenticated: true,
          shop: shop,
          installedAt: shopData.installed_at,
          type: 'oauth',
          storage: 'supabase',
        });
      }
    } catch (dbError) {
      console.error(`[Auth] Error checking Supabase for ${shop}:`, dbError.message);
      // Fall through to in-memory check if Supabase not configured
      if (process.env.SUPABASE_URL) {
        // Supabase is configured but failed - this is an error
        throw dbError;
      }
    }

    // Fallback: Check in-memory storage (for backward compatibility during migration)
    if (!process.env.SUPABASE_URL) {
      console.warn('[Auth] Supabase not configured, checking in-memory storage');
      try {
        const session = await shopifyClient.getSession(shop);
        if (session && session.accessToken) {
          const totalDuration = Date.now() - startTime;
          console.log(`[Auth] ✅ Found in-memory session for ${shop} (total: ${totalDuration}ms)`);
          return res.json({
            success: true,
            authenticated: true,
            shop: shop,
            type: 'oauth',
            storage: 'memory',
            warning: 'Using in-memory storage. Sessions will be lost on restart. Configure Supabase for persistence.',
          });
        }
      } catch (sessionError) {
        console.error(`[Auth] Error checking in-memory storage:`, sessionError.message);
      }
    }

    // No session found
    const totalDuration = Date.now() - startTime;
    console.log(`[Auth] ❌ No session found for ${shop}, authenticated: false (total: ${totalDuration}ms)`);
    res.json({
      success: true,
      authenticated: false,
      shop: shop,
      installUrl: `/auth/install?shop=${encodeURIComponent(shop)}`,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[Auth] Auth check error (${totalDuration}ms):`, error.message);
    console.error('[Auth] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


module.exports = router;

