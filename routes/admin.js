const express = require('express');
const router = express.Router();
const shopifyClient = require('../services/shopifyClient');
const config = require('../config');

/**
 * Main App Route - Installation page or Dashboard
 * Serves the installation form or embedded admin interface
 * GET /?shop=your-shop.myshopify.com
 */
router.get('/', async (req, res) => {
  try {
    // Debug: Log all headers and query params
    console.log(`[Admin] ${req.path} route - Debug info:`);
    console.log('[Admin] Query params:', req.query);
    console.log('[Admin] Referer:', req.headers.referer);
    console.log('[Admin] x-shopify-shop-domain:', req.headers['x-shopify-shop-domain']);
    console.log('[Admin] x-shopify-shop:', req.headers['x-shopify-shop']);
    console.log('[Admin] shop header:', req.headers['shop']);
    
    // Try to get shop from query parameter first
    let { shop } = req.query;
    
    // If not in query, try to get from Shopify headers (for embedded apps)
    if (!shop) {
      // Shopify passes shop domain in various headers for embedded apps
      shop = req.headers['x-shopify-shop-domain'] || 
             req.headers['x-shopify-shop'] ||
             req.headers['shop'];
      
      console.log(`  Shop from headers: ${shop || 'not found'}`);
      
      // Also check referer header for shop domain pattern
      // Handles: admin.shopify.com/store/782cba-5a or admin.shopify.com/store/782cba-5a/
      if (!shop && req.headers.referer) {
        const refererMatch = req.headers.referer.match(/admin\.shopify\.com\/store\/([^\/\?]+)/);
        if (refererMatch) {
          const storeName = refererMatch[1];
          shop = storeName + '.myshopify.com';
          console.log(`[Admin] Extracted shop from referer: ${shop} (from store name: ${storeName})`);
        }
      }
      
      // Also check if shop is in the URL path (for embedded apps)
      // Handles: /?shop=782cba-5a.myshopify.com or just the store name
      if (!shop && req.url) {
        const urlMatch = req.url.match(/[?&]shop=([^&]+)/);
        if (urlMatch) {
          shop = decodeURIComponent(urlMatch[1]);
          console.log(`[Admin] Extracted shop from URL: ${shop}`);
        }
      }
    }
    
    console.log(`[Admin] Final shop value before normalization: ${shop || 'not found'}`);
    
    // Normalize shop domain if we have it
    if (shop) {
      shop = shop.trim().toLowerCase();
      // Remove protocol if present
      shop = shop.replace(/^https?:\/\//, '');
      // Remove trailing slash and path
      shop = shop.split('/')[0];
      // Remove query parameters if present
      shop = shop.split('?')[0];
      // If it's just the shop name without .myshopify.com, add it
      // This handles cases like "782cba-5a" -> "782cba-5a.myshopify.com"
      if (shop && !shop.includes('.')) {
        shop = shop + '.myshopify.com';
        console.log(`[Admin] Normalized shop (added .myshopify.com): ${shop}`);
      } else if (shop && shop.includes('.myshopify.com')) {
        console.log(`[Admin] Shop already has .myshopify.com: ${shop}`);
      }
    }
    
    console.log(`[Admin] Final normalized shop: ${shop || 'not found'}`);
    
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
    if (config.shopify.apiKey) {
      // Replace meta tag placeholder
      html = html.replace(
        /<meta name="shopify-api-key" content="<%= SHOPIFY_API_KEY %>">/g,
        `<meta name="shopify-api-key" content="${config.shopify.apiKey}">`
      );
      
      // Replace script placeholder
      html = html.replace(
        /window\.SHOPIFY_API_KEY = '<%= SHOPIFY_API_KEY %>';/g,
        `window.SHOPIFY_API_KEY = '${config.shopify.apiKey}';`
      );
      
      // Replace old placeholder format
      html = html.replace(
        /window\.SHOPIFY_API_KEY\s*\|\|\s*['"]YOUR_API_KEY['"]/g,
        `'${config.shopify.apiKey}'`
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
    
    // Get session
    const session = await shopifyClient.getSession(shop);
    
    if (!session || !session.accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Shop not authenticated',
        installUrl: `/auth/install?shop=${shop}`,
      });
    }
    
    // Fetch orders with delybell-synced tag
    const client = new shopifyClient.shopify.clients.Rest({ session });
    
    // Get orders with delybell-synced tag
    const ordersResponse = await client.get({
      path: 'orders',
      query: {
        limit: Math.min(parseInt(limit) || 50, 250), // Max 250 per Shopify API
        status: 'any',
        fields: 'id,name,order_number,created_at,updated_at,tags,financial_status,fulfillment_status,customer,total_price,currency',
      },
    });
    
    const allOrders = ordersResponse.body.orders || [];
    
    // Filter orders that have been synced to Delybell
    const syncedOrders = allOrders
      .filter(order => {
        const tags = order.tags ? order.tags.split(', ') : [];
        return tags.some(tag => tag.startsWith('delybell-synced'));
      })
      .map(order => {
        const tags = order.tags ? order.tags.split(', ') : [];
        const delybellOrderIdTag = tags.find(tag => tag.startsWith('delybell-order-id:'));
        const trackingTag = tags.find(tag => tag.startsWith('delybell-tracking:'));
        
        const delybellOrderId = delybellOrderIdTag ? delybellOrderIdTag.split(':')[1] : null;
        const trackingUrl = trackingTag ? trackingTag.split(':')[1] : null;
        
        return {
          shopifyOrderId: order.id,
          shopifyOrderNumber: order.order_number || order.name,
          shopifyOrderName: order.name,
          delybellOrderId,
          trackingUrl,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          customerName: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : 'Guest',
          customerEmail: order.customer?.email || null,
          totalPrice: order.total_price,
          currency: order.currency,
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          synced: true,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Most recent first
    
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

module.exports = router;
