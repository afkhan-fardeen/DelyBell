const express = require('express');
const router = express.Router();
const shopifyClient = require('../services/shopifyClient');
const sessionStorage = require('../services/sessionStorage');

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

    console.log(`🔐 Starting OAuth for shop: ${shop}`);

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
      await sessionStorage.storeSession(session.id, session);
      console.log('✅ Installed for shop:', session.shop);
      
      // Auto-register webhooks after successful installation
      try {
        const config = require('../config');
        const hostName = config.shopify.hostName || 'localhost:3000';
        const protocol = hostName.includes('localhost') ? 'http' : 'https';
        const webhookUrl = `${protocol}://${hostName}`;
        
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
        console.log(`✅ Auto-registered ${registered.length} webhooks for shop: ${session.shop}`);
      } catch (webhookError) {
        // Log error but don't fail installation - webhooks can be registered manually later
        console.error('⚠️ Failed to auto-register webhooks (non-critical):', webhookError.message);
      }
    } else {
      throw new Error('Failed to create session');
    }

    // Redirect to main app (embedded in Shopify admin)
    // If embedded app, redirect to /, otherwise to success page
    const shopDomain = session.shop || shopParam;
    if (shopDomain) {
      res.redirect(`/?shop=${shopDomain}`);
    } else {
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
  try {
    let { shop } = req.query;

    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop parameter is required',
      });
    }

    // Normalize shop parameter
    shop = shop.trim().toLowerCase();
    if (!shop.includes('.myshopify.com')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid shop domain format',
      });
    }
    shop = shop.replace(/^https?:\/\//, '').split('/')[0];

    // Try to get session using shopifyClient method (which handles session ID generation)
    try {
      const session = await shopifyClient.getSession(shop);
      
      // Debug: Check all stored sessions
      const allSessions = sessionStorage.getAllSessionIds();
      console.log('All stored session IDs:', allSessions);

      if (session && session.accessToken) {
        res.json({
          success: true,
          authenticated: true,
          shop: session.shop || shop,
          expiresAt: session.expires,
          sessionId: session.id,
        });
      } else {
        res.json({
          success: true,
          authenticated: false,
          shop: shop,
          installUrl: `/auth/install?shop=${shop}`,
          allSessions, // Debug info
        });
      }
    } catch (sessionError) {
      console.error('Session error:', sessionError);
      // If getSession fails, check if we have any sessions at all
      const allSessions = sessionStorage.getAllSessionIds();
      res.json({
        success: true,
        authenticated: false,
        shop: shop,
        installUrl: `/auth/install?shop=${shop}`,
        error: sessionError.message,
        allSessions, // Debug info
      });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Debug endpoint - List all sessions
 * GET /auth/debug/sessions
 */
router.get('/debug/sessions', (req, res) => {
  const allSessions = sessionStorage.getAllSessionIds();
  res.json({
    totalSessions: allSessions.length,
    sessionIds: allSessions,
  });
});

/**
 * Debug endpoint - Show OAuth configuration
 * GET /auth/debug/config
 */
router.get('/debug/config', (req, res) => {
  const config = require('../config');
  const hostName = config.shopify.hostName || 'localhost:3000';
  // For localhost, use http://, for production/ngrok use https://
  const protocol = hostName.includes('localhost') ? 'http' : 'https';
  const redirectUrl = `${protocol}://${hostName}/auth/callback`;
  
  res.json({
    hostName: hostName,
    redirectUrl: redirectUrl,
    callbackPath: '/auth/callback',
    protocol: protocol,
    apiKey: config.shopify.apiKey ? `${config.shopify.apiKey.substring(0, 8)}...` : 'NOT SET',
    message: 'Make sure this redirectUrl matches EXACTLY in Shopify app settings',
    note: hostName.includes('localhost') 
      ? 'Using http:// for localhost (Shopify allows this for custom apps)'
      : 'Using https:// for production/ngrok',
  });
});

module.exports = router;

