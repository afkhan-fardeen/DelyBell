# Shopify Delybell Integration App

A custom Shopify app that automatically syncs orders from your Shopify store to Delybell's external order processing system. This app retrieves orders placed on Shopify and processes them using Delybell's External APIs.

## Features

- ✅ Automatic order synchronization from Shopify to Delybell
- ✅ Webhook support for real-time order processing
- ✅ Order transformation (Shopify format → Delybell format)
- ✅ Shipping charge calculation
- ✅ Order tracking integration
- ✅ Master data APIs (service types, blocks, roads, buildings)

## API Documentation

This project uses the Delybell External APIs. For complete API documentation, please refer to:

- **API Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Postman Documentation:** [https://documenter.getpostman.com/view/37966240/2sB34eKND9](https://documenter.getpostman.com/view/37966240/2sB34eKND9)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- **Delybell API credentials** (access key and secret key) - **REQUIRED**
- Shopify Partner account - **OPTIONAL** (for full integration)
- A Shopify store - **OPTIONAL** (you can test with mock data)

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd Shopify
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your credentials:
   ```env
   # Shopify Configuration
   SHOPIFY_API_KEY=your_shopify_api_key
   SHOPIFY_API_SECRET=your_shopify_api_secret
   SHOPIFY_SCOPES=read_orders,write_orders
   SHOPIFY_HOST=your_app_hostname

   # Delybell API Configuration
   DELYBELL_API_URL=https://api.delybell.com
   DELYBELL_ACCESS_KEY=your_delybell_access_key
   DELYBELL_SECRET_KEY=your_delybell_secret_key

   # Server Configuration
   PORT=3000
   ```

## 🚀 Quick Start

**See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for complete setup instructions.**

### Quick Steps:
1. Install dependencies: `npm install`
2. Install ngrok: `npm install -g ngrok`
3. Start ngrok: `ngrok http 3000` (copy the URL)
4. Update `.env` with your ngrok URL (without `https://`)
5. Update Shopify app settings with ngrok URL
6. Start server: `npm start`
7. Install app: Visit `https://YOUR-NGROK-URL/auth/install?shop=delybell.myshopify.com`

### Documentation:
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** ⭐ - Complete setup guide with ngrok
- **[SHOPIFY_APP_CREATION_GUIDE.md](./SHOPIFY_APP_CREATION_GUIDE.md)** - Creating Shopify app
- **[TESTING.md](./TESTING.md)** - Testing without Shopify
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Delybell API reference

### 2. Delybell API Setup

1. Obtain your Delybell API credentials (access key and secret key)
2. Configure the base URL (usually `https://api.delybell.com`)
3. Test the connection using the service types endpoint

### 3. Address Mapping Configuration

**Important:** You need to map Shopify addresses to Delybell's block/road/building IDs. This can be done in two ways:

**Option A: Manual Mapping (Quick Start)**
- Update the `mappingConfig` in `routes/webhooks.js` or `routes/api.js` with default block/road/building IDs
- This is a temporary solution for testing

**Option B: Dynamic Mapping (Recommended)**
- Implement address lookup using Delybell's master APIs (blocks, roads, buildings)
- Use geocoding or address matching to find the correct IDs
- Store mappings in a database for future use

### 4. Run the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Usage

### Testing Without Shopify Access

If you don't have Shopify access yet, you can test the Delybell integration using mock data:

```bash
# Test Delybell API connection
npm run test:delybell

# Start server
npm run dev

# Process a mock order
curl -X POST http://localhost:3000/test/process-mock-order \
  -H "Content-Type: application/json" \
  -d '{
    "service_type_id": 1,
    "destination_mapping": {"block_id": 1, "road_id": 1, "building_id": 1},
    "pickup_mapping": {"block_id": 1, "road_id": 1, "building_id": 1}
  }'
```

See [TESTING.md](./TESTING.md) for complete testing guide without Shopify.

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Sync All Orders
```bash
POST /api/sync-orders
Content-Type: application/json

{
  "shop": "your-shop.myshopify.com",
  "limit": 50,
  "status": "any",
  "service_type_id": 1,
  "destination_mapping": {
    "block_id": 1,
    "road_id": 1,
    "building_id": 1
  },
  "pickup_mapping": {
    "block_id": 1,
    "road_id": 1,
    "building_id": 1
  }
}
```

#### Process Single Order
```bash
POST /api/process-order/:orderId
Content-Type: application/json

{
  "shop": "your-shop.myshopify.com",
  "service_type_id": 1,
  "destination_mapping": {...},
  "pickup_mapping": {...}
}
```

#### Get Service Types
```bash
GET /api/service-types?search=Express
```

#### Get Blocks
```bash
GET /api/blocks?search=BlockA
```

#### Get Roads
```bash
GET /api/roads?block_id=1&search=RoadX
```

#### Get Buildings
```bash
GET /api/buildings?road_id=1&search=BuildingY
```

#### Track Order
```bash
GET /api/track/:orderId
```

### Test Endpoints (Mock Data - No Shopify Required)

#### Get Mock Order Sample
```bash
GET /test/mock-order-sample
```

#### Process Mock Order
```bash
POST /test/process-mock-order
Content-Type: application/json

{
  "service_type_id": 1,
  "destination_mapping": {...},
  "pickup_mapping": {...}
}
```

#### Process Multiple Mock Orders
```bash
POST /test/process-mock-orders
Content-Type: application/json

{
  "count": 3,
  "service_type_id": 1,
  "destination_mapping": {...},
  "pickup_mapping": {...}
}
```

### Webhooks

#### Order Creation Webhook
Configure this endpoint in your Shopify app settings:
```
POST /webhooks/orders/create
```

Shopify will automatically send order data to this endpoint when a new order is created.

### Order Processing Flow

1. **Order Received**: Shopify order is received via webhook or API call
2. **Transformation**: Order data is transformed from Shopify format to Delybell format
3. **Shipping Calculation**: Optional shipping charge calculation
4. **Order Creation**: Order is created in Delybell system
5. **Tracking Update**: Shopify order tags are updated with Delybell tracking information

## Project Structure

```
Shopify/
├── config.js                 # Configuration file
├── server.js                  # Main server file
├── package.json              # Dependencies
├── .env.example             # Environment variables template
├── services/
│   ├── delybellClient.js    # Delybell API client
│   ├── shopifyClient.js     # Shopify API client
│   ├── orderTransformer.js  # Order transformation logic
│   └── orderProcessor.js    # Order processing workflow
├── routes/
│   ├── api.js               # API endpoints
│   └── webhooks.js          # Webhook handlers
└── API_DOCUMENTATION.md     # Delybell API documentation
```

## Configuration

### Address Mapping

The app requires mapping Shopify addresses to Delybell's hierarchical address system (Block → Road → Building). You can:

1. Use Delybell's master APIs to search and find matching IDs
2. Store address mappings in a database
3. Use geocoding services to match coordinates
4. Configure default mappings for testing

### Service Type

Default service type ID is set to `1`. You can:
- Fetch available service types using `/api/service-types`
- Configure the service type per order or globally

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your Shopify API credentials
   - Check Delybell API keys are correct
   - Ensure scopes include `read_orders` and `write_orders`

2. **Address Mapping Errors**
   - Verify block/road/building IDs exist in Delybell system
   - Use master APIs to find correct IDs
   - Check address format matches Delybell requirements

3. **Webhook Not Receiving Orders**
   - Verify webhook URL is accessible (use ngrok for local development)
   - Check webhook is registered in Shopify app settings
   - Verify webhook HMAC signature validation (if implemented)

## Development

### Local Development with Webhooks

For local development, use a tunneling service like ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Use the ngrok URL for webhook configuration
```

## Security Notes

- Never commit `.env` file to version control
- Implement webhook HMAC verification for production
- Use HTTPS in production
- Store Shopify sessions securely (database recommended)
- Rotate API keys regularly

## Next Steps

1. **Implement Address Mapping**: Build a robust address mapping system using Delybell's master APIs
2. **Add Database**: Store order sync status, mappings, and session data
3. **Error Handling**: Add retry logic and error notifications
4. **Admin Dashboard**: Create a UI for managing syncs and viewing status
5. **Testing**: Add unit and integration tests

## Resources

- [Delybell External API Postman Documentation](https://documenter.getpostman.com/view/37966240/2sB34eKND9)
- [Shopify API Documentation](https://shopify.dev/docs/api)
- [Shopify App Development Guide](https://shopify.dev/docs/apps)

