const express = require('express');
const router = express.Router();
const shopifyClient = require('../services/shopifyClient');
const config = require('../config');

/**
 * Admin App Route
 * Serves the embedded admin interface
 * GET /app?shop=your-shop.myshopify.com
 */
router.get('/app', async (req, res) => {
  try {
    const { shop } = req.query;
    
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    h1 {
      font-size: 32px;
      color: #202223;
      margin-bottom: 12px;
    }
    .subtitle {
      color: #6d7175;
      font-size: 16px;
      margin-bottom: 32px;
      line-height: 1.6;
    }
    .install-form {
      margin-top: 32px;
    }
    .input-group {
      margin-bottom: 20px;
      text-align: left;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #202223;
      font-weight: 500;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e3e5;
      border-radius: 6px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #008060;
    }
    .button {
      width: 100%;
      padding: 14px 24px;
      background: #008060;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .button:hover {
      background: #006e52;
    }
    .info {
      margin-top: 24px;
      padding: 16px;
      background: #f6f6f7;
      border-radius: 6px;
      font-size: 14px;
      color: #6d7175;
      line-height: 1.6;
    }
    .info strong {
      color: #202223;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚚 Delybell Order Sync</h1>
    <p class="subtitle">Automatically sync your Shopify orders to Delybell delivery management system</p>
    
    <div class="install-form">
      <form onsubmit="installApp(event)">
        <div class="input-group">
          <label for="shop">Enter your Shopify store domain</label>
          <input 
            type="text" 
            id="shop" 
            name="shop" 
            placeholder="your-store.myshopify.com" 
            required
            pattern=".*\\.myshopify\\.com$"
          />
        </div>
        <button type="submit" class="button">Install App</button>
      </form>
    </div>
    
    <div class="info">
      <strong>How to install:</strong><br>
      Enter your Shopify store domain (e.g., my-store.myshopify.com) and click "Install App". 
      You'll be redirected to Shopify to authorize the app.
    </div>
  </div>
  
  <script>
    function installApp(event) {
      event.preventDefault();
      const shop = document.getElementById('shop').value.trim();
      
      // Validate shop domain
      if (!shop.includes('.myshopify.com')) {
        alert('Please enter a valid Shopify store domain (e.g., your-store.myshopify.com)');
        return;
      }
      
      // Redirect to install URL
      window.location.href = \`/auth/install?shop=\${shop}\`;
    }
  </script>
</body>
</html>`;
      return res.send(installHtml);
    }
    
    // Validate shop domain format
    if (!shop.includes('.myshopify.com')) {
      return res.status(400).send('Invalid shop domain format');
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
