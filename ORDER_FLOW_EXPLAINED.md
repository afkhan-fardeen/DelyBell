# Order Flow Explanation

## 🔄 Current Integration Flow

**This integration is ONE-WAY: Shopify → Delybell**

### ✅ What Happens When You Create an Order in Shopify:

1. **Order Created in Shopify**
   - Customer places order on your Shopify store
   - Shopify triggers webhook: `orders/create`

2. **Webhook Received by Your App**
   - Webhook sent to: `https://semisubterranean-racheal-ungloomy.ngrok-free.dev/webhooks/orders/create`
   - Your app receives the order data

3. **Order Processing**
   - Transforms Shopify order format → Delybell format
   - Maps addresses to Delybell block/road/building IDs
   - Calculates shipping charge (optional)

4. **Order Created in Delybell**
   - Order sent to Delybell API
   - Delybell creates the order and returns order ID

5. **Shopify Order Updated**
   - Adds tags to Shopify order:
     - `delybell-synced`
     - `delybell-order-id:XXXXX`
     - `delybell-tracking:URL`

### ❌ What Happens When You Create an Order in Delybell Directly:

**NOTHING happens in our integration!**

- Order is created in Delybell
- Order exists in Delybell system
- **But:** No webhook is sent to our app
- **But:** Shopify order is NOT updated
- **But:** No automatic sync back to Shopify

**Why?** Because:
- Delybell doesn't send webhooks to our app
- The integration only listens for Shopify webhooks
- Flow is one-way: Shopify → Delybell

## 🧪 How to Test the Integration

### Option 1: Create Order in Shopify (Recommended)

1. **Go to Shopify Admin**
   - Navigate to: `https://delybell.myshopify.com/admin/orders`

2. **Create a Test Order**
   - Click "Create order"
   - Add products
   - Add shipping address
   - Complete the order

3. **What Happens:**
   - If webhooks are registered → Order automatically syncs to Delybell
   - If webhooks NOT registered → Use manual sync (see Option 2)

### Option 2: Manual Sync via API

```bash
curl -X POST https://semisubterranean-racheal-ungloomy.ngrok-free.dev/api/sync-orders \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "delybell.myshopify.com",
    "limit": 1,
    "service_type_id": 1,
    "destination_mapping": {
      "block_id": 5,
      "road_id": 1447,
      "building_id": 1
    },
    "pickup_mapping": {
      "block_id": 5,
      "road_id": 1447,
      "building_id": 1
    }
  }'
```

### Option 3: Test with Mock Order

```bash
curl -X POST https://semisubterranean-racheal-ungloomy.ngrok-free.dev/test/process-mock-order \
  -H "Content-Type: application/json" \
  -d '{
    "service_type_id": 1,
    "destination_mapping": {
      "block_id": 5,
      "road_id": 1447,
      "building_id": 1
    },
    "pickup_mapping": {
      "block_id": 5,
      "road_id": 1447,
      "building_id": 1
    }
  }'
```

## 📋 Complete Order Flow Diagram

```
┌─────────────┐
│   Shopify   │
│   Store     │
└──────┬──────┘
       │ Customer places order
       ▼
┌─────────────────┐
│ Shopify Order   │
│ Created         │
└──────┬──────────┘
       │ Webhook: orders/create
       ▼
┌─────────────────┐
│  Your App      │
│  (ngrok URL)   │
└──────┬──────────┘
       │ Process order
       │ Transform format
       │ Map addresses
       ▼
┌─────────────────┐
│  Delybell API   │
│  Create Order   │
└──────┬──────────┘
       │ Order created
       │ Returns order ID
       ▼
┌─────────────────┐
│  Shopify Order  │
│  Updated Tags   │
│  (delybell-synced)│
└─────────────────┘
```

## 🔍 Tracking Orders Created in Delybell

If you create an order directly in Delybell, you can track it using:

```bash
curl https://semisubterranean-racheal-ungloomy.ngrok-free.dev/api/track/ORDER_ID
```

But this won't sync back to Shopify automatically.

## ⚠️ Important Notes

1. **Webhooks Required for Auto-Sync**
   - Register webhooks for automatic order sync
   - Without webhooks, you need to manually sync orders

2. **Address Mapping Required**
   - You need to map Shopify addresses to Delybell IDs
   - Currently using default values (block_id: 1, road_id: 1, building_id: 1)
   - **TODO:** Implement proper address mapping

3. **One-Way Sync**
   - Orders flow: Shopify → Delybell
   - Orders do NOT flow: Delybell → Shopify
   - If you create order in Delybell, Shopify won't know about it

## 🚀 Next Steps

1. **Register Webhooks** (for automatic sync):
   ```bash
   curl -X POST https://semisubterranean-racheal-ungloomy.ngrok-free.dev/api/webhooks/register \
     -H "Content-Type: application/json" \
     -d '{
       "shop": "delybell.myshopify.com",
       "webhookUrl": "https://semisubterranean-racheal-ungloomy.ngrok-free.dev"
     }'
   ```

2. **Create Test Order in Shopify**
   - Go to Shopify admin
   - Create a test order
   - Watch server logs for processing

3. **Check Results**
   - Check Shopify order tags (should have `delybell-synced`)
   - Check Delybell dashboard for the order
   - Check server logs for processing details

