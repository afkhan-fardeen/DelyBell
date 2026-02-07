# Delybell Order Sync - Complete Documentation

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Hosted at:** https://delybell.onrender.com

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Routes & Endpoints](#routes--endpoints)
5. [Views & Pages](#views--pages)
6. [Services](#services)
7. [Database Schema](#database-schema)
8. [Webhooks](#webhooks)
9. [Configuration](#configuration)
10. [Features & Functionality](#features--functionality)
11. [Security & Compliance](#security--compliance)

---

## Project Overview

Delybell Order Sync is a production-ready Shopify embedded app that automatically syncs orders from Shopify stores to Delybell's delivery management system. The app uses **manual sync mode** exclusively, allowing store owners to review and sync orders when ready.

### Key Features

- ✅ **Manual Order Sync** - Store owners control when orders are synced
- ✅ **Order Management** - View, filter, and manage orders with status tracking
- ✅ **Bulk Operations** - Sync multiple orders at once
- ✅ **Error Handling** - Friendly error messages with retry functionality
- ✅ **GDPR Compliant** - Full webhook compliance for Shopify App Store
- ✅ **Admin Dashboard** - Operations dashboard for monitoring all shops
- ✅ **Problem Reports** - Store owners can report issues directly

---

## Architecture

### Technology Stack

- **Backend:** Node.js + Express.js
- **Database:** Supabase (PostgreSQL)
- **Templating:** EJS (Embedded JavaScript)
- **Styling:** Tailwind CSS + Custom CSS
- **Icons:** Material Icons
- **Shopify Integration:** @shopify/shopify-api v9.0.0
- **Session Storage:** Supabase (persistent across devices)

### Application Flow

```
1. Store Owner installs app → OAuth flow → Session stored in Supabase
2. New order created → Webhook received → Saved as "pending_sync"
3. Store Owner opens app → Views orders → Selects orders → Syncs manually
4. Order synced → Status updated to "processed" → Delybell Order ID saved
5. Order fulfilled/completed → Status updated to "completed"
```

### Middleware Order (Critical for Webhooks)

```javascript
1. Cookie Parser (for OAuth)
2. CSP Headers (for iframe embedding)
3. Request Logging
4. Health Check
5. 🚨 WEBHOOK ROUTES (BEFORE body parsers)
6. Body Parsers (express.json, express.urlencoded)
7. Static Files
8. OAuth Routes
9. Admin Routes
10. API Routes
```

---

## Project Structure

```
DelyBell/
├── server.js                    # Main Express server
├── config.js                    # Configuration loader
├── package.json                 # Dependencies
├── shopify.app.toml            # Shopify app configuration
├── env.example                  # Environment variables template
│
├── routes/                      # API Routes
│   ├── admin.js                # Admin dashboard & API routes
│   ├── auth.js                 # OAuth & installation
│   ├── api.js                  # Public API endpoints
│   └── webhooks.js             # Shopify webhook handlers
│
├── services/                    # Business Logic
│   ├── shopifyClient.js        # Shopify API client
│   ├── delybellClient.js       # Delybell API client
│   ├── orderProcessor.js       # Order processing workflow
│   ├── orderTransformer.js     # Order data transformation
│   ├── addressMapper.js        # Address parsing
│   ├── addressIdMapper.js      # Address ID lookup
│   ├── pickupLocationService.js # Pickup location fetcher
│   ├── shopRepo.js             # Shop data repository
│   ├── db.js                   # Supabase client
│   └── sessionStorage.js       # Session storage (legacy)
│
├── views/                       # EJS Templates
│   ├── app.ejs                 # Main embedded app UI
│   ├── admin-dashboard.ejs     # Admin operations dashboard
│   ├── help-center.ejs         # Help center page
│   ├── login.ejs               # Admin login page
│   ├── privacy.ejs             # Privacy policy
│   └── terms.ejs                # Terms of service
│
├── public/                      # Static Files
│   ├── index.html              # Public install page
│   ├── privacy-policy.html     # Privacy policy (static)
│   └── terms-of-service.html   # Terms of service (static)
│
├── middleware/                  # Express Middleware
│   └── webhookVerification.js  # Webhook HMAC verification
│
├── utils/                       # Utilities
│   └── normalizeShop.js        # Shop domain normalization
│
└── supabase/                    # Database Migrations
    └── migrations/
        ├── 001_create_tables.sql
        ├── 002_add_order_fields.sql
        ├── 003_add_customer_fields.sql
        ├── 004_add_shopify_order_created_at.sql
        ├── 005_add_sync_mode.sql
        ├── 006_add_unique_constraint_order_logs.sql
        ├── 007_create_problem_reports.sql
        ├── 008_enhance_sync_tracking.sql
        ├── 009_add_financial_status.sql
        └── 010_add_oauth_state.sql
```

---

## Routes & Endpoints

### Public Routes

#### Landing & Installation
- `GET /` - Public install page (static HTML)
- `GET /privacy` - Privacy policy page
- `GET /terms` - Terms of service page

#### OAuth & Authentication
- `GET /auth/install?shop=store.myshopify.com` - Start OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `GET /auth/check?shop=store.myshopify.com` - Check authentication status
- `GET /auth/success` - OAuth success page

### Embedded App Routes (Shopify Admin)

#### Main App
- `GET /app?shop=store.myshopify.com` - Main embedded app UI
- `GET /app/help-center?shop=store.myshopify.com` - Help center page

#### App API (Store Owner)
- `POST /app/api/report-problem` - Submit problem report

### Admin Routes (Operations Dashboard)

#### Admin UI
- `GET /admin` - Admin operations dashboard
- `GET /admin/login` - Admin login page
- `GET /admin/help-center` - Admin help center

#### Admin API - Statistics
- `GET /admin/api/stats` - Get summary statistics
- `GET /admin/api/delybell-health` - Check Delybell API health

#### Admin API - Orders
- `GET /admin/api/orders` - List orders with filters
  - Query params: `shop`, `status`, `search`, `dateFrom`, `dateTo`, `limit`, `offset`
- `GET /admin/api/orders/:id` - Get single order details
- `POST /admin/api/orders/:id/retry` - Retry failed order sync
- `POST /admin/api/orders/sync-selected` - Bulk sync selected orders
- `POST /admin/api/orders/sync-all` - Sync all pending orders for a shop
- `POST /admin/api/orders/fetch-historical` - Fetch historical orders from Shopify

#### Admin API - Shops
- `GET /admin/api/shops` - List all connected shops
- `GET /admin/api/shops/:shop/sync-mode` - Get shop sync mode
- `POST /admin/api/shops/:shop/sync-mode` - Update shop sync mode

#### Admin API - Problem Reports
- `GET /admin/api/problem-reports` - List problem reports
  - Query params: `shop`, `status`, `limit`, `offset`
- `GET /admin/api/problem-reports/:id` - Get single report
- `PATCH /admin/api/problem-reports/:id` - Update report status
  - Body: `{ status, admin_notes }`

#### Admin API - Diagnostics
- `GET /admin/api/status?shop=store.myshopify.com` - Check shop status
- `GET /admin/api/webhooks/status?shop=store.myshopify.com` - Check webhook registration
- `GET /admin/api/order-logs?shop=store.myshopify.com&limit=10` - Get recent order logs
- `GET /admin/api/diagnose?shop=store.myshopify.com` - Full diagnostic info
- `GET /admin/api/debug?shop=store.myshopify.com` - Debug endpoint
- `GET /admin/api/resolve-shop?domain=example.com&suggested=example.myshopify.com` - Resolve shop domain
- `GET /admin/api/synced-orders?shop=store.myshopify.com` - Get synced orders
- `GET /admin/api/test-order` - Test order processing
- `POST /admin/api/fix-sync-mode` - Fix sync mode issues

### Public API Routes

- `POST /api/sync-orders` - Sync orders (legacy endpoint)
- `POST /api/process-order/:orderId` - Process single order
- `GET /api/service-types` - Get Delybell service types
- `GET /api/blocks` - Get Delybell blocks master data
- `GET /api/roads` - Get Delybell roads master data
- `GET /api/buildings` - Get Delybell buildings master data
- `GET /api/track/:orderId` - Track Delybell order
- `POST /api/webhooks/register` - Register webhooks manually

### Webhook Routes

#### Order Webhooks
- `POST /webhooks/orders/create` - New order created
- `POST /webhooks/orders/update` - Order updated

#### App Lifecycle Webhooks
- `POST /webhooks/app/uninstalled` - App uninstalled

#### GDPR Compliance Webhooks (Required)
- `POST /webhooks/customers/data_request` - Customer data request
- `POST /webhooks/customers/redact` - Customer data deletion
- `POST /webhooks/shop/redact` - Shop data deletion

### Health Check
- `GET /health` - Health check endpoint

---

## Views & Pages

### 1. `views/app.ejs` - Main Embedded App UI

**Purpose:** Main interface for store owners to manage orders

**Features:**
- **Connection & Health Status**
  - Shopify connection status
  - Delybell connection status
  - Last sync time (relative: "5 min ago", "2 days ago")
  - Warning banners for issues

- **Order Management**
  - Tabbed interface: All, Synced, Pending, Failed
  - Order table with columns:
    - Order #, Date, Payment, Sync Status, Delybell Order ID, Actions
  - Pagination support
  - Real-time status updates

- **Bulk Actions**
  - Checkbox selection for multiple orders
  - Bulk sync button
  - Bulk retry for failed orders
  - Disabled state when nothing selected

- **Order Actions**
  - **Sync** - Sync pending orders to Delybell
  - **Retry** - Retry failed orders
  - **View** - View order details (read-only)

- **Status Badges**
  - Synced (blue) - Successfully synced
  - Completed (blue) - Order fulfilled/completed
  - Pending (yellow) - Awaiting sync
  - Failed (red) - Sync failed

- **Payment Badges**
  - Paid (green) - Payment received
  - COD (purple) - Cash on delivery

- **UI Design**
  - Minimal flat design (Framer-like)
  - Delybell brand colors: Blue (#010a8b) & Purple (#7c3aed)
  - Responsive layout
  - Dark mode support
  - Toast notifications

**Key Functions:**
- `loadOrders()` - Load orders with filters
- `loadConnectionHealth()` - Load connection status
- `syncSingleOrder()` - Sync individual order
- `syncSelectedOrders()` - Bulk sync
- `retryOrder()` - Retry failed order
- `viewOrderDetails()` - Show order details modal
- `switchTab()` - Switch between order tabs

### 2. `views/admin-dashboard.ejs` - Admin Operations Dashboard

**Purpose:** Operations dashboard for monitoring all shops and orders

**Features:**
- **Tabbed Interface**
  - Overview - Stats + recent orders
  - Orders - Full order list with filters
  - Shops - Connected shops list
  - Reports - Problem reports

- **Statistics Cards**
  - Total Orders
  - Synced Orders
  - Failed Orders
  - Pending Orders

- **Order Management**
  - Advanced filtering (shop, status, search, date range)
  - Order details modal
  - Retry functionality
  - Export capabilities

- **Shop Management**
  - List all connected shops
  - Shop status (Active/Inactive)
  - Installation date
  - Sync mode display

- **Problem Reports**
  - List all reports
  - Filter by status
  - View report details
  - Update report status
  - Admin notes

**Key Functions:**
- `loadStats()` - Load statistics
- `loadOrders()` - Load orders with filters
- `loadShops()` - Load connected shops
- `loadProblemReports()` - Load problem reports
- `viewOrderDetails()` - Show order details
- `viewReportDetails()` - Show report details
- `retryOrder()` - Retry failed order

### 3. `views/help-center.ejs` - Help Center

**Purpose:** Help documentation for store owners

**Sections:**
- Getting Started
- Manual Sync Guide
- Common Questions
- Troubleshooting
- Quick Links

### 4. `views/login.ejs` - Admin Login

**Purpose:** Simple login page for admin dashboard

**Features:**
- Session-based authentication
- Simple password check
- Redirect to admin dashboard

### 5. `public/index.html` - Public Install Page

**Purpose:** Public landing page for app installation

**Features:**
- Shop domain input
- Install button
- Instructions for finding Shopify domain
- Links to privacy policy and terms

### 6. `views/privacy.ejs` & `views/terms.ejs` - Legal Pages

**Purpose:** Privacy policy and terms of service pages

---

## Services

### 1. `services/shopifyClient.js` - Shopify API Client

**Purpose:** Wrapper for Shopify API interactions

**Key Methods:**
- `getSession(shop)` - Get shop session
- `getOrders(session, options)` - Fetch orders from Shopify
- `getStoreAddress(session)` - Get store address
- `registerWebhooks(session, webhooks)` - Register webhooks
- `registerGDPRWebhooks(session, webhookBaseUrl)` - Register GDPR webhooks
- `getWebhooks(session)` - List registered webhooks

### 2. `services/delybellClient.js` - Delybell API Client

**Purpose:** Wrapper for Delybell API interactions

**Key Methods:**
- `createOrder(orderData)` - Create order in Delybell
- `getServiceTypes()` - Get service types
- `getBlocks()` - Get blocks master data
- `getRoads(blockId)` - Get roads for a block
- `getBuildings(roadId)` - Get buildings for a road
- `trackOrder(orderId)` - Track order status

### 3. `services/orderProcessor.js` - Order Processing

**Purpose:** Core order processing workflow

**Key Methods:**
- `logOrder(orderData)` - Save order to database
- `processOrder(shopifyOrder, session, mappingConfig)` - Process single order
- `processOrdersBatch(orders, session, mappingConfig)` - Process multiple orders

**Order Statuses:**
- `pending_sync` - Order saved, awaiting manual sync
- `processed` - Successfully synced to Delybell
- `failed` - Sync failed (can retry)
- `completed` - Order fulfilled/completed in Shopify

### 4. `services/orderTransformer.js` - Order Transformation

**Purpose:** Transform Shopify order to Delybell format

**Key Methods:**
- `transformOrder(shopifyOrder, mappingConfig)` - Transform order data
- Handles address parsing and ID mapping
- Validates required fields

### 5. `services/addressMapper.js` - Address Parsing

**Purpose:** Parse addresses from Shopify format

**Key Methods:**
- `parseAddress(addressString)` - Parse address string
- Extracts Block, Road, Building numbers
- Handles various address formats

### 6. `services/addressIdMapper.js` - Address ID Lookup

**Purpose:** Map address components to Delybell IDs

**Key Methods:**
- `findBlockId(blockNumber)` - Find block ID
- `findRoadId(blockId, roadNumber)` - Find road ID
- `findBuildingId(roadId, buildingNumber)` - Find building ID

### 7. `services/pickupLocationService.js` - Pickup Location

**Purpose:** Fetch and cache pickup locations per shop

**Key Methods:**
- `getPickupLocation(shop, session)` - Get pickup location for shop
- Caches locations to avoid repeated API calls
- Fetches from Shopify store address

### 8. `services/shopRepo.js` - Shop Repository

**Purpose:** Database operations for shops

**Key Methods:**
- `getShop(shop)` - Get shop data
- `upsertShop(shopData)` - Create/update shop
- `deleteShop(shop)` - Delete shop (on uninstall)

### 9. `services/db.js` - Database Client

**Purpose:** Supabase client initialization

**Exports:** `{ supabase }` - Configured Supabase client

---

## Database Schema

### Tables

#### 1. `shops` - Shop Data

```sql
CREATE TABLE shops (
  shop TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  scopes TEXT,
  installed_at TIMESTAMP DEFAULT NOW(),
  sync_mode TEXT DEFAULT 'manual' CHECK (sync_mode IN ('auto', 'manual')),
  auto_sync_enabled_at TIMESTAMP WITH TIME ZONE
);
```

**Fields:**
- `shop` - Shop domain (e.g., "store.myshopify.com")
- `access_token` - Shopify OAuth access token
- `scopes` - Granted scopes
- `installed_at` - Installation timestamp
- `sync_mode` - Sync mode ('manual' or 'auto', default: 'manual')
- `auto_sync_enabled_at` - When auto sync was enabled (if applicable)

#### 2. `order_logs` - Order Tracking

```sql
CREATE TABLE order_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop TEXT NOT NULL,
  shopify_order_id BIGINT NOT NULL,
  shopify_order_number INTEGER,
  delybell_order_id TEXT,
  status TEXT, -- 'pending_sync', 'processed', 'failed', 'completed'
  error_message TEXT,
  total_price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  customer_name TEXT,
  phone TEXT,
  shopify_order_created_at TIMESTAMP,
  financial_status TEXT,
  synced_at TIMESTAMP WITH TIME ZONE,
  last_sync_attempt_at TIMESTAMP WITH TIME ZONE,
  sync_error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `shop` - Shop domain
- `shopify_order_id` - Shopify order ID (long format)
- `shopify_order_number` - Display order number
- `delybell_order_id` - Delybell order ID (if synced)
- `status` - Order status
- `error_message` - Error message if failed
- `total_price` - Order total
- `currency` - Order currency
- `customer_name` - Customer name
- `phone` - Customer phone
- `shopify_order_created_at` - When order was placed
- `financial_status` - Payment status
- `synced_at` - When order was synced
- `last_sync_attempt_at` - Last sync attempt timestamp
- `sync_error_message` - Sync error message
- `created_at` - Record creation timestamp

**Indexes:**
- `idx_order_logs_shop` - On `shop`
- `idx_order_logs_shopify_order_id` - On `shopify_order_id`
- `idx_order_logs_status` - On `status`
- `idx_order_logs_synced_at` - On `synced_at` (where not null)
- `idx_order_logs_shop_created_at` - On `shop, created_at DESC`

#### 3. `problem_reports` - Problem Reports

```sql
CREATE TABLE problem_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop TEXT NOT NULL,
  shopify_order_id BIGINT,
  shopify_order_number TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Fields:**
- `shop` - Shop domain
- `shopify_order_id` - Related order ID (optional)
- `shopify_order_number` - Related order number (optional)
- `subject` - Report subject
- `message` - Report message
- `status` - Report status
- `reported_at` - When reported
- `resolved_at` - When resolved
- `admin_notes` - Admin notes
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `idx_problem_reports_shop` - On `shop`
- `idx_problem_reports_status` - On `status`
- `idx_problem_reports_reported_at` - On `reported_at DESC`

#### 4. `oauth_states` - OAuth State Tracking

```sql
CREATE TABLE oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Store OAuth state for secure OAuth flow (fixes cookie issues behind proxies)

---

## Webhooks

### Order Webhooks

#### `POST /webhooks/orders/create`

**Purpose:** Handle new order creation

**Flow:**
1. Verify HMAC signature
2. Parse order data
3. Check if order is already fulfilled/completed (skip if yes)
4. Save order as `pending_sync` status
5. Return 200 OK immediately

**Response:** `200 OK` (always, even on errors)

#### `POST /webhooks/orders/update`

**Purpose:** Handle order updates

**Flow:**
1. Verify HMAC signature
2. Parse order data
3. Check if order is already synced (skip update if yes)
4. If order becomes fulfilled/completed, mark as `completed`
5. Otherwise, update order data
6. Return 200 OK immediately

**Response:** `200 OK` (always, even on errors)

### App Lifecycle Webhooks

#### `POST /webhooks/app/uninstalled`

**Purpose:** Handle app uninstallation

**Flow:**
1. Verify HMAC signature
2. Delete shop data from database
3. Clear pickup location cache
4. Return 200 OK

**Note:** Order logs are kept for historical record (compliance)

### GDPR Compliance Webhooks

#### `POST /webhooks/customers/data_request`

**Purpose:** Handle customer data request (GDPR)

**Flow:**
1. Verify HMAC signature
2. Return `200 OK` with plain text "OK"

**Note:** Currently no customer data stored separately (only in order_logs)

#### `POST /webhooks/customers/redact`

**Purpose:** Handle customer data deletion (GDPR)

**Flow:**
1. Verify HMAC signature
2. Anonymize customer data in `order_logs` (set `customer_name` and `phone` to `[REDACTED]`)
3. Return `200 OK` with plain text "OK"

#### `POST /webhooks/shop/redact`

**Purpose:** Handle shop data deletion (GDPR)

**Flow:**
1. Verify HMAC signature
2. Delete shop from `shops` table
3. Delete all `order_logs` for shop
4. Delete all `problem_reports` for shop
5. Return `200 OK` with plain text "OK"

**Note:** Called 48 hours after app uninstall

### Webhook Security

**HMAC Verification:**
- All webhooks require HMAC signature verification
- Uses `x-shopify-hmac-sha256` header
- Calculates HMAC using raw request body (Buffer)
- Uses timing-safe comparison
- **NO BYPASSES** - strict verification always

**Body Parsing:**
- Webhook routes use `express.raw({ type: 'application/json' })`
- Body remains as Buffer for HMAC verification
- Parsed after verification for processing

---

## Configuration

### Environment Variables

#### Shopify Configuration
```bash
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=delybell.onrender.com  # Without https://
```

#### Delybell Configuration
```bash
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_access_key
DELYBELL_SECRET_KEY=your_secret_key
DEFAULT_SERVICE_TYPE_ID=1
```

#### Database Configuration
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Server Configuration
```bash
PORT=3000
NODE_ENV=production
```

### Shopify App Configuration (`shopify.app.toml`)

```toml
name = "Delybell Order Sync"
client_id = "YOUR_CLIENT_ID"
application_url = "https://delybell.onrender.com/app"
embedded = true

[access_scopes]
scopes = "read_orders,write_orders"

[[webhooks]]
api_version = "2025-10"
subscriptions = [
  "orders/create",
  "orders/updated",
  "app/uninstalled",
  "customers/data_request",
  "customers/redact",
  "shop/redact"
]
```

---

## Features & Functionality

### Order Management

#### Order Statuses
- **Pending Sync** (`pending_sync`) - Order saved, awaiting manual sync
- **Synced** (`processed`) - Successfully synced to Delybell
- **Failed** (`failed`) - Sync failed, can retry
- **Completed** (`completed`) - Order fulfilled/completed in Shopify

#### Order Filtering
- Filter by shop
- Filter by status (All, Synced, Pending, Failed)
- Search by order number, phone, or Delybell ID
- Date range filtering

#### Order Actions
- **Sync** - Sync pending order to Delybell
- **Retry** - Retry failed order sync
- **View** - View order details (read-only)
- **Bulk Sync** - Sync multiple orders at once
- **Bulk Retry** - Retry multiple failed orders

### Address Mapping

#### Pickup Address
- Fetched from Shopify store address (Settings → Store details)
- Parsed to extract Block, Road, Building numbers
- Converted to Delybell IDs using master data APIs
- Cached per store to avoid repeated API calls

#### Destination Address
- Parsed from customer's shipping address
- Extracts Block, Road, Building numbers
- Uses zip code as fallback for Block number
- Converts to Delybell IDs

#### Validation
- Both addresses validated against Delybell master data
- Error handling for invalid addresses
- Friendly error messages for store owners

### Sync Process

#### Manual Sync Flow
1. Store owner opens app
2. Views pending orders
3. Selects orders to sync (checkbox)
4. Clicks "Sync Selected"
5. Orders are synced to Delybell
6. Status updated to "processed"
7. Delybell Order ID saved

#### Order Processing
1. Fetch order from Shopify
2. Parse shipping address
3. Get pickup location (from store address)
4. Map addresses to Delybell IDs
5. Transform order to Delybell format
6. Create order in Delybell
7. Save Delybell Order ID
8. Update status to "processed"

### Error Handling

#### Error Types
- **Address Errors** - Invalid or missing address components
- **API Errors** - Delybell API failures
- **Validation Errors** - Missing required fields
- **Network Errors** - Connection issues

#### Error Display
- Friendly error messages (no technical jargon)
- Collapsible error details
- Retry functionality for failed orders
- Error logging for debugging

### Problem Reports

#### Store Owner
- Can report problems from app UI
- Includes order number (optional)
- Subject and message fields
- Status tracking

#### Admin
- View all problem reports
- Filter by status
- Update report status
- Add admin notes
- Track resolution

---

## Security & Compliance

### Security Features

#### HMAC Verification
- All webhooks verified with HMAC signatures
- Uses `crypto.timingSafeEqual` for timing attack prevention
- Raw body preserved for accurate verification
- **NO BYPASSES** - strict verification always

#### Session Management
- Sessions stored in Supabase (encrypted at rest)
- OAuth state stored in database (fixes cookie issues)
- Secure token handling
- Session expiration handling

#### Iframe Embedding
- CSP headers configured for Shopify iframe
- `frame-ancestors` directive allows Shopify admin
- No X-Frame-Options (Shopify uses CSP)

### GDPR Compliance

#### Required Webhooks
- ✅ `customers/data_request` - Returns 200 OK
- ✅ `customers/redact` - Anonymizes customer data
- ✅ `shop/redact` - Deletes shop and order data

#### Data Handling
- Customer data anonymized on request
- Shop data deleted on uninstall
- Order logs kept for historical record (compliance)
- No customer PII stored separately

### Shopify App Store Compliance

#### Requirements Met
- ✅ Mandatory compliance webhooks
- ✅ HMAC signature verification
- ✅ Proper webhook response format
- ✅ Iframe embedding support
- ✅ OAuth flow implementation
- ✅ Error handling
- ✅ Privacy policy and terms

---

## Deployment

### Production (Render)

**URL:** https://delybell.onrender.com

**Environment Variables:**
Set in Render Dashboard → Environment Variables

**Required Variables:**
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_HOST=delybell.onrender.com`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DELYBELL_API_URL`
- `DELYBELL_ACCESS_KEY`
- `DELYBELL_SECRET_KEY`
- `NODE_ENV=production`
- `PORT=3000`

### Local Development

**Setup:**
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`
3. Set environment variables
4. Set up tunneling for webhooks
5. Run: `npm run dev`

**Tunneling Options:**
- Cloudflare Tunnel: `npm run tunnel`
- LocalTunnel: `npm run tunnel:lt`

---

## API Documentation

### Delybell API

**Base URL:** https://new.api.delybell.com

**Postman Documentation:**
https://documenter.getpostman.com/view/37966240/2sB34eKND9

### Shopify API

**Documentation:**
https://shopify.dev/docs/api

**API Version:** 2025-10

---

## Troubleshooting

### Common Issues

#### OAuth Not Working
- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
- Check `SHOPIFY_HOST` matches deployment URL (without https://)
- Ensure Shopify Partner Dashboard URLs match app URL

#### Webhooks Not Receiving Orders
- Verify webhook URLs are accessible
- Check webhooks are registered in Shopify
- Verify HMAC signature validation
- Check logs for webhook processing errors

#### Address Mapping Errors
- Verify store address is configured in Shopify Settings
- Check address format includes Block and Road numbers
- Verify Block/Road/Building IDs exist in Delybell master data

#### Orders Not Appearing
- Check webhook registration
- Verify order is not already fulfilled/completed
- Check database for order logs
- Verify shop is authenticated

---

## License

ISC

---

## Support

For issues or questions:
- Check Help Center in app (`/app/help-center`)
- Submit problem report from app UI
- Contact admin via admin dashboard

---

**Last Updated:** February 2026  
**Version:** 1.0.0
