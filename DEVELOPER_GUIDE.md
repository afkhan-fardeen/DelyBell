# Developer Guide - Shopify App Store Publishing

Complete technical guide for developers to understand the project structure and publish the app to Shopify App Store.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure & Purpose](#file-structure--purpose)
4. [Key Components](#key-components)
5. [Configuration Files](#configuration-files)
6. [Environment Setup](#environment-setup)
7. [Deployment Process](#deployment-process)
8. [App Store Publishing Steps](#app-store-publishing-steps)
9. [Testing Checklist](#testing-checklist)
10. [Common Issues & Solutions](#common-issues--solutions)

---

## Project Overview

This is a **Node.js/Express** application that integrates Shopify stores with Delybell's delivery management system. The app:

- Receives orders from Shopify via webhooks
- Parses shipping addresses
- Creates orders in Delybell
- Updates Shopify orders with tracking information

**App Type:** Public Shopify App (Free, No Revenue Model)

---

## Architecture

### High-Level Flow

```
Shopify Store
    ↓ (Webhook)
Express Server (this app)
    ↓ (API Call)
Delybell API
    ↓ (Response)
Update Shopify Order
```

### Technology Stack

- **Runtime**: Node.js v14+
- **Framework**: Express.js
- **Shopify SDK**: @shopify/shopify-api v9.0.0
- **HTTP Client**: Axios
- **Session Storage**: In-memory (needs database for production)

---

## File Structure & Purpose

### Root Files

```
DelyBell/
├── server.js                    # ⭐ MAIN ENTRY POINT - Express server setup
├── config.js                    # ⭐ CONFIG LOADER - Loads env vars
├── package.json                 # ⭐ DEPENDENCIES - npm packages
├── Procfile                     # Heroku deployment config
├── .env                         # ⚠️ SECRETS - Not in git (use env.example)
├── env.example                  # Environment variable template
└── README.md                    # Project documentation
```

**Key Files:**
- `server.js` - Starts Express server, registers routes
- `config.js` - Centralized configuration loader
- `package.json` - Dependencies and scripts

### Routes Directory (`/routes`)

```
routes/
├── auth.js                      # ⭐ OAUTH FLOW - Install/callback routes
├── webhooks.js                 # ⭐ WEBHOOK HANDLERS - Order webhooks
├── api.js                      # REST API endpoints (optional)
└── test.js                     # Test endpoints (dev only)
```

**Purpose:**
- `auth.js` - Handles Shopify OAuth installation flow
- `webhooks.js` - Processes order webhooks from Shopify
- `api.js` - Additional API endpoints for manual sync
- `test.js` - Testing endpoints (remove in production)

**Required for App Store:**
- ✅ `auth.js` - Required (OAuth flow)
- ✅ `webhooks.js` - Required (webhook processing)
- ⚠️ `api.js` - Optional (nice to have)
- ❌ `test.js` - Remove or disable in production

### Services Directory (`/services`)

```
services/
├── shopifyClient.js            # ⭐ SHOPIFY API - OAuth & API calls
├── delybellClient.js           # ⭐ DELYBELL API - Order creation
├── orderProcessor.js          # ⭐ ORCHESTRATOR - Processes orders
├── orderTransformer.js        # ⭐ TRANSFORMER - Shopify → Delybell
├── addressMapper.js           # ⭐ PARSER - Extracts address components
├── addressIdMapper.js         # ⭐ LOOKUP - Converts numbers to IDs
└── sessionStorage.js          # ⭐ STORAGE - Session management
```

**Purpose:**
- `shopifyClient.js` - Shopify API client, OAuth handling
- `delybellClient.js` - Delybell API client, order creation
- `orderProcessor.js` - Main orchestrator, coordinates processing
- `orderTransformer.js` - Transforms Shopify order format to Delybell format
- `addressMapper.js` - Parses Shopify addresses to extract Block/Road/Building
- `addressIdMapper.js` - Looks up Delybell IDs from address numbers
- `sessionStorage.js` - Stores Shopify OAuth sessions

**All Required:** All service files are required for app functionality.

### Middleware Directory (`/middleware`)

```
middleware/
└── webhookVerification.js      # ⭐ SECURITY - HMAC verification
```

**Purpose:**
- Verifies webhook authenticity using HMAC signatures
- **CRITICAL:** Must be enabled for security

**Required:** ✅ Yes (security requirement)

### Test Directory (`/test`)

```
test/
├── mockShopifyOrder.js         # Mock order generator
├── testDelybellAPI.js          # Test Delybell API connection
├── testAddressParser.js         # Test address parsing
├── testOrderCreation.js        # Test order creation flow
└── verifyAddressParser.js      # Quick address parser test
```

**Purpose:**
- Testing utilities
- **Note:** Not required for App Store, but useful for development

**Required:** ❌ No (can be removed in production)

### Documentation Files

```
├── DOCUMENTATION.md            # Complete technical documentation
├── PRODUCTION_GUIDE.md         # Production deployment guide
├── CLIENT_SETUP.md             # Client installation guide
├── SHOPIFY_APP_STORE_GUIDE.md  # App Store publishing guide
└── DEVELOPER_GUIDE.md         # This file
```

**Purpose:**
- Documentation for developers and clients
- **Note:** Not required for App Store, but helpful

---

## Key Components

### 1. OAuth Flow (`routes/auth.js`)

**Purpose:** Handles Shopify app installation

**Key Routes:**
- `GET /auth/install?shop=...` - Initiates OAuth
- `GET /auth/callback` - Handles OAuth callback
- `GET /auth/success` - Success page

**How It Works:**
1. Merchant visits `/auth/install?shop=store.myshopify.com`
2. Redirects to Shopify OAuth page
3. Merchant authorizes app
4. Shopify redirects to `/auth/callback`
5. App exchanges code for access token
6. Stores session
7. Redirects to success page

**Required for App Store:** ✅ Yes

### 2. Webhook Handlers (`routes/webhooks.js`)

**Purpose:** Processes order webhooks from Shopify

**Key Routes:**
- `POST /webhooks/orders/create` - New order created
- `POST /webhooks/orders/update` - Order updated

**How It Works:**
1. Shopify sends webhook when order is created
2. Middleware verifies HMAC signature
3. Handler extracts order data
4. Processes order (parse address, create in Delybell)
5. Updates Shopify order with tracking

**Required for App Store:** ✅ Yes

### 3. Order Processing (`services/orderProcessor.js`)

**Purpose:** Orchestrates order processing flow

**Key Methods:**
- `processOrder()` - Processes single order
- `processOrdersBatch()` - Processes multiple orders

**Flow:**
1. Validate order data
2. Parse shipping address
3. Lookup Delybell IDs
4. Transform order format
5. Create order in Delybell
6. Update Shopify order

**Required for App Store:** ✅ Yes

### 4. Address Parsing (`services/addressMapper.js`)

**Purpose:** Extracts address components from Shopify addresses

**Key Methods:**
- `parseShopifyAddress()` - Parses address string
- `getBabybowPickupConfig()` - Returns hardcoded pickup address

**Supported Formats:**
- "Building 134, Road 354, Block 306"
- "Block 306, Road 354, Building 134"
- "Building: 2733, Road: 3953" (with zip as Block)

**Required for App Store:** ✅ Yes

### 5. Address ID Lookup (`services/addressIdMapper.js`)

**Purpose:** Converts human-readable numbers to Delybell IDs

**Key Methods:**
- `convertNumbersToIds()` - Main conversion method
- `findBlockId()` - Finds Block ID
- `findRoadId()` - Finds Road ID
- `findBuildingId()` - Finds Building ID

**How It Works:**
1. Takes parsed address numbers (e.g., Block 306)
2. Calls Delybell master data APIs
3. Finds matching IDs
4. Returns Delybell IDs

**Required for App Store:** ✅ Yes

---

## Configuration Files

### 1. `config.js`

**Purpose:** Centralized configuration loader

**What It Does:**
- Loads environment variables
- Provides configuration object
- Used throughout the app

**Key Exports:**
```javascript
{
  shopify: {
    apiKey, apiSecret, scopes, hostName
  },
  delybell: {
    apiUrl, accessKey, secretKey
  },
  server: {
    port
  }
}
```

### 2. `env.example`

**Purpose:** Template for environment variables

**Contains:**
- All required environment variables
- Comments explaining each variable
- Example values

**Usage:**
```bash
cp env.example .env
# Edit .env with actual values
```

### 3. `.env` (Not in Git)

**Purpose:** Actual environment variables

**Contains:**
- Real API credentials
- Production URLs
- Sensitive data

**⚠️ NEVER commit this file!**

### 4. `package.json`

**Purpose:** Node.js project configuration

**Key Sections:**
- `dependencies` - Required packages
- `scripts` - npm commands
- `name`, `version` - App metadata

**Required Scripts:**
- `start` - Production start command
- `dev` - Development start command

---

## Environment Setup

### Required Environment Variables

```env
# Shopify (from Partner Dashboard)
SHOPIFY_API_KEY=your_app_api_key
SHOPIFY_API_SECRET=your_app_api_secret
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=your-production-domain.com

# Delybell (from Delybell account)
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_access_key
DELYBELL_SECRET_KEY=your_secret_key

# Server
NODE_ENV=production
PORT=3000

# Optional
DEFAULT_SERVICE_TYPE_ID=1
DEFAULT_PICKUP_SLOT_TYPE=1
```

### Getting Shopify Credentials

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Create/Login to Partner account
3. Go to **Apps** → **Create app**
4. Copy **API Key** and **API Secret**
5. Add to `.env` file

### Getting Delybell Credentials

1. Log in to Delybell account
2. Go to **Settings** → **API Access**
3. Generate/copy **Access Key** and **Secret Key**
4. Add to `.env` file

---

## Deployment Process

### Step 1: Choose Platform

**Options:**
- Heroku (easiest)
- AWS (most control)
- DigitalOcean (balanced)
- Railway/Render (simple)

### Step 2: Deploy Code

```bash
# Clone repository
git clone <repository-url>
cd DelyBell

# Install dependencies
npm install --production

# Set environment variables (on platform)
# Copy from env.example

# Start server
npm start
```

### Step 3: Configure Domain

1. Point domain to server IP
2. Setup SSL certificate (Let's Encrypt)
3. Verify HTTPS works

### Step 4: Test Deployment

```bash
# Health check
curl https://your-domain.com/health

# Test OAuth
# Visit: https://your-domain.com/auth/install?shop=test-store.myshopify.com
```

---

## App Store Publishing Steps

### Step 1: Partner Dashboard Setup

1. Create app in Partner Dashboard
2. Get API credentials
3. Configure app URLs
4. Set webhook URLs

**See:** [SHOPIFY_APP_STORE_GUIDE.md](./SHOPIFY_APP_STORE_GUIDE.md)

### Step 2: Update Environment Variables

Update production `.env` with Partner Dashboard credentials:

```env
SHOPIFY_API_KEY=<from_partner_dashboard>
SHOPIFY_API_SECRET=<from_partner_dashboard>
SHOPIFY_HOST=your-production-domain.com
```

### Step 3: Test OAuth Flow

1. Visit: `https://your-domain.com/auth/install?shop=test-store.myshopify.com`
2. Complete OAuth flow
3. Verify session is stored
4. Check app appears in Shopify admin

### Step 4: Test Webhooks

1. Create test order in Shopify
2. Verify webhook is received
3. Check order is created in Delybell
4. Verify tracking appears in Shopify

### Step 5: Prepare App Listing

1. Write app description
2. Create screenshots
3. Prepare marketing copy
4. Set pricing to "Free"

### Step 6: Submit for Review

1. Fill in app listing details
2. Upload assets
3. Submit for review
4. Wait for approval (3-5 days)

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] OAuth flow completes successfully
- [ ] Webhooks receive orders
- [ ] Orders are created in Delybell
- [ ] Tracking updates appear in Shopify
- [ ] Error handling works
- [ ] Invalid addresses are rejected
- [ ] Health check endpoint works
- [ ] HTTPS is enabled
- [ ] Environment variables are set

### Pre-Submission Testing

- [ ] Install app in test store
- [ ] Create test order
- [ ] Verify order syncs
- [ ] Check tracking appears
- [ ] Test error scenarios
- [ ] Verify privacy policy URL
- [ ] Verify terms of service URL
- [ ] Test support email

---

## Common Issues & Solutions

### Issue 1: OAuth Not Working

**Symptoms:**
- Redirects fail
- "Invalid redirect URI" error

**Solutions:**
- Check callback URL matches exactly in Partner Dashboard
- Verify HTTPS is enabled
- Check API credentials are correct
- Ensure `SHOPIFY_HOST` doesn't include `https://`

### Issue 2: Webhooks Not Receiving

**Symptoms:**
- Orders not processing
- No webhook logs

**Solutions:**
- Verify webhook URLs in Partner Dashboard
- Check webhook middleware is enabled
- Verify server is accessible from internet
- Check HMAC verification is working

### Issue 3: Session Storage Issues

**Symptoms:**
- Sessions lost on restart
- "Session not found" errors

**Solutions:**
- Implement database storage (PostgreSQL/Redis)
- Don't use in-memory storage in production
- See PRODUCTION_GUIDE.md for database setup

### Issue 4: Address Parsing Fails

**Symptoms:**
- "Invalid destination block ID" errors
- Orders rejected

**Solutions:**
- Check address format includes Block/Road numbers
- Verify zip code is provided (used as Block fallback)
- Check Delybell master data APIs are accessible
- Review address parsing logs

---

## File Modification Guide

### For App Store Publishing

**Files to Update:**
1. `env.example` - Add Partner Dashboard credentials template
2. `package.json` - Update app name/description
3. `server.js` - Ensure all routes are registered
4. `.env` (production) - Add Partner Dashboard credentials

**Files NOT to Modify:**
- Core service files (unless fixing bugs)
- OAuth flow (`routes/auth.js`)
- Webhook handlers (`routes/webhooks.js`)

### For Production Deployment

**Required Changes:**
1. Replace in-memory session storage with database
2. Add logging (Winston)
3. Add error tracking (Sentry)
4. Enable rate limiting
5. Add monitoring

**See:** [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)

---

## Quick Reference

### Key URLs

**App URLs:**
- App URL: `https://your-domain.com`
- Callback: `https://your-domain.com/auth/callback`
- Webhook: `https://your-domain.com/webhooks/orders/create`

**Partner Dashboard:**
- Dashboard: https://partners.shopify.com
- App Settings: Partners → Apps → Your App → Configuration

### Key Commands

```bash
# Development
npm run dev

# Production
npm start

# Testing
npm run test:delybell
npm run test:order
npm run test:address
```

### Key Files to Review

1. `server.js` - Entry point
2. `routes/auth.js` - OAuth flow
3. `routes/webhooks.js` - Webhook handlers
4. `services/orderProcessor.js` - Main logic
5. `config.js` - Configuration

---

## Next Steps

1. ✅ Review this guide
2. ✅ Understand file structure
3. ✅ Set up environment variables
4. ✅ Deploy to production
5. ✅ Test thoroughly
6. ✅ Follow [SHOPIFY_APP_STORE_GUIDE.md](./SHOPIFY_APP_STORE_GUIDE.md)
7. ✅ Submit to App Store

---

## Support Resources

- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [Shopify Partner Dashboard](https://partners.shopify.com)
- [Delybell API Docs](https://documenter.getpostman.com/view/37966240/2sB34eKND9)
- [Project Documentation](./DOCUMENTATION.md)

---

**Ready to publish?** Follow [SHOPIFY_APP_STORE_GUIDE.md](./SHOPIFY_APP_STORE_GUIDE.md) for step-by-step instructions! 🚀
