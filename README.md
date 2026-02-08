# DelyBell Order Sync - Complete Documentation

## What is This App?

**DelyBell Order Sync** is a production-ready Shopify embedded app that enables Shopify merchants to manually sync their orders to DelyBell's delivery management system. The app provides a dashboard where merchants can review pending orders and sync them to DelyBell when ready.

### Key Features

- ✅ **Manual Order Sync** - Merchants control when orders are synced
- ✅ **Order Management Dashboard** - View, filter, and manage orders with status tracking
- ✅ **Bulk Operations** - Sync multiple orders at once
- ✅ **Error Handling** - Friendly error messages with retry functionality
- ✅ **GDPR Compliant** - Full webhook compliance for Shopify App Store
- ✅ **Admin Dashboard** - Operations dashboard for monitoring all shops
- ✅ **Problem Reports** - Store owners can report issues directly

### How It Works

1. **Installation**: Merchant installs app from Shopify App Store → OAuth flow → Session stored in Supabase
2. **Order Capture**: New order created → Webhook received → Saved as `pending_sync` status
3. **Manual Sync**: Merchant opens app → Reviews orders → Selects orders → Syncs manually
4. **Order Processing**: Order transformed → Sent to DelyBell API → Status updated to `processed` with DelyBell Order ID
5. **Completion**: Order fulfilled/completed → Status updated to `completed`

---

## Project Structure

```
DelyBell/
├── web/                          # Shopify CLI app structure
│   ├── index.js                 # Main Express server entry point
│   ├── shopify.js               # Shopify API configuration
│   └── routes/                  # Route handlers
│       ├── admin.js            # Admin dashboard & API routes
│       ├── api.js              # Public API endpoints
│       ├── auth.js             # Shopify OAuth flow
│       └── webhooks.js         # Webhook handlers
├── services/                     # Business logic
│   ├── shopifyClient.js        # Shopify API client
│   ├── delybellClient.js       # DelyBell API client
│   ├── orderProcessor.js       # Order processing workflow
│   ├── orderTransformer.js     # Order data transformation
│   ├── addressMapper.js        # Address parsing from Shopify
│   ├── addressIdMapper.js      # Address ID lookup from DelyBell
│   ├── pickupLocationService.js # Pickup location fetcher
│   ├── shopRepo.js             # Shop data repository
│   ├── db.js                   # Supabase client
│   └── sessionStorage.js       # Session storage (legacy)
├── views/                       # EJS Templates
│   ├── app.ejs                 # Main embedded app UI
│   ├── admin-dashboard.ejs     # Admin operations dashboard
│   ├── help-center.ejs         # Help center page
│   ├── login.ejs               # Admin login page
│   ├── privacy.ejs              # Privacy policy
│   └── terms.ejs                # Terms of service
├── public/                      # Static Files
│   ├── index.html              # Public landing page
│   ├── privacy-policy.html     # Privacy policy (static)
│   └── terms-of-service.html   # Terms of service (static)
├── utils/                       # Utilities
│   └── normalizeShop.js        # Shop domain normalization
├── supabase/                    # Database Migrations
│   └── migrations/             # SQL migration files
├── config.js                    # Configuration loader
├── package.json                 # Dependencies
└── shopify.app.toml            # Shopify app configuration
```

---

## Pages & Views

### 1. **Main Embedded App** (`/app`)
- **File**: `views/app.ejs`
- **Purpose**: Main dashboard for store owners
- **Features**:
  - Order list with filtering (pending_sync, processed, failed, completed)
  - Bulk selection and sync
  - Individual order sync and retry
  - Status indicators and DelyBell order IDs
  - Problem reporting
  - Connection health check
- **Authentication**: Requires authenticated Shopify session

### 2. **Admin Dashboard** (`/admin`)
- **File**: `views/admin-dashboard.ejs`
- **Purpose**: Operations dashboard for monitoring all shops
- **Features**:
  - Statistics overview
  - All orders across all shops
  - Shop management
  - Problem reports management
  - Diagnostic tools
- **Authentication**: Basic auth (separate from Shopify OAuth)

### 3. **Help Center** (`/app/help-center`)
- **File**: `views/help-center.ejs`
- **Purpose**: Help documentation for store owners
- **Features**: FAQs, troubleshooting, contact information

### 4. **Public Landing Page** (`/`)
- **File**: Server-rendered HTML in `web/routes/admin.js`
- **Purpose**: Informational page directing users to Shopify App Store
- **Note**: No install form - users must install from App Store

### 5. **Privacy & Terms**
- **Files**: `views/privacy.ejs`, `views/terms.ejs`
- **Purpose**: Legal pages for GDPR compliance

---

## Routes & Endpoints

### Public Routes

#### Landing & Info
- `GET /` - Public info page (redirects to `/app` if shop detected)
- `GET /privacy` - Privacy policy
- `GET /terms` - Terms of service
- `GET /health` - Health check endpoint

#### OAuth & Authentication
- `GET /auth/install?shop=store.myshopify.com` - Start OAuth flow
- `GET /auth/callback` - OAuth callback handler
  - Handles cookie-based and manual OAuth flows
  - Stores session in Supabase
  - Redirects to `/app` after successful install

### Embedded App Routes (Store Owner)

#### Main App
- `GET /app?shop=store.myshopify.com&host=...` - Main embedded app dashboard
- `GET /app/help-center` - Help center page

#### App API
- `POST /app/api/orders/sync-selected` - Sync selected orders
- `POST /app/api/orders/sync/:orderId` - Sync single order
- `POST /app/api/orders/retry/:orderId` - Retry failed order
- `GET /app/api/orders` - Get orders for current shop
- `POST /app/api/report-problem` - Submit problem report
- `GET /app/api/connection-health` - Check connection health

### Admin Routes (Operations)

#### Admin UI
- `GET /admin` - Admin operations dashboard
- `GET /admin/login` - Admin login page

#### Admin API - Statistics
- `GET /admin/api/stats` - Get summary statistics
- `GET /admin/api/delybell-health` - Check DelyBell API health

#### Admin API - Orders
- `GET /admin/api/orders` - List orders with filters
- `GET /admin/api/orders/:id` - Get single order details
- `POST /admin/api/orders/:id/retry` - Retry failed order
- `POST /admin/api/orders/sync-selected` - Bulk sync selected orders
- `POST /admin/api/orders/fetch-historical` - Fetch historical orders from Shopify

#### Admin API - Shops
- `GET /admin/api/shops` - List all connected shops
- `GET /admin/api/shops/:shop/sync-mode` - Get shop sync mode
- `POST /admin/api/shops/:shop/sync-mode` - Update shop sync mode

#### Admin API - Problem Reports
- `GET /admin/api/problem-reports` - List problem reports
- `GET /admin/api/problem-reports/:id` - Get single report
- `PATCH /admin/api/problem-reports/:id` - Update report status

#### Admin API - Diagnostics
- `GET /admin/api/status?shop=store.myshopify.com` - Check shop status
- `GET /admin/api/webhooks/status?shop=store.myshopify.com` - Check webhook registration
- `GET /admin/api/diagnose?shop=store.myshopify.com` - Full diagnostic info

### Public API Routes

- `POST /api/sync-orders` - Sync orders (legacy)
- `POST /api/process-order/:orderId` - Process single order
- `GET /api/service-types` - Get DelyBell service types
- `GET /api/blocks` - Get DelyBell blocks master data
- `GET /api/roads?block_id=X` - Get DelyBell roads for a block
- `GET /api/buildings?road_id=X&block_id=Y` - Get DelyBell buildings
- `GET /api/track/:orderId` - Track DelyBell order

### Webhook Routes

#### Order Webhooks
- `POST /webhooks/orders/create` - New order created (saves as `pending_sync`)
- `POST /webhooks/orders/update` - Order updated (updates status if needed)

#### App Lifecycle
- `POST /webhooks/app/uninstalled` - App uninstalled (cleans up shop data)

#### GDPR Compliance (Required)
- `POST /webhooks/customers/data_request` - Customer data request
- `POST /webhooks/customers/redact` - Customer data deletion
- `POST /webhooks/shop/redact` - Shop data deletion

---

## Services & Methods

### 1. **orderProcessor.js** - Order Processing Workflow

**Main Methods:**
- `processOrder(shopifyOrder, session, mappingConfig)` - Process single order
  - Transforms Shopify order to DelyBell format
  - Validates address IDs
  - Creates order in DelyBell API
  - Logs result to database
- `processOrdersBatch(orders, session, mappingConfig)` - Process multiple orders
- `logOrder(params)` - Log order processing result to database
- `validateAddressIds(blockId, roadId, buildingId)` - Validate address IDs against DelyBell master data

**Logic Flow:**
1. Transform Shopify order → DelyBell format
2. Fetch pickup location from Shopify store address
3. Parse destination address from order shipping address
4. Validate address IDs (Block ID is mandatory)
5. Create order in DelyBell API
6. Log result (success/failure) to database

### 2. **orderTransformer.js** - Order Data Transformation

**Main Methods:**
- `transformShopifyToDelybell(shopifyOrder, mappingConfig, shop)` - Transform order format
  - Maps Shopify order fields to DelyBell API format
  - Handles address parsing and ID mapping
  - Fetches pickup location from Shopify store address

**Key Transformations:**
- Order ID: Uses Shopify long ID for `customer_input_order_id`
- Pickup: Fetched from Shopify store address (cached per shop)
- Destination: Parsed from order shipping address
- Address IDs: Validated against DelyBell master data

### 3. **addressMapper.js** - Address Parsing

**Main Methods:**
- `parseAddress(addressString)` - Parse address string to extract components
- `extractBlockNumber(address)` - Extract block number
- `extractRoadNumber(address)` - Extract road number
- `extractBuildingNumber(address)` - Extract building number

**Logic:**
- Parses free-text addresses from Shopify
- Extracts Block, Road, Building numbers using regex patterns
- Handles various address formats common in Bahrain

### 4. **addressIdMapper.js** - Address ID Lookup

**Main Methods:**
- `findBlockId(blockNumber)` - Find block ID from DelyBell master data
- `findRoadId(blockId, roadNumber)` - Find road ID for a block
- `findBuildingId(roadId, blockId, buildingNumber)` - Find building ID

**Logic:**
- Searches DelyBell master data APIs
- Matches by code/number
- Returns IDs for use in order creation

### 5. **pickupLocationService.js** - Pickup Location Management

**Main Methods:**
- `getPickupLocation(shop, session)` - Get pickup location for a shop
  - Fetches store address from Shopify
  - Parses address to extract Block/Road/Building
  - Looks up IDs from DelyBell master data
  - Caches result per shop

**Caching:**
- Stores pickup location in memory cache
- Cache key: shop domain
- Cache cleared on app uninstall

### 6. **delybellClient.js** - DelyBell API Client

**Main Methods:**
- `createOrder(orderData)` - Create order in DelyBell
- `trackOrder(orderId)` - Track order status
- `getServiceTypes(search)` - Get service types
- `getBlocks(search)` - Get blocks master data
- `getRoads(blockId, search)` - Get roads for a block
- `getBuildings(roadId, blockId, search)` - Get buildings for a road

**Authentication:**
- Uses access key and secret key
- Signs requests with HMAC
- Handles API errors gracefully

### 7. **shopifyClient.js** - Shopify API Client

**Main Methods:**
- `getSession(shop)` - Get Shopify session from shop domain
- `getSessionFromRequest(req)` - Get session from Express request
- `getOrders(session, options)` - Fetch orders from Shopify
- `getOrder(session, orderId)` - Fetch single order
- `getStoreAddress(session)` - Get store address from Shopify
- `registerWebhooks(session, webhooks)` - Register webhooks

**Session Management:**
- Primary: Supabase (persistent)
- Fallback: In-memory storage (development)

### 8. **shopRepo.js** - Shop Data Repository

**Main Methods:**
- `upsertShop(shopData)` - Create or update shop
- `getShop(shop)` - Get shop by domain
- `deleteShop(shop)` - Delete shop (on uninstall)
- `updateSyncMode(shop, syncMode)` - Update sync mode

**Database:**
- Uses Supabase PostgreSQL
- Table: `shops`
- Fields: shop, access_token, scopes, installed_at, sync_mode

### 9. **db.js** - Database Client

**Exports:**
- `supabase` - Supabase client instance
- Configured with URL and service role key

---

## Order Processing Logic

### Order Status Flow

1. **pending_sync** - Order received via webhook, waiting for manual sync
2. **processed** - Successfully synced to DelyBell (has `delybell_order_id`)
3. **failed** - Sync failed (has `error_message`)
4. **completed** - Order fulfilled/completed in Shopify

### Address Mapping Logic

**Pickup Address:**
1. Fetch from Shopify Store Settings → Store details
2. Parse Block, Road, Building numbers
3. Look up IDs from DelyBell master data APIs
4. Cache per shop (avoid repeated API calls)

**Destination Address:**
1. Parse from order shipping address
2. Extract Block, Road, Building numbers
3. Look up IDs from DelyBell master data
4. Block ID is mandatory, Road/Building are optional

**Validation:**
- Block ID must exist in DelyBell master data
- Road/Building IDs validated if provided
- Full address text preserved in `delivery_instructions`

### Error Handling

**Address Errors:**
- Missing Block ID → Order fails with clear error message
- Invalid Block ID → Order fails with validation error
- Road/Building validation errors → Logged but don't block order

**API Errors:**
- DelyBell API failure → Order marked as `failed` with error message
- Retry available from dashboard
- Error details stored for debugging

---

## Setup & Deployment

### Prerequisites

- Node.js 18+
- Shopify Partner account
- Supabase account (PostgreSQL database)
- DelyBell API credentials

### Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=your-domain.onrender.com

# DelyBell Configuration
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_delybell_access_key
DELYBELL_SECRET_KEY=your_delybell_secret_key

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration
PORT=3000
NODE_ENV=production

# Order Processing
DEFAULT_SERVICE_TYPE_ID=1
```

### Installation

```bash
# Install dependencies
npm install

# Run migrations (connect to Supabase and run SQL files from supabase/migrations/)
# Or use Supabase CLI/migration tool

# Start development server
npm run dev

# Or use Shopify CLI
npm run shopify app dev
```

### Production Deployment (Render)

1. Push code to GitHub
2. Connect repo to Render
3. Render will auto-detect `render.yaml` configuration
4. Set environment variables in Render dashboard
5. Deploy

**Build Configuration:**
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check: `/health`

---

## Database Schema

### Tables

**shops**
- `shop` (TEXT, PRIMARY KEY) - Shop domain
- `access_token` (TEXT) - Shopify access token
- `scopes` (TEXT) - Granted scopes
- `installed_at` (TIMESTAMP) - Installation timestamp
- `sync_mode` (TEXT) - Sync mode (manual/auto)

**order_logs**
- `id` (SERIAL, PRIMARY KEY)
- `shop` (TEXT) - Shop domain
- `shopify_order_id` (TEXT) - Shopify order ID
- `shopify_order_number` (INTEGER) - Display order number
- `delybell_order_id` (TEXT) - DelyBell order ID
- `status` (TEXT) - pending_sync, processed, failed, completed
- `error_message` (TEXT) - Error details if failed
- `total_price` (DECIMAL) - Order total
- `currency` (TEXT) - Order currency
- `customer_name` (TEXT) - Customer name
- `phone` (TEXT) - Customer phone
- `financial_status` (TEXT) - Payment status
- `shopify_order_created_at` (TIMESTAMP) - Order creation time
- `synced_at` (TIMESTAMP) - Sync timestamp

**problem_reports**
- `id` (SERIAL, PRIMARY KEY)
- `shop` (TEXT) - Shop domain
- `order_reference` (TEXT) - Related order
- `subject` (TEXT) - Report subject
- `message` (TEXT) - Report message
- `status` (TEXT) - open, in_progress, resolved
- `admin_notes` (TEXT) - Admin response
- `created_at` (TIMESTAMP)

---

## Key Methods Reference

### Order Processing

```javascript
// Process single order
const result = await orderProcessor.processOrder(shopifyOrder, session, {
  service_type_id: 1,
  shop: 'store.myshopify.com',
  session: session
});

// Process batch
const results = await orderProcessor.processOrdersBatch(orders, session, config);

// Log order
await orderProcessor.logOrder({
  shop: 'store.myshopify.com',
  shopifyOrderId: '12345',
  status: 'processed',
  delybellOrderId: 'DB-123'
});
```

### Address Mapping

```javascript
// Parse address
const parsed = addressMapper.parseAddress('Block 338, Road 2392, Building 1');

// Get pickup location
const pickup = await pickupLocationService.getPickupLocation(shop, session);

// Find address IDs
const blockId = await addressIdMapper.findBlockId('338');
const roadId = await addressIdMapper.findRoadId(blockId, '2392');
```

### API Clients

```javascript
// Create DelyBell order
const result = await delybellClient.createOrder(orderData);

// Get Shopify orders
const orders = await shopifyClient.getOrders(session, { limit: 50 });

// Get shop session
const session = await shopifyClient.getSession('store.myshopify.com');
```

---

## Troubleshooting

### OAuth Issues
- **Cookie errors**: App automatically falls back to manual OAuth flow
- **Session not found**: Check Supabase connection and shop table
- **Redirect loops**: Verify `SHOPIFY_HOST` matches deployment URL

### Order Sync Issues
- **Orders not appearing**: Check webhook registration in Shopify Admin
- **Sync failures**: Check DelyBell API credentials and address validation
- **Missing addresses**: Verify Shopify store address is configured

### Database Issues
- **Connection errors**: Verify Supabase URL and service role key
- **Migration errors**: Run migrations in order (001-010)
- **Data not persisting**: Check Supabase project is active

---

## Technology Stack

- **Backend**: Node.js + Express.js
- **Framework**: Shopify CLI compatible structure
- **Database**: Supabase (PostgreSQL)
- **Templating**: EJS (Embedded JavaScript)
- **Styling**: Tailwind CSS + Custom CSS
- **Shopify Integration**: @shopify/shopify-api v9.0.0
- **Package Manager**: npm

---

## License

ISC

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: February 2026
