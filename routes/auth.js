const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const shopifyClient = require('../services/shopifyClient');
const sessionStorage = require('../services/sessionStorage'); // Keep for backward compatibility during migration
const config = require('../config');
const { upsertShop } = require('../services/shopRepo');
const { normalizeShop } = require('../utils/normalizeShop');
const { supabase } = require('../services/db');

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

    // WORKAROUND: Store OAuth state in database instead of relying on cookies
    // This fixes the cookie issue when behind proxies like Render
    const state = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store state in database
    if (process.env.SUPABASE_URL) {
      const { error: stateError } = await supabase
        .from('oauth_states')
        .insert({
          state: state,
          shop: shop,
          expires_at: expiresAt.toISOString(),
        });
      
      if (stateError) {
        console.error('[Auth] Failed to store OAuth state:', stateError);
        // Continue anyway - try library method
      } else {
        console.log(`[Auth] Stored OAuth state in database: ${state.substring(0, 8)}...`);
      }
    }

    // Use Shopify library's OAuth flow
    // If cookies fail, we'll fall back to manual OAuth in callback
    try {
      await shopifyClient.shopify.auth.begin({
        shop,
        callbackPath: '/auth/callback',
        isOnline: false,
        rawRequest: req,
        rawResponse: res,
      });
    } catch (beginError) {
      console.error('[Auth] Library OAuth begin failed, will use manual flow:', beginError.message);
      // If library fails, we'll handle manually in callback
      // For now, let the error propagate - the library should still work
      throw beginError;
    }
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

    console.log('[Auth] OAuth callback received:', {
      shop: shopParam,
      hasCode: !!code,
      cookies: req.cookies ? Object.keys(req.cookies) : 'no cookies',
      headers: {
        cookie: req.headers.cookie ? 'present' : 'missing',
        referer: req.headers.referer,
      },
    });

    if (!shopParam || !code) {
      return res.status(400).send('Missing required parameters: shop or code');
    }

    // Use Shopify library's callback handler (works with ngrok HTTPS URLs)
    // The library handles cookie reading internally
    let callbackResponse;
    try {
      callbackResponse = await shopifyClient.shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });
    } catch (callbackError) {
      // Handle callback-specific errors (especially cookie errors)
      console.error('[Auth] OAuth callback error:', callbackError.message);
      console.error('[Auth] Callback error details:', {
        name: callbackError.name,
        message: callbackError.message,
        shop: shopParam,
        hasCode: !!code,
        cookies: req.cookies ? Object.keys(req.cookies) : 'no cookies',
        cookieHeader: req.headers.cookie ? 'present' : 'missing',
      });
      
      // If it's a cookie error, try manual OAuth flow as fallback
      if (callbackError.message.includes('cookie') || callbackError.message.includes('Cookie') || callbackError.name === 'CookieNotFound') {
        console.error('[Auth] Cookie-related error detected. Attempting manual OAuth flow...');
        
        // MANUAL OAUTH FALLBACK: Complete OAuth without relying on cookies
        try {
          const { hmac: hmacParam } = req.query;
          
          // Verify HMAC manually
          const queryString = Object.keys(req.query)
            .filter(key => key !== 'hmac' && key !== 'signature')
            .sort()
            .map(key => `${key}=${req.query[key]}`)
            .join('&');
          
          const calculatedHmac = crypto
            .createHmac('sha256', config.shopify.apiSecret)
            .update(queryString)
            .digest('hex');
          
          if (hmacParam !== calculatedHmac) {
            throw new Error('Invalid HMAC signature');
          }
          
          console.log('[Auth] HMAC verified, proceeding with manual OAuth...');
          
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
          
          // Store session (this will be handled below)
          callbackResponse = { session };
          
          console.log('[Auth] Manual OAuth flow completed successfully, continuing with session storage...');
          // Continue to session storage code below (don't throw error)
        } catch (manualError) {
          console.error('[Auth] Manual OAuth fallback also failed:', manualError.message);
          return res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>OAuth Error</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
                h1 { color: #d72c0d; }
                code { background: #f6f6f7; padding: 2px 6px; border-radius: 3px; }
              </style>
            </head>
            <body>
              <div class="error">
                <h1>OAuth Authentication Error</h1>
                <p>The OAuth process could not complete.</p>
                <p><strong>Error:</strong> ${callbackError.message}</p>
                <p><strong>Fallback Error:</strong> ${manualError.message}</p>
                <p>Please try:</p>
                <ol>
                  <li>Clear your browser cookies for this domain</li>
                  <li>Try the installation again</li>
                  <li>If the issue persists, contact support</li>
                </ol>
                <p><a href="/auth/install?shop=${shopParam || 'your-shop.myshopify.com'}">Try Again</a></p>
              </div>
            </body>
            </html>
          `);
        }
      } else {
        // Not a cookie error - re-throw
        throw callbackError;
      }
    }

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
        
        // CRITICAL: Verify the shop was saved before redirecting
        // This ensures /app route can find the session immediately
        const { getShop } = require('../services/shopRepo');
        let verifyAttempts = 0;
        const maxVerifyAttempts = 8; // Increased attempts
        const verifyDelay = 300; // Increased delay
        let shopVerified = false;
        
        console.log('[Auth] Verifying shop was saved to Supabase...');
        
        while (verifyAttempts < maxVerifyAttempts && !shopVerified) {
          const savedShop = await getShop(normalizedShop);
          if (savedShop && savedShop.access_token) {
            shopVerified = true;
            console.log(`[Auth] ✅ Verified shop saved in Supabase (attempt ${verifyAttempts + 1}/${maxVerifyAttempts})`);
          } else {
            verifyAttempts++;
            if (verifyAttempts < maxVerifyAttempts) {
              console.log(`[Auth] ⏳ Shop not yet available in Supabase, waiting ${verifyDelay}ms (attempt ${verifyAttempts}/${maxVerifyAttempts})...`);
              await new Promise(resolve => setTimeout(resolve, verifyDelay));
            }
          }
        }
        
        if (!shopVerified) {
          console.warn('[Auth] ⚠️ Shop saved but not immediately verifiable after all attempts - proceeding anyway');
          console.warn('[Auth] The /app route will retry authentication automatically');
        }
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
    // CRITICAL: Always use shopParam as fallback if session.shop is missing
    const shopDomain = session?.shop || shopParam;
    
    if (!shopDomain) {
      console.error('[Auth] ❌ CRITICAL: No shop domain available for redirect!');
      console.error('[Auth] Session shop:', session?.shop);
      console.error('[Auth] Shop param:', shopParam);
      return res.status(500).send('OAuth callback error: Missing shop domain');
    }
    
    // Normalize shop domain for redirect
    const redirectShop = normalizeShop(shopDomain);
    
    // Get host parameter from query (Shopify passes this for embedded apps)
    const host = req.query.host;
    
    console.log('[Auth] ✅ Redirecting to app dashboard');
    console.log('[Auth] Shop:', redirectShop);
    console.log('[Auth] Host parameter:', host || 'not provided');
    
    // CRITICAL: Always redirect to /app with shop parameter
    // This is the embedded dashboard route - never redirect to / or /auth/success
    // Use absolute URL for embedded apps to ensure proper redirect
    const protocol = req.protocol || 'https';
    const baseUrl = config.shopify.hostName 
      ? (config.shopify.hostName.includes('localhost') ? 'http://' : 'https://') + config.shopify.hostName
      : `${protocol}://${req.get('host')}`;
    
    let redirectUrl = `${baseUrl}/app?shop=${encodeURIComponent(redirectShop)}`;
    if (host) {
      redirectUrl += `&host=${encodeURIComponent(host)}`;
    }
    
    console.log(`[Auth] Final redirect URL: ${redirectUrl}`);
    console.log(`[Auth] Base URL: ${baseUrl}`);
    res.redirect(redirectUrl);
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

