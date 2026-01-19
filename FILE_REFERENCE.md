# File Reference Guide

Complete reference of all files in the Delybell Shopify Integration project, their purposes, and how they're used.

## Table of Contents

1. [Root Files](#root-files)
2. [Routes Directory](#routes-directory)
3. [Services Directory](#services-directory)
4. [Middleware Directory](#middleware-directory)
5. [Test Directory](#test-directory)
6. [Configuration Files](#configuration-files)
7. [Documentation Files](#documentation-files)

---

## Root Files

### `server.js`
**Purpose:** Main entry point for the Express.js application  
**What it does:**
- Initializes Express server
- Configures middleware (body parser, logging)
- Registers all route handlers
- Sets up error handling
- Starts the HTTP server

**Key Features:**
- Health check endpoint (`/health`)
- Route registration (auth, webhooks, API, test)
- Webhook verification middleware
- Error handling middleware

**Required:** ✅ Yes - Application won't run without this

**Usage:**
```bash
node server.js  # Production
npm run dev     # Development (with nodemon)
```

---

### `package.json`
**Purpose:** Node.js project configuration and dependencies  
**What it does:**
- Defines project metadata (name, version, description)
- Lists all npm dependencies
- Defines npm scripts (start, dev, test commands)
- Specifies Node.js version requirements

**Key Sections:**
- `dependencies` - Required packages (@shopify/shopify-api, express, axios, etc.)
- `scripts` - Commands (start, dev, test:*)
- `keywords` - For npm/package discovery

**Required:** ✅ Yes - Needed for `npm install` and project setup

**Usage:**
```bash
npm install     # Install dependencies
npm start       # Run production server
npm run dev     # Run development server
```

---

### `config.js`
**Purpose:** Centralized configuration loader  
**What it does:**
- Loads environment variables from `.env` file
- Provides configuration object to rest of app
- Sets default values where appropriate
- Organizes config by section (shopify, delybell, server)

**Exports:**
```javascript
{
  shopify: { apiKey, apiSecret, scopes, hostName },
  delybell: { apiUrl, accessKey, secretKey },
  server: { port }
}
```

**Required:** ✅ Yes - Used throughout the application

**Usage:** Imported by other files:
```javascript
const config = require('./config');
const apiKey = config.shopify.apiKey;
```

---

### `Procfile`
**Purpose:** Heroku deployment configuration  
**What it does:**
- Tells Heroku how to start the application
- Defines the web process command

**Content:**
```
web: node server.js
```

**Required:** ⚠️ Only if deploying to Heroku

**Usage:** Automatically used by Heroku when deploying

---

### `.env` (Not in Git)
**Purpose:** Actual environment variables (secrets)  
**What it does:**
- Stores sensitive credentials
- Configures app for specific environment
- Overrides defaults

**Required:** ✅ Yes - But should NOT be committed to git

**Usage:** Created from `env.example`:
```bash
cp env.example .env
# Edit .env with actual values
```

---

### `env.example`
**Purpose:** Template for environment variables  
**What it does:**
- Documents all required environment variables
- Provides example values
- Includes helpful comments
- Safe to commit to git (no secrets)

**Required:** ✅ Yes - Reference for setting up `.env`

**Usage:** Copy to create `.env`:
```bash
cp env.example .env
```

---

## Routes Directory

### `routes/auth.js`
**Purpose:** Shopify OAuth authentication flow  
**What it does:**
- Handles app installation (OAuth flow)
- Manages OAuth callback from Shopify
- Stores authentication sessions
- Provides auth status checking

**Key Routes:**
- `GET /auth/install?shop=...` - Initiates OAuth flow
- `GET /auth/callback` - Handles OAuth callback
- `GET /auth/success` - Success page after installation
- `GET /auth/check?shop=...` - Check if shop is authenticated
- `GET /auth/debug/sessions` - Debug endpoint (dev only)
- `GET /auth/debug/config` - Debug endpoint (dev only)

**Required:** ✅ Yes - Critical for App Store app

**Dependencies:**
- `services/shopifyClient.js` - Shopify API client
- `services/sessionStorage.js` - Session storage

**Usage:** Automatically called when merchant installs app

---

### `routes/webhooks.js`
**Purpose:** Handles Shopify webhooks (order events)  
**What it does:**
- Receives order creation webhooks
- Receives order update webhooks
- Parses webhook payloads
- Processes orders and creates in Delybell
- Updates Shopify orders with tracking info

**Key Routes:**
- `POST /webhooks/orders/create` - New order created
- `POST /webhooks/orders/update` - Order updated

**Required:** ✅ Yes - Critical for automatic order processing

**Dependencies:**
- `middleware/webhookVerification.js` - HMAC verification
- `services/orderProcessor.js` - Order processing logic
- `services/shopifyClient.js` - Shopify API calls

**Usage:** Called automatically by Shopify when orders are created/updated

---

### `routes/api.js`
**Purpose:** REST API endpoints for manual operations  
**What it does:**
- Provides endpoints for manual order sync
- Exposes Delybell master data APIs
- Allows order tracking
- Enables webhook registration

**Key Routes:**
- `POST /api/sync-orders` - Sync all orders from Shopify
- `POST /api/process-order/:orderId` - Process single order
- `GET /api/service-types` - Get Delybell service types
- `GET /api/blocks` - Get Delybell blocks
- `GET /api/roads?block_id=...` - Get roads for a block
- `GET /api/buildings?road_id=...&block_id=...` - Get buildings
- `GET /api/track/:orderId` - Track Delybell order
- `POST /api/webhooks/register` - Register webhooks manually

**Required:** ⚠️ Optional - Nice to have for manual operations

**Dependencies:**
- `services/orderProcessor.js` - Order processing
- `services/delybellClient.js` - Delybell API calls
- `services/shopifyClient.js` - Shopify API calls

**Usage:** Called via HTTP requests for manual operations

---

### `routes/test.js`
**Purpose:** Test endpoints (development/testing only)  
**What it does:**
- Provides mock order processing
- Allows testing without Shopify access
- Generates sample Shopify orders
- Tests order transformation

**Key Routes:**
- `GET /test/mock-order-sample` - Get sample mock order
- `POST /test/process-mock-order` - Process mock order
- `POST /test/process-mock-orders` - Process multiple mock orders

**Required:** ❌ No - Remove or disable in production

**Dependencies:**
- `services/orderProcessor.js` - Order processing
- `test/mockShopifyOrder.js` - Mock order generator

**Usage:** For testing during development

---

## Services Directory

### `services/shopifyClient.js`
**Purpose:** Shopify API client and OAuth handler  
**What it does:**
- Initializes Shopify API SDK
- Handles OAuth authentication
- Makes Shopify API calls (get orders, update orders)
- Manages Shopify sessions
- Registers webhooks

**Key Methods:**
- `getSession(shop)` - Get stored session for shop
- `getOrders(session, options)` - Fetch orders from Shopify
- `getOrder(session, orderId)` - Get single order
- `updateOrder(session, orderId, updates)` - Update order tags/notes
- `registerWebhooks(session, webhooks)` - Register webhooks

**Required:** ✅ Yes - Core Shopify integration

**Dependencies:**
- `@shopify/shopify-api` - Shopify SDK
- `services/sessionStorage.js` - Session storage
- `config.js` - Configuration

**Usage:** Used by routes and order processor

---

### `services/delybellClient.js`
**Purpose:** Delybell API client  
**What it does:**
- Makes API calls to Delybell
- Handles authentication (HMAC signing)
- Creates orders in Delybell
- Fetches master data (blocks, roads, buildings, service types)
- Tracks orders

**Key Methods:**
- `createOrder(orderData)` - Create order in Delybell
- `getServiceTypes(search)` - Get service types
- `getBlocks(search)` - Get blocks
- `getRoads(blockId, search)` - Get roads for block
- `getBuildings(roadId, blockId, search)` - Get buildings
- `trackOrder(orderId)` - Track order status

**Required:** ✅ Yes - Core Delybell integration

**Dependencies:**
- `axios` - HTTP client
- `config.js` - Delybell API configuration

**Usage:** Used by order processor and API routes

---

### `services/orderProcessor.js`
**Purpose:** Orchestrates order processing workflow  
**What it does:**
- Coordinates the entire order processing flow
- Validates order data
- Calls address parsing and ID lookup
- Transforms order format
- Creates order in Delybell
- Updates Shopify order
- Handles errors and retries

**Key Methods:**
- `processOrder(shopifyOrder, session, mappingConfig)` - Process single order
- `processOrdersBatch(orders, session, mappingConfig)` - Process multiple orders
- `validateAddressIds(blockId, roadId, buildingId)` - Validate address IDs

**Required:** ✅ Yes - Core order processing logic

**Dependencies:**
- `services/orderTransformer.js` - Order transformation
- `services/addressMapper.js` - Address parsing
- `services/addressIdMapper.js` - ID lookup
- `services/delybellClient.js` - Delybell API
- `services/shopifyClient.js` - Shopify API

**Usage:** Called by webhook handlers and API routes

---

### `services/orderTransformer.js`
**Purpose:** Transforms Shopify order format to Delybell format  
**What it does:**
- Converts Shopify order structure to Delybell API payload
- Maps customer information
- Formats package details
- Calculates pickup date based on cutoff time
- Sets pickup slot
- Formats delivery instructions

**Key Methods:**
- `transformShopifyToDelybell(shopifyOrder, mappingConfig)` - Main transformation
- `calculateTotalWeight(lineItems)` - Calculate package weight
- `formatPackageDetails(packageDetails)` - Format for Delybell API
- `getPickupDate()` - Calculate pickup date (cutoff-based)
- `getPickupSlot()` - Get pickup slot

**Required:** ✅ Yes - Order format conversion

**Dependencies:**
- `services/addressMapper.js` - Get pickup config
- `services/addressIdMapper.js` - Convert address numbers to IDs

**Usage:** Called by order processor

---

### `services/addressMapper.js`
**Purpose:** Parses Shopify addresses to extract structured components  
**What it does:**
- Extracts Block, Road, Building numbers from address strings
- Handles multiple address formats
- Uses zip code as Block fallback (Bahrain)
- Returns human-readable numbers (not IDs)
- Provides hardcoded pickup address config

**Key Methods:**
- `parseShopifyAddress(address)` - Parse address string
- `getBabybowPickupConfig()` - Get hardcoded pickup address
- `isValidMapping(mapping)` - Validate parsed address

**Supported Formats:**
- "Building 134, Road 354, Block 306"
- "Block 306, Road 354, Building 134"
- "Building: 2733, Road: 3953" (with zip as Block)
- Various abbreviations (Bldg, Rd, Blk)

**Required:** ✅ Yes - Address parsing

**Dependencies:** None (pure parsing logic)

**Usage:** Called by order transformer

---

### `services/addressIdMapper.js`
**Purpose:** Converts human-readable address numbers to Delybell IDs  
**What it does:**
- Looks up Block ID from Block number + area name
- Looks up Road ID from Road number + Block ID
- Looks up Building ID from Building number + Road ID + Block ID
- Uses Delybell master data APIs for lookups
- Handles lookup failures

**Key Methods:**
- `convertNumbersToIds(addressNumbers, areaName)` - Main conversion method
- `findBlockId(blockNumber, areaName)` - Find Block ID
- `findRoadId(blockId, roadNumber)` - Find Road ID
- `findBuildingId(blockId, roadId, buildingNumber)` - Find Building ID

**Required:** ✅ Yes - Address ID conversion

**Dependencies:**
- `services/delybellClient.js` - Delybell master data APIs

**Usage:** Called by order transformer

---

### `services/sessionStorage.js`
**Purpose:** Manages Shopify OAuth session storage  
**What it does:**
- Stores Shopify sessions (access tokens)
- Retrieves sessions by ID
- Deletes expired sessions
- Currently uses in-memory storage (needs database for production)

**Key Methods:**
- `storeSession(id, session)` - Store session
- `loadSession(id)` - Load session
- `deleteSession(id)` - Delete session
- `getAllSessionIds()` - Get all session IDs (debug)

**Required:** ✅ Yes - Session management

**Current Implementation:** In-memory (Map)  
**Production:** Should use database (PostgreSQL/Redis)

**Usage:** Used by Shopify client for OAuth

---

## Middleware Directory

### `middleware/webhookVerification.js`
**Purpose:** Verifies Shopify webhook authenticity  
**What it does:**
- Validates HMAC signatures on webhooks
- Prevents unauthorized webhook calls
- Ensures webhooks are from Shopify
- Rejects invalid webhooks

**Required:** ✅ Yes - Security requirement

**Dependencies:**
- `config.js` - Shopify API secret
- `crypto` - Node.js crypto module

**Usage:** Automatically applied to `/webhooks/*` routes in `server.js`

---

## Test Directory

### `test/mockShopifyOrder.js`
**Purpose:** Generates mock Shopify orders for testing  
**What it does:**
- Creates sample Shopify order objects
- Supports customization via options
- Generates multiple orders
- Provides realistic test data

**Key Functions:**
- `generateMockShopifyOrder(options)` - Generate single mock order
- `generateMockShopifyOrders(count, options)` - Generate multiple orders

**Required:** ❌ No - Testing utility only

**Usage:** Used by test routes and test scripts

---

### `test/testDelybellAPI.js`
**Purpose:** Test script for Delybell API connectivity  
**What it does:**
- Tests connection to Delybell API
- Fetches service types, blocks, roads
- Verifies API credentials
- Displays sample data

**Required:** ❌ No - Testing utility only

**Usage:**
```bash
npm run test:delybell
```

---

### `test/testAddressParser.js`
**Purpose:** Test script for address parsing logic  
**What it does:**
- Tests various address formats
- Verifies parsing accuracy
- Tests edge cases
- Validates zip code fallback

**Required:** ❌ No - Testing utility only

**Usage:**
```bash
npm run test:address
```

---

### `test/testOrderCreation.js`
**Purpose:** Test script for end-to-end order creation  
**What it does:**
- Tests complete order processing flow
- Creates test order in Delybell
- Verifies address parsing and ID lookup
- Tests error handling

**Required:** ❌ No - Testing utility only

**Usage:**
```bash
npm run test:order
```

---

### `test/verifyAddressParser.js`
**Purpose:** Quick address parser verification tool  
**What it does:**
- Tests specific address strings
- Useful for debugging address parsing issues
- Shows parsed components

**Required:** ❌ No - Testing utility only

**Usage:**
```bash
node test/verifyAddressParser.js
```

---

## Configuration Files

### `.gitignore`
**Purpose:** Tells Git which files to ignore  
**What it ignores:**
- `node_modules/` - Dependencies
- `.env` - Environment variables (secrets)
- Log files
- OS files

**Required:** ✅ Yes - Prevents committing secrets

---

## Documentation Files

### `README.md`
**Purpose:** Project overview and quick start guide  
**What it contains:**
- Project description
- Features list
- Installation instructions
- Quick start guide
- API endpoint reference
- Links to other documentation

**Required:** ✅ Yes - First file developers see

---

### `DOCUMENTATION.md`
**Purpose:** Complete technical documentation  
**What it contains:**
- Architecture overview
- Detailed API reference
- Configuration guide
- Usage examples
- Troubleshooting guide

**Required:** ✅ Yes - Comprehensive reference

---

### `PRODUCTION_GUIDE.md`
**Purpose:** Production deployment guide  
**What it contains:**
- Deployment options (Heroku, AWS, etc.)
- Database setup
- Security hardening
- Monitoring setup
- Scaling considerations

**Required:** ✅ Yes - For production deployment

---

### `SHOPIFY_APP_STORE_GUIDE.md`
**Purpose:** Guide for publishing to Shopify App Store  
**What it contains:**
- Partner account setup
- App creation steps
- App Store listing preparation
- Submission process
- Review guidelines

**Required:** ✅ Yes - For App Store publishing

---

### `DEVELOPER_GUIDE.md`
**Purpose:** Technical guide for developers  
**What it contains:**
- File structure explanation
- Component details
- Configuration reference
- Common issues and solutions

**Required:** ✅ Yes - Developer reference

---

### `CLIENT_SETUP.md`
**Purpose:** Quick setup guide for Delybell clients  
**What it contains:**
- Installation steps
- Testing instructions
- Troubleshooting common issues
- Support information

**Required:** ✅ Yes - For end users

---

### `APP_STORE_CHECKLIST.md`
**Purpose:** Quick checklist for App Store submission  
**What it contains:**
- Pre-submission checklist
- Testing checklist
- Quick reference

**Required:** ✅ Yes - Submission reference

---

### `PUBLISHING_SUMMARY.md`
**Purpose:** Quick reference for publishing  
**What it contains:**
- Overview of publishing process
- File purpose summary
- Quick start guide

**Required:** ✅ Yes - Quick reference

---

### `ALIGNMENT_CHECK.md`
**Purpose:** Verification report  
**What it contains:**
- Code-documentation alignment check
- Verification results
- Notes on discrepancies

**Required:** ⚠️ Optional - Reference only

---

## File Dependencies Map

```
server.js
├── routes/auth.js
│   ├── services/shopifyClient.js
│   └── services/sessionStorage.js
├── routes/webhooks.js
│   ├── middleware/webhookVerification.js
│   ├── services/orderProcessor.js
│   └── services/shopifyClient.js
├── routes/api.js
│   ├── services/orderProcessor.js
│   ├── services/delybellClient.js
│   └── services/shopifyClient.js
└── routes/test.js
    ├── services/orderProcessor.js
    └── test/mockShopifyOrder.js

orderProcessor.js
├── services/orderTransformer.js
│   ├── services/addressMapper.js
│   └── services/addressIdMapper.js
│       └── services/delybellClient.js
├── services/delybellClient.js
└── services/shopifyClient.js
```

---

## Quick Reference

### Required for Production
- ✅ `server.js`
- ✅ `package.json`
- ✅ `config.js`
- ✅ `routes/auth.js`
- ✅ `routes/webhooks.js`
- ✅ `services/*.js` (all)
- ✅ `middleware/webhookVerification.js`
- ✅ `.env` (created from `env.example`)

### Optional/Development
- ⚠️ `routes/api.js` (nice to have)
- ❌ `routes/test.js` (remove in production)
- ❌ `test/*.js` (testing only)
- ❌ Documentation files (helpful but not required)

### Deployment Files
- ⚠️ `Procfile` (Heroku only)
- ⚠️ `.gitignore` (if using Git)

---

## File Size & Complexity

| File | Lines | Complexity | Purpose |
|------|-------|------------|---------|
| `server.js` | ~97 | Low | Entry point |
| `routes/auth.js` | ~192 | Medium | OAuth flow |
| `routes/webhooks.js` | ~217 | Medium | Webhook handlers |
| `routes/api.js` | ~290 | Medium | API endpoints |
| `services/orderProcessor.js` | ~200+ | High | Core logic |
| `services/orderTransformer.js` | ~400+ | High | Format conversion |
| `services/addressMapper.js` | ~200+ | Medium | Address parsing |
| `services/addressIdMapper.js` | ~150+ | Medium | ID lookup |

---

**Last Updated:** Auto-generated  
**For Questions:** See `DEVELOPER_GUIDE.md` or `DOCUMENTATION.md`
