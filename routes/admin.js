const express = require('express');
const router = express.Router();
const path = require('path');
const shopifyClient = require('../services/shopifyClient');
const config = require('../config');

/**
 * Public Landing/Install Page - STATIC
 * Purpose: Accept shop domain, redirect to OAuth
 * GET /
 */
router.get('/', (req, res) => {
  // Serve static install page (no App Bridge, no SHOPIFY_API_KEY)
  // This is a public page - no shop detection needed
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * Embedded Shopify Admin App - SERVER-RENDERED (EJS)
 * Purpose: Actual app UI inside Shopify Admin
 * GET /app?shop=your-shop.myshopify.com
 */
router.get('/app', async (req, res) => {
  try {
    console.log(`[App] GET /app - Query params:`, req.query);
    console.log(`[App] GET /app - Headers:`, {
      referer: req.headers.referer,
      'x-shopify-shop-domain': req.headers['x-shopify-shop-domain'],
      'x-shopify-shop': req.headers['x-shopify-shop'],
      host: req.headers.host,
    });
    
    // Get shop from multiple sources (for embedded apps, Shopify passes it in headers)
    let shop = req.query.shop;
    
    // If not in query, try Shopify headers (for embedded apps)
    if (!shop) {
      shop = req.headers['x-shopify-shop-domain'] || 
             req.headers['x-shopify-shop'] ||
             req.headers['shop'];
      
      console.log(`[App] Shop from headers: ${shop || 'not found'}`);
      
      // Also check referer header for shop domain pattern
      // Handles: admin.shopify.com/store/782cba-5a or admin.shopify.com/store/782cba-5a/
      if (!shop && req.headers.referer) {
        const refererMatch = req.headers.referer.match(/admin\.shopify\.com\/store\/([^\/\?]+)/);
        if (refererMatch) {
          const storeName = refererMatch[1];
          shop = storeName + '.myshopify.com';
          console.log(`[App] Extracted shop from referer: ${shop} (from store name: ${storeName})`);
        }
        
        // Also try extracting from full Shopify admin URL pattern
        // Handles: https://782cba-5a.myshopify.com/admin/apps/{API_KEY}/
        if (!shop) {
          const shopifyUrlMatch = req.headers.referer.match(/https?:\/\/([^\.]+)\.myshopify\.com/);
          if (shopifyUrlMatch) {
            shop = shopifyUrlMatch[1] + '.myshopify.com';
            console.log(`[App] Extracted shop from Shopify URL: ${shop}`);
          }
        }
      }
      
      // Also check if shop is in the URL path
      if (!shop && req.url) {
        const urlMatch = req.url.match(/[?&]shop=([^&]+)/);
        if (urlMatch) {
          shop = decodeURIComponent(urlMatch[1]);
          console.log(`[App] Extracted shop from URL: ${shop}`);
        }
      }
    }
    
    // Normalize shop domain
    if (shop) {
      const { normalizeShop } = require('../utils/normalizeShop');
      shop = normalizeShop(shop);
    }
    
    if (!shop || !shop.includes('.myshopify.com')) {
      // If no shop detected, render app template anyway - let frontend App Bridge detect it
      // This handles cases where shop is only available client-side
      console.log('[App] No shop detected server-side, rendering app template (App Bridge will detect shop)');
      return res.render('app', {
        SHOPIFY_API_KEY: config.shopify.apiKey || '',
        shop: '',
        isAuthenticated: false,
      });
    }
    
    console.log(`[App] Rendering embedded app for shop: ${shop}`);
    
    // Check if shop is authenticated (from Supabase - persists across devices)
    const session = await shopifyClient.getSession(shop);
    const isAuthenticated = session && session.accessToken;
    
    console.log(`[App] Shop authenticated: ${isAuthenticated}`);
    console.log(`[App] API key present: ${!!config.shopify.apiKey}`);
    
    if (!isAuthenticated) {
      // Shop not authenticated - redirect to install
      console.log(`[App] Shop ${shop} not authenticated, redirecting to install`);
      return res.redirect(`/auth/install?shop=${encodeURIComponent(shop)}`);
    }
    
    // Render EJS template with API key injected
    res.render('app', {
      SHOPIFY_API_KEY: config.shopify.apiKey || '',
      shop: shop,
      isAuthenticated: isAuthenticated,
    });
    
    console.log(`[App] ✅ Successfully rendered app template for shop: ${shop}`);
  } catch (error) {
    console.error('[App] ❌ Error rendering app:', error);
    console.error('[App] Error stack:', error.stack);
    res.status(500).send(`Error loading app: ${error.message}`);
  }
});

// OLD CODE BELOW - TO BE REMOVED AFTER TESTING
/*
router.get('/OLD', async (req, res) => {
  try {
    // If no shop parameter, show installation prompt
    if (!shop) {
      const installHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Install Delybell Order Sync</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #1a1a1a;
    }
    .container {
      background: #ffffff;
      border: 1px solid #e5e5e5;
      padding: 0;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .header {
      border-bottom: 1px solid #e5e5e5;
      padding: 32px 40px;
      background: #fafafa;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .header .subtitle {
      color: #666666;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.5;
    }
    .content {
      padding: 40px;
    }
    .form-section {
      margin-bottom: 32px;
    }
    .form-group {
      margin-bottom: 24px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #1a1a1a;
      font-weight: 500;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #d1d1d1;
      background: #ffffff;
      font-size: 15px;
      color: #1a1a1a;
      font-family: inherit;
      transition: border-color 0.15s ease;
    }
    input:focus {
      outline: none;
      border-color: #1a1a1a;
    }
    input::placeholder {
      color: #999999;
    }
    .input-hint {
      display: block;
      margin-top: 6px;
      color: #666666;
      font-size: 12px;
      font-weight: 400;
      line-height: 1.4;
    }
    .button {
      width: 100%;
      padding: 14px 24px;
      background: #1a1a1a;
      color: #ffffff;
      border: 1px solid #1a1a1a;
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .button:hover {
      background: #333333;
      border-color: #333333;
    }
    .button:active {
      background: #000000;
      border-color: #000000;
    }
    .button:disabled {
      background: #cccccc;
      border-color: #cccccc;
      cursor: not-allowed;
    }
    .info-section {
      border-top: 1px solid #e5e5e5;
      padding-top: 24px;
      margin-top: 32px;
    }
    .info-title {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .info-list {
      list-style: none;
      padding: 0;
    }
    .info-list li {
      color: #666666;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 8px;
      padding-left: 16px;
      position: relative;
    }
    .info-list li:before {
      content: "—";
      position: absolute;
      left: 0;
      color: #999999;
    }
    .info-code {
      display: inline-block;
      padding: 2px 6px;
      background: #f5f5f5;
      border: 1px solid #e5e5e5;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 12px;
      color: #1a1a1a;
    }
    @media (max-width: 640px) {
      .container {
        border-left: none;
        border-right: none;
      }
      .header {
        padding: 24px 20px;
      }
      .content {
        padding: 32px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Delybell Order Sync</h1>
      <p class="subtitle">Connect your Shopify store to sync orders automatically</p>
    </div>
    
    <div class="content">
      <form onsubmit="installApp(event)" id="installForm">
        <div class="form-section">
          <div class="form-group">
            <label for="shop">Shopify Store Domain</label>
            <input 
              type="text" 
              id="shop" 
              name="shop" 
              placeholder="your-store.myshopify.com"
              required
              autocomplete="off"
              autofocus
            />
            <span class="input-hint">Enter your custom domain (e.g., babybow.co) or Shopify domain (e.g., 782cba-5a.myshopify.com)</span>
          </div>
        </div>
        
        <button type="submit" class="button" id="submitButton">Install App</button>
        
        <div class="info-section">
          <div class="info-title">Finding Your Shopify Domain</div>
          <ul class="info-list">
            <li>Go to your Shopify admin panel</li>
            <li>Check the URL: <span class="info-code">admin.shopify.com/store/YOUR-STORE-NAME</span></li>
            <li>Your Shopify domain is: <span class="info-code">YOUR-STORE-NAME.myshopify.com</span></li>
          </ul>
        </div>
      </form>
    </div>
  </div>
  
  <script>
    async function resolveShopDomain(customDomain) {
      // Try to resolve custom domain to myshopify.com domain
      // We'll try common patterns and validate them
      
      const domainParts = customDomain.split('.');
      if (domainParts.length < 2) {
        return null;
      }
      
      // Extract store name (first part before TLD)
      const storeName = domainParts[0];
      
      // Try the most common pattern: babybow.co -> babybow.myshopify.com
      const possibleShop = storeName + '.myshopify.com';
      
      // Try to validate by checking if shop exists (via our API)
      try {
        const response = await fetch(\`/admin/api/resolve-shop?domain=\${encodeURIComponent(customDomain)}&suggested=\${encodeURIComponent(possibleShop)}\`);
        const data = await response.json();
        
        if (data.success && data.shop) {
          return data.shop;
        }
      } catch (error) {
        console.error('Error resolving shop domain:', error);
      }
      
      // Return suggested domain if API doesn't work
      return possibleShop;
    }
    
    async function installApp(event) {
      event.preventDefault();
      const form = document.getElementById('installForm');
      const input = document.getElementById('shop');
      const button = document.getElementById('submitButton');
      
      let shop = input.value.trim();
      
      if (!shop) {
        input.focus();
        return;
      }
      
      // Normalize shop domain
      shop = shop.toLowerCase();
      
      // Remove protocol if present
      shop = shop.replace(/^https?:\/\//, '');
      
      // Remove trailing slash and path
      shop = shop.split('/')[0];
      
      // If it's a custom domain (not .myshopify.com), try to resolve it
      if (!shop.includes('.myshopify.com')) {
        // Show loading state
        const originalText = button.textContent;
        button.textContent = 'RESOLVING DOMAIN...';
        button.disabled = true;
        input.disabled = true;
        
        try {
          // Try to resolve custom domain
          const resolvedShop = await resolveShopDomain(shop);
          
          if (resolvedShop) {
            // Show confirmation dialog with helpful info
            const message = \`We detected a custom domain: \${shop}\\n\\nWe'll use: \${resolvedShop}\\n\\nIf this is incorrect, click Cancel and enter your Shopify domain manually.\`;
            
            const confirmed = confirm(message);
            if (!confirmed) {
              button.textContent = originalText;
              button.disabled = false;
              input.disabled = false;
              input.focus();
              return;
            }
            
            shop = resolvedShop;
          } else {
            // Could not resolve, show instructions
            button.textContent = originalText;
            button.disabled = false;
            input.disabled = false;
            alert(\`Unable to resolve "\${shop}". Please enter your Shopify domain (e.g., your-store.myshopify.com) directly.\`);
            input.focus();
            return;
          }
        } catch (error) {
          console.error('Error resolving domain:', error);
          button.textContent = originalText;
          button.disabled = false;
          input.disabled = false;
          alert('Error resolving domain. Please enter your Shopify domain directly.');
          input.focus();
          return;
        } finally {
          button.textContent = originalText;
          button.disabled = false;
          input.disabled = false;
        }
      }
      
      // Validate final shop domain
      if (!shop.endsWith('.myshopify.com')) {
        alert('Shop domain must end with .myshopify.com');
        input.focus();
        return;
      }
      
      // Show loading state before redirect
      button.textContent = 'INSTALLING...';
      button.disabled = true;
      input.disabled = true;
      
      // Redirect to install URL with normalized shop
      window.location.href = \`/auth/install?shop=\${encodeURIComponent(shop)}\`;
    }
  </script>
</body>
</html>`;
      return res.send(installHtml);
    }
    
    // Validate shop domain format (after normalization)
    if (!shop || !shop.includes('.myshopify.com')) {
      return res.status(400).send(`Invalid shop domain format. Received: "${shop}". Expected format: your-shop.myshopify.com`);
    }
    
    // Ensure it ends with .myshopify.com (no extra characters)
    if (!shop.endsWith('.myshopify.com')) {
      return res.status(400).send(`Invalid shop domain format. Must end with .myshopify.com. Received: "${shop}"`);
    }
    
    // Check if shop is authenticated
    const session = await shopifyClient.getSession(shop);
    const isAuthenticated = session && session.accessToken;
    
    // Read HTML file
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(__dirname, '../public/index.html');
    
    let html;
    try {
      html = fs.readFileSync(htmlPath, 'utf8');
    } catch (fileError) {
      // If file doesn't exist, serve a simple HTML page
      html = `<!DOCTYPE html>
<html>
<head>
  <title>Delybell Order Sync</title>
  <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</head>
<body>
  <h1>Delybell Order Sync</h1>
  <p>Shop: ${shop}</p>
  <p>Status: ${isAuthenticated ? 'Installed' : 'Not Installed'}</p>
  ${!isAuthenticated ? `<a href="/auth/install?shop=${shop}">Install App</a>` : ''}
</body>
</html>`;
    }
    
    // Inject Shopify API key into HTML
    // CRITICAL: This MUST happen or App Bridge will fail with 400 Bad Request
    if (config.shopify.apiKey && config.shopify.apiKey.trim()) {
      const apiKey = config.shopify.apiKey.trim();
      
      // Replace meta tag placeholder (multiple formats)
      html = html.replace(
        /<meta name="shopify-api-key" content="<%= SHOPIFY_API_KEY %>">/g,
        `<meta name="shopify-api-key" content="${apiKey}">`
      );
      html = html.replace(
        /<meta name="shopify-api-key" content='<%= SHOPIFY_API_KEY %>'>/g,
        `<meta name="shopify-api-key" content="${apiKey}">`
      );
      
      // Replace script placeholder (multiple formats)
      html = html.replace(
        /window\.SHOPIFY_API_KEY = '<%= SHOPIFY_API_KEY %>';/g,
        `window.SHOPIFY_API_KEY = '${apiKey}';`
      );
      html = html.replace(
        /window\.SHOPIFY_API_KEY = "<%= SHOPIFY_API_KEY %>";/g,
        `window.SHOPIFY_API_KEY = '${apiKey}';`
      );
      
      // Replace old placeholder format
      html = html.replace(
        /window\.SHOPIFY_API_KEY\s*\|\|\s*['"]YOUR_API_KEY['"]/g,
        `'${apiKey}'`
      );
      
      // Verify replacement worked
      const hasPlaceholder = html.includes('<%= SHOPIFY_API_KEY %>');
      if (hasPlaceholder) {
        console.error('[Admin] ❌ CRITICAL: API key placeholder still exists after replacement!');
        console.error('[Admin] This will cause 400 Bad Request errors. Check replacement logic.');
      } else {
        console.log(`[Admin] ✅ API key injected successfully: ${apiKey.substring(0, 10)}...`);
      }
    } else {
      // CRITICAL ERROR: API key is missing
      console.error('[Admin] ❌ CRITICAL ERROR: SHOPIFY_API_KEY environment variable is NOT SET!');
      console.error('[Admin] This will cause 400 Bad Request: /admin/apps/<%= SHOPIFY_API_KEY %>/');
      console.error('[Admin] Fix: Set SHOPIFY_API_KEY in Render Dashboard → Environment Variables');
      
      // Show error in HTML instead of placeholder (prevents 400 error)
      const errorMessage = 'SHOPIFY_API_KEY_NOT_SET';
      html = html.replace(
        /<meta name="shopify-api-key" content="<%= SHOPIFY_API_KEY %>">/g,
        `<meta name="shopify-api-key" content="${errorMessage}">`
      );
      html = html.replace(
        /window\.SHOPIFY_API_KEY = '<%= SHOPIFY_API_KEY %>';/g,
        `window.SHOPIFY_API_KEY = '${errorMessage}'; console.error('CRITICAL: SHOPIFY_API_KEY not set in Render environment variables!');`
      );
      
      // Also inject error message into page
      html = html.replace(
        /<body>/,
        `<body><script>console.error('❌ CRITICAL: SHOPIFY_API_KEY environment variable is not set in Render!'); console.error('Fix: Render Dashboard → Environment Variables → Add SHOPIFY_API_KEY');</script>`
      );
    }
    
    // Inject shop parameter into HTML if we have it (for embedded apps)
    if (shop) {
      // Add shop to window object so frontend can access it
      html = html.replace(
        /<script>/,
        `<script>window.SHOPIFY_SHOP = '${shop}'; console.log('[Admin] Injected shop into HTML:', '${shop}');`
      );
      console.log(`[Admin] Injected shop ${shop} into HTML`);
    } else {
      console.warn('[Admin] No shop detected, HTML will not have shop injected');
    }
    
    res.send(html);
  } catch (error) {
    console.error('Admin app error:', error);
    res.status(500).send(`Error loading admin app: ${error.message}`);
  }
});

/**
 * Admin API - Get app status
 * GET /admin/api/status?shop=your-shop.myshopify.com
 */
router.get('/admin/api/status', async (req, res) => {
  try {
    const { shop } = req.query;
    
    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop parameter is required',
      });
    }
    
    // Get session
    const session = await shopifyClient.getSession(shop);
    
    if (!session || !session.accessToken) {
      return res.json({
        success: true,
        authenticated: false,
        shop,
        installUrl: `/auth/install?shop=${shop}`,
      });
    }
    
    // Get webhook status
    let webhooks = [];
    try {
      const client = new shopifyClient.shopify.clients.Rest({ session });
      const webhookResponse = await client.get({ path: 'webhooks' });
      webhooks = webhookResponse.body.webhooks || [];
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    }
    
    const ordersWebhook = webhooks.find(w => w.topic === 'orders/create');
    const ordersUpdateWebhook = webhooks.find(w => w.topic === 'orders/updated');
    
    res.json({
      success: true,
      authenticated: true,
      shop: session.shop || shop,
      sessionId: session.id,
      expiresAt: session.expires,
      webhooks: {
        ordersCreate: {
          registered: !!ordersWebhook,
          address: ordersWebhook?.address,
        },
        ordersUpdated: {
          registered: !!ordersUpdateWebhook,
          address: ordersUpdateWebhook?.address,
        },
      },
    });
  } catch (error) {
    console.error('Admin status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Resolve custom domain to myshopify.com domain
 * GET /admin/api/resolve-shop?domain=babybow.co&suggested=babybow.myshopify.com
 */
router.get('/admin/api/resolve-shop', async (req, res) => {
  try {
    const { domain, suggested } = req.query;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain parameter is required',
      });
    }
    
    // Normalize domain
    let normalizedDomain = domain.trim().toLowerCase();
    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '').split('/')[0];
    
    // Extract store name from custom domain
    const domainParts = normalizedDomain.split('.');
    if (domainParts.length < 2) {
      return res.json({
        success: false,
        error: 'Invalid domain format',
        suggested: suggested || null,
      });
    }
    
    const storeName = domainParts[0];
    const suggestedShop = suggested || `${storeName}.myshopify.com`;
    
    // Try to validate by attempting to fetch shop info
    // Note: This requires authentication, so we can't fully validate
    // But we can return the suggested domain and let OAuth handle validation
    
    res.json({
      success: true,
      domain: normalizedDomain,
      shop: suggestedShop,
      message: 'Domain resolved. OAuth will validate if this is correct.',
    });
  } catch (error) {
    console.error('Error resolving shop domain:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Get synced orders
 * GET /admin/api/synced-orders?shop=your-shop.myshopify.com&limit=50
 * 
 * Uses order_logs table from Supabase (more reliable than Shopify tags)
 */
router.get('/admin/api/synced-orders', async (req, res) => {
  try {
    const { shop, limit = 50 } = req.query;
    
    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop parameter is required',
      });
    }
    
    const { normalizeShop } = require('../utils/normalizeShop');
    const normalizedShop = normalizeShop(shop);
    
    // Get session for fetching order details from Shopify
    const session = await shopifyClient.getSession(normalizedShop);
    
    if (!session || !session.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Shop not authenticated',
        installUrl: `/auth/install?shop=${normalizedShop}`,
      });
    }
    
    // Get synced orders from order_logs table (source of truth)
    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({
        success: false,
        error: 'Supabase not configured',
      });
    }
    
    const { supabase } = require('../services/db');
    const { data: orderLogs, error: logsError } = await supabase
      .from('order_logs')
      .select('*')
      .eq('shop', normalizedShop)
      .eq('status', 'processed') // Only successfully synced orders
      .not('delybell_order_id', 'is', null) // Must have Delybell order ID
      .order('created_at', { ascending: false })
      .limit(parseInt(limit) || 50);
    
    if (logsError) {
      throw logsError;
    }
    
    if (!orderLogs || orderLogs.length === 0) {
      return res.json({
        success: true,
        count: 0,
        orders: [],
      });
    }
    
    // Fetch order details from Shopify for each synced order
    const client = new shopifyClient.shopify.clients.Rest({ session });
    const syncedOrders = [];
    
    for (const log of orderLogs) {
      try {
        // 2️⃣ Use Shopify order ID (long ID) for API calls, NOT order number
        // log.shopify_order_id should be the long ID (e.g., 10643266011430)
        // log.shopify_order_number is the display number (e.g., 1022) - for display only
        const shopifyOrderIdForApi = log.shopify_order_id; // This should be the long ID
        
        // Fetch order details from Shopify using the long ID
        const orderResponse = await client.get({
          path: `orders/${shopifyOrderIdForApi}`,
          query: {
            fields: 'id,name,order_number,created_at,updated_at,financial_status,fulfillment_status,customer,shipping_address,total_price,currency',
          },
        });
        
        const order = orderResponse.body.order;
        if (order) {
          // 5️⃣ Fix customer name - Read from shipping_address first, fallback to customer
          let customerName = 'Guest';
          if (order.shipping_address?.name) {
            customerName = order.shipping_address.name.trim();
          } else if (order.customer) {
            const firstName = order.customer.first_name || '';
            const lastName = order.customer.last_name || '';
            customerName = `${firstName} ${lastName}`.trim() || 'Guest';
          }
          
          // Use saved values from order_logs if available, otherwise use Shopify API response
          syncedOrders.push({
            shopifyOrderId: order.id, // Long ID (e.g., 10643266011430)
            shopifyOrderNumber: log.shopify_order_number || order.order_number || order.name, // Display number from logs or API
            shopifyOrderName: order.name,
            delybellOrderId: log.delybell_order_id,
            trackingUrl: null, // Can be fetched from Delybell API if needed
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            syncedAt: log.created_at,
            customerName: customerName, // Fixed: shipping_address.name first, then customer
            customerEmail: order.customer?.email || null,
            totalPrice: log.total_price || order.total_price, // Use saved value if available
            currency: log.currency || order.currency || 'USD', // Use saved value if available
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            synced: true,
          });
        }
      } catch (orderError) {
        // Order might have been deleted in Shopify, but still show it from logs
        console.warn(`Order ${log.shopify_order_id} not found in Shopify:`, orderError.message);
        syncedOrders.push({
          shopifyOrderId: log.shopify_order_id,
          shopifyOrderNumber: `#${log.shopify_order_id}`,
          shopifyOrderName: `Order ${log.shopify_order_id}`,
          delybellOrderId: log.delybell_order_id,
          trackingUrl: null,
          createdAt: log.created_at,
          updatedAt: log.created_at,
          syncedAt: log.created_at,
          customerName: 'N/A',
          customerEmail: null,
          totalPrice: null,
          currency: null,
          financialStatus: 'unknown',
          fulfillmentStatus: 'unknown',
          synced: true,
          note: 'Order details not available in Shopify',
        });
      }
    }
    
    res.json({
      success: true,
      count: syncedOrders.length,
      orders: syncedOrders,
    });
  } catch (error) {
    console.error('Error fetching synced orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Diagnostic endpoint - Helps debug 400 errors
 * GET /admin/api/diagnose?shop=your-shop.myshopify.com
 */
router.get('/admin/api/diagnose', async (req, res) => {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      request: {
        url: req.url,
        method: req.method,
        query: req.query,
        headers: {
          'x-shopify-shop-domain': req.headers['x-shopify-shop-domain'] || 'not found',
          'x-shopify-shop': req.headers['x-shopify-shop'] || 'not found',
          'shop': req.headers['shop'] || 'not found',
          'referer': req.headers['referer'] || 'not found',
        },
      },
      config: {
        apiKey: config.shopify.apiKey ? `${config.shopify.apiKey.substring(0, 10)}...` : 'NOT SET',
        apiSecret: config.shopify.apiSecret ? 'SET' : 'NOT SET',
        hostName: config.shopify.hostName || 'NOT SET',
        scopes: config.shopify.scopes || 'NOT SET',
      },
      shop: {
        fromQuery: req.query.shop || 'not provided',
        normalized: null,
        isValid: false,
        error: null,
      },
    };

    // Try to normalize shop
    if (req.query.shop) {
      try {
        const { normalizeShop } = require('../utils/normalizeShop');
        diagnostics.shop.normalized = normalizeShop(req.query.shop);
        diagnostics.shop.isValid = diagnostics.shop.normalized.endsWith('.myshopify.com');
      } catch (error) {
        diagnostics.shop.error = error.message;
      }
    }

    // Check session if shop is valid
    if (diagnostics.shop.isValid) {
      try {
        const session = await shopifyClient.getSession(diagnostics.shop.normalized);
        diagnostics.session = {
          exists: !!session,
          hasAccessToken: !!(session && session.accessToken),
        };
      } catch (error) {
        diagnostics.session = {
          error: error.message,
        };
      }
    }

    res.json({
      success: true,
      diagnostics,
      recommendations: generateRecommendations(diagnostics),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

function generateRecommendations(diagnostics) {
  const recommendations = [];

  if (!diagnostics.config.apiKey || diagnostics.config.apiKey === 'NOT SET') {
    recommendations.push({
      issue: 'SHOPIFY_API_KEY not set',
      fix: 'Set SHOPIFY_API_KEY environment variable in Render Dashboard',
      severity: 'critical',
    });
  }

  if (!diagnostics.config.apiSecret || diagnostics.config.apiSecret === 'NOT SET') {
    recommendations.push({
      issue: 'SHOPIFY_API_SECRET not set',
      fix: 'Set SHOPIFY_API_SECRET environment variable in Render Dashboard',
      severity: 'critical',
    });
  }

  if (!diagnostics.shop.fromQuery || diagnostics.shop.fromQuery === 'not provided') {
    recommendations.push({
      issue: 'Shop parameter missing',
      fix: 'Add ?shop=your-shop.myshopify.com to URL',
      severity: 'high',
    });
  }

  if (diagnostics.shop.error) {
    recommendations.push({
      issue: `Shop normalization failed: ${diagnostics.shop.error}`,
      fix: 'Ensure shop format is: your-shop.myshopify.com',
      severity: 'high',
    });
  }

  if (!diagnostics.shop.isValid && diagnostics.shop.normalized) {
    recommendations.push({
      issue: 'Invalid shop format',
      fix: 'Shop must end with .myshopify.com',
      severity: 'high',
    });
  }

  if (diagnostics.session && !diagnostics.session.exists) {
    recommendations.push({
      issue: 'Shop not authenticated',
      fix: 'Install app first: /auth/install?shop=' + diagnostics.shop.normalized,
      severity: 'medium',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      issue: 'No issues detected',
      fix: 'Everything looks good!',
      severity: 'info',
    });
  }

  return recommendations;
}

/**
 * Diagnostic endpoint to check webhook registration status
 * GET /admin/api/webhooks/status?shop=your-shop.myshopify.com
 */
router.get('/admin/api/webhooks/status', async (req, res) => {
  try {
    const { shop } = req.query;
    
    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop parameter is required',
      });
    }
    
    const { normalizeShop } = require('../utils/normalizeShop');
    const normalizedShop = normalizeShop(shop);
    const session = await shopifyClient.getSession(normalizedShop);
    
    if (!session || !session.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Shop not authenticated',
        shop: normalizedShop,
      });
    }
    
    // Get registered webhooks from Shopify
    const client = new shopifyClient.shopify.clients.Rest({ session });
    const webhooksResponse = await client.get({
      path: 'webhooks',
    });
    
    const registeredWebhooks = webhooksResponse.body.webhooks || [];
    
    // Check which webhooks are registered
    const config = require('../config');
    const hostName = config.shopify.hostName || 'localhost:3000';
    const protocol = hostName.includes('localhost') ? 'http' : 'https';
    const webhookBaseUrl = `${protocol}://${hostName}`;
    
    const expectedWebhooks = [
      {
        topic: 'orders/create',
        address: `${webhookBaseUrl}/webhooks/orders/create`,
      },
      {
        topic: 'orders/updated',
        address: `${webhookBaseUrl}/webhooks/orders/update`,
      },
      {
        topic: 'app/uninstalled',
        address: `${webhookBaseUrl}/webhooks/app/uninstalled`,
      },
    ];
    
    const webhookStatus = expectedWebhooks.map(expected => {
      const registered = registeredWebhooks.find(
        w => w.topic === expected.topic && w.address === expected.address
      );
      
      return {
        topic: expected.topic,
        address: expected.address,
        registered: !!registered,
        status: registered ? registered.api_version : 'not registered',
        createdAt: registered ? registered.created_at : null,
        updatedAt: registered ? registered.updated_at : null,
      };
    });
    
    res.json({
      success: true,
      shop: normalizedShop,
      webhookBaseUrl,
      webhooks: webhookStatus,
      allRegistered: webhookStatus.every(w => w.registered),
      allWebhooks: registeredWebhooks.map(w => ({
        topic: w.topic,
        address: w.address,
        status: w.api_version,
      })),
    });
  } catch (error) {
    console.error('[Admin] Error checking webhook status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get recent order logs from Supabase
 * GET /admin/api/order-logs?shop=your-shop.myshopify.com&limit=10
 */
router.get('/admin/api/order-logs', async (req, res) => {
  try {
    const { shop, limit = 10 } = req.query;
    
    if (!shop) {
      return res.status(400).json({
        success: false,
        error: 'Shop parameter is required',
      });
    }
    
    const { normalizeShop } = require('../utils/normalizeShop');
    const normalizedShop = normalizeShop(shop);
    
    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({
        success: false,
        error: 'Supabase not configured',
      });
    }
    
    const { supabase } = require('../services/db');
    const { data, error } = await supabase
      .from('order_logs')
      .select('*')
      .eq('shop', normalizedShop)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      shop: normalizedShop,
      logs: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('[Admin] Error fetching order logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Manual test endpoint to process a specific order
 * GET /admin/api/test-order?shop=your-shop.myshopify.com&orderId=ORDER_ID
 * 
 * orderId can be:
 * - Numeric order ID (e.g., 1234567890)
 * - Order number/name (e.g., 1006) - will search by name
 */
router.get('/admin/api/test-order', async (req, res) => {
  try {
    const { shop, orderId } = req.query;
    
    if (!shop || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Shop and orderId parameters are required',
      });
    }
    
    const { normalizeShop } = require('../utils/normalizeShop');
    const normalizedShop = normalizeShop(shop);
    
    const session = await shopifyClient.getSession(normalizedShop);
    if (!session || !session.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Shop not authenticated',
      });
    }
    
    // Fetch the order from Shopify
    const client = new shopifyClient.shopify.clients.Rest({ session });
    let shopifyOrder;
    
    // Try to fetch by numeric ID first
    if (/^\d+$/.test(orderId)) {
      try {
        const orderResponse = await client.get({
          path: `orders/${orderId}`,
        });
        shopifyOrder = orderResponse.body.order;
      } catch (idError) {
        // If numeric ID fails, try searching by order number/name
        console.log(`[Test] Order ID ${orderId} not found, trying to search by order number...`);
        const searchResponse = await client.get({
          path: 'orders',
          query: {
            name: orderId, // Search by order name/number
            limit: 1,
          },
        });
        const orders = searchResponse.body.orders || [];
        if (orders.length > 0) {
          shopifyOrder = orders[0];
          console.log(`[Test] Found order by number: ${shopifyOrder.name} (ID: ${shopifyOrder.id})`);
        }
      }
    } else {
      // Not numeric, search by order number/name
      const searchResponse = await client.get({
        path: 'orders',
        query: {
          name: orderId,
          limit: 1,
        },
      });
      const orders = searchResponse.body.orders || [];
      if (orders.length > 0) {
        shopifyOrder = orders[0];
        console.log(`[Test] Found order by number: ${shopifyOrder.name} (ID: ${shopifyOrder.id})`);
      }
    }
    
    if (!shopifyOrder) {
      return res.status(404).json({
        success: false,
        error: `Order not found. Tried ID: ${orderId}. Make sure the order exists and you have access to it.`,
        hint: 'Order ID should be numeric (e.g., 1234567890) or order number (e.g., #1006 or 1006)',
      });
    }
    
    // Process the order
    const orderProcessor = require('../services/orderProcessor');
    const mappingConfig = {
      service_type_id: parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      shop: normalizedShop,
      session: session,
      destination: null,
    };
    
    console.log(`[Test] Manually processing order ${orderId}...`);
    const result = await orderProcessor.processOrder(
      shopifyOrder,
      session,
      mappingConfig
    );
    
    res.json({
      success: result.success,
      message: result.success 
        ? `Order ${orderId} processed successfully` 
        : `Order processing failed: ${result.error}`,
      result: result,
    });
  } catch (error) {
    console.error('[Admin] Error testing order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * ============================================================================
 * OPERATIONS ADMIN DASHBOARD
 * ============================================================================
 * Shared admin for ALL shops - Operations control panel for Delybell staff
 * GET /admin/login - Login page
 * GET /admin - Dashboard (requires authentication)
 */
router.get('/admin/login', (req, res) => {
  res.render('login', {
    title: 'Delybell Admin - Login',
  });
});

router.get('/admin', (req, res) => {
  // Simple session check (in production, use proper session management)
  // For now, we'll rely on client-side sessionStorage
  res.render('admin-dashboard', {
    title: 'Delybell Operations Admin',
  });
});

/**
 * Admin API - Get summary statistics
 * GET /admin/api/stats
 */
router.get('/admin/api/stats', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({
        success: false,
        error: 'Supabase not configured',
      });
    }

    const { shop } = req.query;
    const { supabase } = require('../services/db');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Build query for today's orders
    let query = supabase
      .from('order_logs')
      .select('status, delybell_order_id')
      .gte('created_at', todayStart.toISOString());
    
    // Filter by shop if provided
    if (shop) {
      const { normalizeShop } = require('../utils/normalizeShop');
      const normalizedShop = normalizeShop(shop);
      query = query.eq('shop', normalizedShop);
    }

    const { data: todayOrders, error: todayError } = await query;

    if (todayError) throw todayError;

    const totalToday = todayOrders?.length || 0;
    const syncedToday = todayOrders?.filter(o => o.status === 'processed' && o.delybell_order_id).length || 0;
    const pendingSync = todayOrders?.filter(o => o.status === 'pending_sync').length || 0;
    const failedToday = todayOrders?.filter(o => o.status === 'failed').length || 0;
    const needsAttention = failedToday; // Orders that failed and need retry

    res.json({
      success: true,
      stats: {
        totalOrdersToday: totalToday,
        successfullySynced: syncedToday,
        pendingSync: pendingSync,
        failed: failedToday,
        needsAttention: needsAttention,
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Get all orders with filters
 * GET /admin/api/orders?shop=...&status=...&search=...&dateFrom=...&dateTo=...&limit=...&offset=...
 */
router.get('/admin/api/orders', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({
        success: false,
        error: 'Supabase not configured',
      });
    }

    const { supabase } = require('../services/db');
    const {
      shop,
      status,
      search,
      dateFrom,
      dateTo,
      limit = 50,
      offset = 0,
    } = req.query;

    // Build query
    let query = supabase
      .from('order_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (shop) {
      query = query.eq('shop', shop);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Search by order number, phone, or Delybell order ID
    if (search) {
      const searchNum = parseInt(search);
      if (!isNaN(searchNum)) {
        // Search by order number
        query = query.eq('shopify_order_number', searchNum);
      } else {
        // Search by phone or Delybell order ID (use OR with multiple queries)
        // Since Supabase doesn't support OR easily, we'll fetch and filter
        // For now, prioritize Delybell order ID search
        query = query.ilike('delybell_order_id', `%${search}%`);
      }
    }
    
    const { data: orders, error } = await query;
    
    if (error) throw error;
    
    // Filter by phone if search is text and not a number
    let filteredOrders = orders || [];
    if (search && isNaN(parseInt(search))) {
      const searchLower = search.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.delybell_order_id?.toLowerCase().includes(searchLower) ||
        order.phone?.toLowerCase().includes(searchLower) ||
        order.customer_name?.toLowerCase().includes(searchLower)
      );
    }

    // Format orders for display
    const formattedOrders = filteredOrders.map(order => ({
      id: order.id,
      shop: order.shop,
      shopifyOrderId: order.shopify_order_id,
      shopifyOrderNumber: order.shopify_order_number,
      delybellOrderId: order.delybell_order_id,
      status: order.status,
      customerName: order.customer_name || 'N/A',
      phone: order.phone || 'N/A',
      amount: order.total_price,
      currency: order.currency || 'USD',
      createdAt: order.shopify_order_created_at || order.created_at, // Use Shopify order creation time if available, fallback to sync time
      syncedAt: order.created_at, // When order was synced
      errorMessage: order.error_message,
    }));

    res.json({
      success: true,
      orders: formattedOrders,
      count: formattedOrders.length,
      hasMore: formattedOrders.length === parseInt(limit),
    });
  } catch (error) {
    console.error('[Admin] Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Get order details
 * GET /admin/api/orders/:id
 */
router.get('/admin/api/orders/:id', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({
        success: false,
        error: 'Supabase not configured',
      });
    }

    const { supabase } = require('../services/db');
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('order_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        shop: order.shop,
        shopifyOrderId: order.shopify_order_id,
        shopifyOrderNumber: order.shopify_order_number,
        delybellOrderId: order.delybell_order_id,
        status: order.status,
        customerName: order.customer_name || 'N/A',
        phone: order.phone || 'N/A',
        amount: order.total_price,
        currency: order.currency || 'USD',
        createdAt: order.shopify_order_created_at || order.created_at, // Use Shopify order creation time if available
        syncedAt: order.created_at, // When order was synced
        errorMessage: order.error_message,
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching order details:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Retry failed order
 * POST /admin/api/orders/:id/retry
 */
router.post('/admin/api/orders/:id/retry', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({
        success: false,
        error: 'Supabase not configured',
      });
    }

    const { supabase } = require('../services/db');
    const { id } = req.params;

    // Get order details
    const { data: order, error: fetchError } = await supabase
      .from('order_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Only failed orders can be retried',
      });
    }

    // Get shop session
    const session = await shopifyClient.getSession(order.shop);
    if (!session || !session.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Shop not authenticated',
      });
    }

    // Fetch order from Shopify
    const shopifyClientInstance = new shopifyClient.shopify.clients.Rest({ session });
    const shopifyOrderResponse = await shopifyClientInstance.get({
      path: `orders/${order.shopify_order_id}`,
    });

    const shopifyOrder = shopifyOrderResponse.body.order;
    if (!shopifyOrder) {
      return res.status(404).json({
        success: false,
        error: 'Shopify order not found',
      });
    }

    // Generate new customer_input_order_id for retry
    // Format: {original_id}_retry_{timestamp}
    const retryId = `${order.shopify_order_id}_retry_${Date.now()}`;
    
    // Process order with retry ID
    const orderProcessor = require('../services/orderProcessor');
    const mappingConfig = {
      service_type_id: parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
      shop: order.shop,
      session: session,
    };

    // Override customer_input_order_id in transformer
    const result = await orderProcessor.processOrder(shopifyOrder, session, {
      ...mappingConfig,
      retryCustomerInputOrderId: retryId,
    });

    res.json({
      success: result.success,
      message: result.success 
        ? 'Order retried successfully' 
        : `Retry failed: ${result.error}`,
      order: result,
    });
  } catch (error) {
    console.error('[Admin] Error retrying order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Get all shops
 * GET /admin/api/shops
 */
router.get('/admin/api/shops', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL) {
      return res.status(503).json({
        success: false,
        error: 'Supabase not configured',
      });
    }

    const { supabase } = require('../services/db');

    const { data: shops, error } = await supabase
      .from('shops')
      .select('shop, sync_mode')
      .order('shop', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      shops: (shops || []).map(s => ({
        shop: s.shop,
        sync_mode: s.sync_mode || 'auto',
      })),
    });
  } catch (error) {
    console.error('[Admin] Error fetching shops:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Get shop sync mode
 * GET /admin/api/shops/:shop/sync-mode
 */
router.get('/admin/api/shops/:shop/sync-mode', async (req, res) => {
  try {
    const { shop } = req.params;
    const { getShop } = require('../services/shopRepo');
    
    const shopData = await getShop(shop);
    if (!shopData) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found',
      });
    }

    res.json({
      success: true,
      sync_mode: shopData.sync_mode || 'auto',
    });
  } catch (error) {
    console.error('[Admin] Error fetching sync mode:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Update shop sync mode
 * POST /admin/api/shops/:shop/sync-mode
 * Body: { sync_mode: "auto" | "manual" }
 */
router.post('/admin/api/shops/:shop/sync-mode', async (req, res) => {
  try {
    const { shop } = req.params;
    const { sync_mode } = req.body;

    if (!sync_mode || (sync_mode !== 'auto' && sync_mode !== 'manual')) {
      return res.status(400).json({
        success: false,
        error: 'sync_mode must be "auto" or "manual"',
      });
    }

    const { updateSyncMode } = require('../services/shopRepo');
    const updatedShop = await updateSyncMode(shop, sync_mode);

    res.json({
      success: true,
      sync_mode: updatedShop.sync_mode,
      message: `Sync mode updated to ${sync_mode}`,
    });
  } catch (error) {
    console.error('[Admin] Error updating sync mode:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Sync selected orders
 * POST /admin/api/orders/sync-selected
 * Body: { orderIds: [id1, id2, ...] }
 */
router.post('/admin/api/orders/sync-selected', async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'orderIds array is required',
      });
    }

    const { supabase } = require('../services/db');
    const orderProcessor = require('../services/orderProcessor');
    const { getShop } = require('../services/shopRepo');

    // Fetch orders from database
    const { data: orders, error: fetchError } = await supabase
      .from('order_logs')
      .select('*')
      .in('id', orderIds)
      .in('status', ['pending_sync', 'failed']); // Only sync pending or failed orders

    if (fetchError) throw fetchError;

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No syncable orders found',
      });
    }

    const results = [];

    for (const order of orders) {
      try {
        // Get shop session
        const shopData = await getShop(order.shop);
        if (!shopData || !shopData.access_token) {
          results.push({
            orderId: order.id,
            success: false,
            error: 'Shop not authenticated',
          });
          continue;
        }

        const session = {
          id: `offline_${order.shop}`,
          shop: order.shop,
          accessToken: shopData.access_token,
          scope: shopData.scopes,
          scopes: shopData.scopes,
          isOnline: false,
        };

        // Fetch order from Shopify
        const shopifyClientInstance = new shopifyClient.shopify.clients.Rest({ session });
        const shopifyOrderResponse = await shopifyClientInstance.get({
          path: `orders/${order.shopify_order_id}`,
        });

        const shopifyOrder = shopifyOrderResponse.body.order;
        if (!shopifyOrder) {
          results.push({
            orderId: order.id,
            success: false,
            error: 'Shopify order not found',
          });
          continue;
        }

        // Process order
        const mappingConfig = {
          service_type_id: parseInt(process.env.DEFAULT_SERVICE_TYPE_ID) || 1,
          shop: order.shop,
          session: session,
        };

        const result = await orderProcessor.processOrder(shopifyOrder, session, mappingConfig);

        results.push({
          orderId: order.id,
          success: result.success,
          delybellOrderId: result.delybellOrderId,
          error: result.error,
        });
      } catch (error) {
        results.push({
          orderId: order.id,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      results,
      synced: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });
  } catch (error) {
    console.error('[Admin] Error syncing selected orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Admin API - Sync all pending orders
 * POST /admin/api/orders/sync-all
 * Query: ?shop=shop.myshopify.com (optional, syncs all shops if not provided)
 */
router.post('/admin/api/orders/sync-all', async (req, res) => {
  try {
    const { shop } = req.query;
    const { supabase } = require('../services/db');

    // Build query
    let query = supabase
      .from('order_logs')
      .select('*')
      .in('status', ['pending_sync', 'failed']);

    if (shop) {
      query = query.eq('shop', shop);
    }

    const { data: orders, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!orders || orders.length === 0) {
      return res.json({
        success: true,
        message: 'No pending orders to sync',
        results: [],
        synced: 0,
        failed: 0,
      });
    }

    // Use the same sync logic as sync-selected
    const { orderIds } = { orderIds: orders.map(o => o.id) };
    req.body = { orderIds };

    // Reuse sync-selected logic
    const syncSelectedRoute = router.stack.find(layer => 
      layer.route && layer.route.path === '/admin/api/orders/sync-selected'
    );

    if (syncSelectedRoute) {
      // Call the handler directly
      const handler = syncSelectedRoute.route.stack[0].handle;
      await handler(req, res);
    } else {
      // Fallback: manual processing
      res.status(500).json({
        success: false,
        error: 'Sync handler not found',
      });
    }
  } catch (error) {
    console.error('[Admin] Error syncing all orders:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
