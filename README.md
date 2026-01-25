# Delybell Order Sync - Shopify App

A production-ready Shopify app that automatically syncs orders from Shopify stores to Delybell's delivery management system.

**Status:** ✅ Production Ready - Public App + Custom Distribution

When a store installs the app, their orders are automatically synced to Delybell using the store's configured address as the pickup location.

## How It Works

1. **Store Installation**: Store owner installs the app via the installation form
2. **Automatic Setup**: App fetches the store's address from Shopify settings
3. **Order Sync**: When orders are created, they're automatically synced to Delybell
4. **Address Mapping**: 
   - Pickup address: Store's address from Shopify Settings → Store details
   - Destination address: Customer's shipping address from the order
   - Both addresses are parsed and converted to Delybell IDs

## Quick Start

### For Store Owners (Installation)

1. Go to: `https://delybell.onrender.com`
2. Enter your shop domain: `your-store.myshopify.com`
3. Click **"Install App"**
4. Click **"Install"** on Shopify authorization page
5. Done! Orders sync automatically.

### For App Owner (One-Time Setup)

#### 1. Deploy to Render
- App URL: `https://delybell.onrender.com`

#### 2. Set Environment Variables in Render Dashboard:
```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=delybell.onrender.com
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_delybell_access_key
DELYBELL_SECRET_KEY=your_delybell_secret_key
NODE_ENV=production
PORT=3000
DEFAULT_SERVICE_TYPE_ID=1
```

#### 3. Create Shopify Partners Account (Free)
1. Go to: https://partners.shopify.com
2. Sign up (FREE for developers)
3. Create a Public App
4. Set Distribution: **Public** (allows direct installation)
5. Configure:
   - App URL: `https://delybell.onrender.com`
   - Redirect URL: `https://delybell.onrender.com/auth/callback`
   - Scopes: `read_orders`, `write_orders`
   - Embedded: Yes
6. Copy API Key and Secret to Render environment variables

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your credentials

3. **Set up tunneling** (for webhooks):
   ```bash
   # Option 1: Cloudflare Tunnel
   brew install cloudflare/cloudflare/cloudflared
   npm run tunnel
   
   # Option 2: LocalTunnel
   npm install -g localtunnel
   npm run tunnel:lt
   ```

4. **Update `.env`** with tunnel URL (without `https://`)

5. **Start server**:
```bash
npm run dev
```

6. **Install app**: Visit `https://YOUR-TUNNEL-URL/auth/install?shop=your-shop.myshopify.com`

## Project Structure

```
DelyBell/
├── server.js                  # Main server file
├── config.js                  # Configuration
├── package.json               # Dependencies
├── env.example               # Environment variables template
├── shopify.app.toml          # Shopify app configuration
├── services/
│   ├── delybellClient.js     # Delybell API client
│   ├── shopifyClient.js      # Shopify API client
│   ├── orderTransformer.js   # Order transformation logic
│   ├── orderProcessor.js     # Order processing workflow
│   ├── pickupLocationService.js # Fetches pickup from store address
│   ├── addressMapper.js      # Address parsing from Shopify
│   └── addressIdMapper.js    # Address ID lookup from Delybell
├── routes/
│   ├── api.js                # API endpoints
│   ├── webhooks.js           # Webhook handlers
│   ├── auth.js               # Shopify OAuth
│   └── admin.js              # Admin UI routes
├── middleware/
│   └── webhookVerification.js # Webhook HMAC verification
└── public/
    ├── index.html            # Main app UI
    ├── privacy-policy.html   # Privacy policy
    └── terms-of-service.html # Terms of service
```

## Environment Variables

See `env.example` for all required variables. Key variables:

- `SHOPIFY_API_KEY` - Shopify app API key
- `SHOPIFY_API_SECRET` - Shopify app API secret
- `SHOPIFY_SCOPES` - Required scopes (read_orders,write_orders)
- `SHOPIFY_HOST` - Your app hostname (without https://)
- `DELYBELL_API_URL` - Delybell API base URL
- `DELYBELL_ACCESS_KEY` - Delybell API access key
- `DELYBELL_SECRET_KEY` - Delybell API secret key
- `DEFAULT_SERVICE_TYPE_ID` - Default service type ID

## API Endpoints

### Health Check
```
GET /health
```

### OAuth & Installation
```
GET /auth/install?shop=store.myshopify.com
GET /auth/callback
GET /auth/check?shop=store.myshopify.com
```

### Webhooks
```
POST /webhooks/orders/create
POST /webhooks/orders/update
POST /webhooks/app/uninstalled
```

### API
```
POST /api/sync-orders
POST /api/process-order/:orderId
GET /api/service-types
GET /api/track/:orderId
```

## Address Mapping

The app automatically handles address mapping:

1. **Pickup Address**: Fetched from Shopify store address (Settings → Store details)
   - Parsed to extract Block, Road, Building numbers
   - Converted to Delybell IDs using master data APIs
   - Cached per store to avoid repeated API calls

2. **Destination Address**: Parsed from customer's shipping address
   - Extracts Block, Road, Building numbers
   - Uses zip code as fallback for Block number (common in Bahrain)
   - Converts to Delybell IDs

3. **Validation**: Both addresses are validated against Delybell master data before order creation

## Store Requirements

For the app to work correctly, stores need:

1. **Store Address Configured**: Shopify Settings → Store details must have a complete address
2. **Address Format**: Address should include Block and Road numbers (for Bahrain addresses)
3. **Example Format**: "Building X, Road Y, Block Z, City"

## Troubleshooting

### OAuth Not Working
- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
- Check `SHOPIFY_HOST` matches your deployment URL (without https://)
- Ensure Shopify Partner Dashboard URLs match your app URL

### Webhooks Not Receiving Orders
- Verify webhook URLs are accessible (use tunneling for local dev)
- Check webhooks are registered in Shopify Partner Dashboard
- Verify webhook HMAC signature validation
- Check logs for webhook processing errors

### Address Mapping Errors
- Verify store address is configured in Shopify Settings → Store details
- Check address format includes Block and Road numbers
- Verify Block/Road/Building IDs exist in Delybell master data
   - Use master APIs to find correct IDs

### App Shows "Installation Required" After Install
- Clear browser cache
- Check shop domain is being detected correctly
- Verify session is being stored properly
- Check logs for authentication errors

## Security Notes

- Never commit `.env` file to version control
- Webhook HMAC verification is implemented for production
- Use HTTPS in production
- Store Shopify sessions securely (database recommended for production)
- Rotate API keys regularly

## Delybell API Documentation

For complete Delybell API documentation:
- Postman: https://documenter.getpostman.com/view/37966240/2sB34eKND9

## License

ISC
