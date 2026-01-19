# Shopify-Delybell Integration - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation & Setup](#installation--setup)
5. [Configuration](#configuration)
6. [How It Works](#how-it-works)
7. [API Endpoints](#api-endpoints)
8. [Webhook Setup](#webhook-setup)
9. [Address Mapping](#address-mapping)
10. [Order Processing Flow](#order-processing-flow)
11. [Multi-Store Support](#multi-store-support)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The Shopify-Delybell Integration is a Node.js application that automatically syncs orders from Shopify stores to Delybell's delivery management system. When a customer places an order on Shopify, the app:

1. Receives the order via webhook
2. Parses the shipping address
3. Maps the address to Delybell's structured format
4. Creates the order in Delybell
5. Updates Shopify order tags with tracking information

### Key Capabilities

- ✅ **Automatic Order Sync**: Real-time order processing via webhooks
- ✅ **Address Parsing**: Converts flexible Shopify addresses to Delybell's structured format
- ✅ **Multi-Store Support**: Handles multiple Shopify stores from a single instance
- ✅ **Address Validation**: Ensures addresses can be mapped before order creation
- ✅ **Master Data Integration**: Uses Delybell APIs to lookup address IDs
- ✅ **Error Handling**: Comprehensive error messages and logging

---

## Architecture

### System Components

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Shopify   │────────▶│  Integration │────────▶│  Delybell   │
│   Store(s)  │ Webhook │     App      │  API    │     API     │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │
                        ┌─────▼─────┐
                        │  Session  │
                        │  Storage  │
                        └───────────┘
```

### Application Structure

```
DelyBell/
├── server.js                 # Express server & routing
├── config.js                 # Configuration loader
├── routes/
│   ├── api.js               # REST API endpoints
│   ├── auth.js              # Shopify OAuth flow
│   ├── webhooks.js          # Webhook handlers
│   └── test.js              # Test endpoints
├── services/
│   ├── shopifyClient.js     # Shopify API client
│   ├── delybellClient.js    # Delybell API client
│   ├── orderProcessor.js    # Order processing orchestrator
│   ├── orderTransformer.js  # Shopify → Delybell transformation
│   ├── addressMapper.js     # Address parsing
│   ├── addressIdMapper.js   # Address ID lookup
│   └── sessionStorage.js    # Session management
└── middleware/
    └── webhookVerification.js # Webhook HMAC verification
```

---

## Features

### 1. Automatic Order Processing

Orders are automatically processed when:
- A new order is created in Shopify (via webhook)
- An order is updated in Shopify (via webhook)
- Manual sync via API endpoint

### 2. Address Mapping

**Pickup Address:**
- Hardcoded to company's registered Delybell address
- Same pickup location for all stores
- Address: "Building 417, Road 114, Block 1, Ras Ruman"
- IDs: Block ID: 1, Road ID: 114, Building ID: 417

**Destination Address:**
- Parsed from Shopify shipping address
- Supports multiple address formats:
  - "Building 134, Road 354, Block 306"
  - "Block 306, Road 354, Building 134"
  - "Building: 2733, Road: 3953" (with zip as Block)
- Uses zip code as Block number fallback (common in Bahrain)
- Validates address components before order creation

### 3. Address ID Lookup

The app converts human-readable address numbers to Delybell's internal IDs:
- Block Number (e.g., 306) → Block ID (e.g., 1)
- Road Number (e.g., 114) → Road ID (e.g., 114)
- Building Number (e.g., 417) → Building ID (e.g., 417)

Uses Delybell's master data APIs:
- `/blocks` - Find block by number and area name
- `/roads` - Find road by number within a block
- `/buildings` - Find building by number within a road

### 4. Pickup Scheduling

Implements cutoff-based dispatch:
- **Before 12:00 PM (Bahrain time)**: Same-day pickup
- **After 12:00 PM (Bahrain time)**: Next-day pickup
- Default pickup slot: Morning (configurable)

### 5. Multi-Store Support

- Each Shopify store is identified by its domain (e.g., `store.myshopify.com`)
- Sessions are stored per shop domain
- Same pickup address applies to all stores
- Destination addresses parsed per order

---

## Installation & Setup

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- Delybell API credentials (Access Key & Secret Key)
- Shopify Partner account (for app development)
- Shopify store (for testing)

### Step 1: Clone/Download Project

```bash
cd DelyBell
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

```bash
cp env.example .env
```

Edit `.env` with your credentials:

```env
# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=your-domain.com

# Delybell API Configuration (REQUIRED)
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_delybell_access_key
DELYBELL_SECRET_KEY=your_delybell_secret_key

# Server Configuration
PORT=3000

# Default Service Type
DEFAULT_SERVICE_TYPE_ID=1
DEFAULT_PICKUP_SLOT_TYPE=1
```

### Step 4: Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:3000` (or configured PORT).

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DELYBELL_API_URL` | Yes | Delybell API base URL |
| `DELYBELL_ACCESS_KEY` | Yes | Delybell API access key |
| `DELYBELL_SECRET_KEY` | Yes | Delybell API secret key |
| `SHOPIFY_API_KEY` | Yes | Shopify app API key |
| `SHOPIFY_API_SECRET` | Yes | Shopify app API secret |
| `SHOPIFY_SCOPES` | Yes | Comma-separated Shopify scopes |
| `SHOPIFY_HOST` | Yes | Your app's hostname (no https://) |
| `PORT` | No | Server port (default: 3000) |
| `DEFAULT_SERVICE_TYPE_ID` | No | Default service type (default: 1) |
| `DEFAULT_PICKUP_SLOT_TYPE` | No | Default pickup slot (1=Morning, 2=Afternoon, 3=Evening) |

### Pickup Address Configuration

The pickup address is **hardcoded** in `services/addressMapper.js`. To change it:

1. Open `services/addressMapper.js`
2. Find `getBabybowPickupConfig()` method
3. Update the address and IDs:

```javascript
getBabybowPickupConfig() {
  return {
    address: "Building 417, Road 114, Block 1, Ras Ruman",
    block_number: 306,      // Human-readable
    road_number: 114,
    building_number: 417,
    block_id: 1,             // Delybell ID
    road_id: 114,
    building_id: 417,
    customer_name: "Babybow",
    mobile_number: "+97300000000"
  };
}
```

---

## How It Works

### 1. Order Reception

**Via Webhook:**
```
Shopify Order Created
    ↓
POST /webhooks/orders/create
    ↓
Webhook Verification (HMAC)
    ↓
Order Processing
```

**Via API:**
```
POST /api/sync-orders
    ↓
Fetch Orders from Shopify
    ↓
Process Each Order
```

### 2. Address Parsing

```
Shopify Shipping Address
    ↓
addressMapper.parseShopifyAddress()
    ↓
Extract: block_number, road_number, building_number, flat_number
    ↓
addressIdMapper.convertNumbersToIds()
    ↓
Lookup Delybell IDs via Master Data APIs
    ↓
Validate IDs exist
```

### 3. Order Transformation

```
Shopify Order
    ↓
orderTransformer.transformShopifyToDelybell()
    ↓
Delybell Order Payload
    ↓
delybellClient.createOrder()
    ↓
Delybell Order Created
```

### 4. Shopify Update

```
Delybell Order Created
    ↓
Extract Tracking Info
    ↓
Update Shopify Order Tags
    ↓
Order Tagged with Delybell Order ID
```

---

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-18T10:30:00.000Z"
}
```

### Get Service Types

```http
GET /api/service-types?search=Express
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Standard Delivery",
      "code": "STD"
    }
  ]
}
```

### Get Blocks

```http
GET /api/blocks?search=306
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Ras Ruman",
      "code": "306"
    }
  ]
}
```

### Get Roads

```http
GET /api/roads?block_id=1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 114,
      "name": "Road 114",
      "block_id": 1
    }
  ]
}
```

### Get Buildings

```http
GET /api/buildings?road_id=114&block_id=1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 417,
      "name": "Building 417",
      "road_id": 114,
      "block_id": 1
    }
  ]
}
```

### Sync Orders

```http
POST /api/sync-orders
Content-Type: application/json

{
  "shop": "your-shop.myshopify.com",
  "limit": 50,
  "status": "any",
  "service_type_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 10 orders",
  "summary": {
    "total": 10,
    "successful": 8,
    "failed": 2
  },
  "results": [...]
}
```

### Process Single Order

```http
POST /api/process-order/:orderId
Content-Type: application/json

{
  "shop": "your-shop.myshopify.com",
  "service_type_id": 1
}
```

### Track Order

```http
GET /api/track/:orderId
```

---

## Webhook Setup

### 1. Install App in Shopify Store

Visit:
```
https://YOUR-DOMAIN/auth/install?shop=your-shop.myshopify.com
```

This initiates OAuth flow and installs the app.

### 2. Register Webhooks (Automatic)

Webhooks are automatically registered when the app is installed. Manual registration:

```http
POST /api/webhooks/register
Content-Type: application/json

{
  "shop": "your-shop.myshopify.com",
  "webhookUrl": "https://your-domain.com"
}
```

### 3. Webhook Endpoints

**Order Created:**
```
POST /webhooks/orders/create
```

**Order Updated:**
```
POST /webhooks/orders/update
```

### 4. Webhook Verification

The app verifies webhook authenticity using HMAC signatures. Ensure:
- `SHOPIFY_API_SECRET` is set correctly
- Webhook URL is accessible (use HTTPS in production)
- Middleware `webhookVerification.js` is enabled

---

## Address Mapping

### Supported Address Formats

The app can parse addresses in various formats:

**Format 1: Standard**
```
Building 134, Road 354, Block 306
```

**Format 2: Reversed**
```
Block 306, Road 354, Building 134
```

**Format 3: Abbreviated**
```
Bldg 134, Rd 354, Blk 306
```

**Format 4: With Colons**
```
Building: 2733, Road: 3953
```

**Format 5: Split Fields**
```
Address1: "Building 134"
Address2: "Road 354"
City: "Block 306"
```

**Format 6: Zip as Block**
```
Road 3953, Building 2733
Zip: 306
→ Uses zip "306" as Block number
```

### Address Validation

Orders are **rejected** if:
- Block number cannot be extracted or found
- Road number cannot be extracted
- Block ID lookup fails
- Road ID lookup fails

Error messages are detailed and actionable.

---

## Order Processing Flow

### Complete Flow Diagram

```
1. Order Received (Webhook/API)
   ↓
2. Extract Shop Domain
   ↓
3. Load Shopify Session
   ↓
4. Parse Shipping Address
   ├─ Extract block_number, road_number, building_number
   └─ Use zip as Block fallback if needed
   ↓
5. Lookup Delybell IDs
   ├─ Find Block ID by number + area name
   ├─ Find Road ID by number + block_id
   └─ Find Building ID by number + road_id + block_id
   ↓
6. Validate Address IDs
   ├─ Check Block ID exists
   ├─ Check Road ID exists
   └─ Check Building ID exists (if provided)
   ↓
7. Transform Order
   ├─ Map Shopify fields → Delybell fields
   ├─ Set pickup address (hardcoded)
   ├─ Set destination address (parsed)
   ├─ Calculate pickup date (cutoff-based)
   └─ Format package details
   ↓
8. Create Order in Delybell
   ├─ POST /orders
   └─ Receive Delybell Order ID
   ↓
9. Update Shopify Order
   ├─ Add tag: "delybell:ORDER_ID"
   └─ Add note with tracking info
   ↓
10. Return Success Response
```

### Error Handling

If any step fails:
1. Error is logged with details
2. Order processing stops
3. Error response returned to caller
4. Shopify order is NOT updated (if webhook)

---

## Multi-Store Support

### How It Works

The app supports multiple Shopify stores from a single instance:

1. **Store Identification**: Each store is identified by its domain (`store.myshopify.com`)
2. **Session Storage**: Sessions are stored per shop domain
3. **Webhook Routing**: Webhooks include shop domain in headers
4. **Shared Configuration**: Same pickup address, same Delybell credentials

### Adding a New Store

1. Install app in new Shopify store:
   ```
   https://YOUR-DOMAIN/auth/install?shop=new-store.myshopify.com
   ```

2. Webhooks are automatically registered

3. Orders from new store are automatically processed

### Store-Specific Configuration

Currently, all stores share:
- Same pickup address
- Same Delybell API credentials
- Same service type

For store-specific pickup addresses, see [Production Guide](./PRODUCTION_GUIDE.md#multi-store-pickup-addresses).

---

## Testing

### Test Delybell API Connection

```bash
npm run test:delybell
```

### Test Address Parser

```bash
npm run test:address
```

### Test Order Creation

```bash
npm run test:order
```

### Test Mock Order Processing

```bash
curl -X POST http://localhost:3000/test/process-mock-order \
  -H "Content-Type: application/json" \
  -d '{
    "order": {
      "id": "test-123",
      "order_number": 9999,
      "customer": {
        "first_name": "Test",
        "last_name": "Customer",
        "phone": "+97339891181"
      },
      "shipping_address": {
        "name": "Test Customer",
        "address1": "Building: 2733, Road: 3953",
        "city": "Manama",
        "zip": "306",
        "phone": "+97339891181"
      },
      "line_items": [
        {
          "title": "Test Product",
          "quantity": 1,
          "weight": 1
        }
      ]
    },
    "pickup_mapping": {
      "address": "Building 417, Road 114, Block 1, Ras Ruman"
    }
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. "Shop not authenticated"

**Cause:** App not installed in Shopify store

**Solution:**
```
Visit: https://YOUR-DOMAIN/auth/install?shop=your-shop.myshopify.com
```

#### 2. "Invalid destination block ID"

**Cause:** Address cannot be parsed or Block ID not found

**Solution:**
- Check shipping address format
- Verify Block number exists in Delybell
- Check zip code is provided (used as Block fallback)

#### 3. "Webhook verification failed"

**Cause:** HMAC signature mismatch

**Solution:**
- Verify `SHOPIFY_API_SECRET` is correct
- Ensure webhook URL uses HTTPS (production)
- Check webhook payload is not modified

#### 4. "Order stays in Open state"

**Cause:** Pickup date/slot not provided

**Solution:**
- Verify `pickup_date` and `pickup_slot` are in payload
- Check cutoff logic is working (12 PM Bahrain time)

#### 5. "Session not found"

**Cause:** Session storage issue

**Solution:**
- Reinstall app in Shopify store
- Check session storage implementation (in-memory vs database)
- Verify shop domain format

### Debug Endpoints

**Check Authentication:**
```http
GET /auth/check?shop=your-shop.myshopify.com
```

**List All Sessions:**
```http
GET /auth/debug/sessions
```

### Logs

Check server logs for detailed error messages:
- Address parsing details
- ID lookup results
- API request/response
- Error stack traces

---

## Support

For issues or questions:
1. Check logs for error details
2. Review [Production Guide](./PRODUCTION_GUIDE.md) for deployment
3. Verify environment variables are set correctly
4. Test with mock orders first

---

## Next Steps

- [Production Deployment Guide](./PRODUCTION_GUIDE.md)
- [API Reference](./README.md#api-endpoints)
- [Delybell API Documentation](https://documenter.getpostman.com/view/37966240/2sB34eKND9)
