# What Happens After Placing Order in Shopify

## ✅ You DON'T Need to "Complete" the Order

Once an order is **created** in Shopify, it should automatically sync to Delybell (if webhooks are registered).

## 🔍 Check What Happened

### Step 1: Check Your Server Logs

Look at your server terminal where `npm start` is running. You should see:

**If webhook was received:**
```
Received webhook for new order: #1001
Processing Shopify order: #1001
Calculated shipping charge: X
Order created successfully in Delybell: XXXXX
Updated Shopify order tags
```

**If webhook was NOT received:**
- No logs about the order
- Order stays in Shopify only

### Step 2: Check Shopify Order Tags

Go to your Shopify order and check the **Tags** section:

**If synced successfully:**
- Should have tag: `delybell-synced`
- Should have tag: `delybell-order-id:XXXXX`
- Should have tag: `delybell-tracking:URL`

**If NOT synced:**
- No tags added
- Order not synced to Delybell

### Step 3: Check Delybell Dashboard

Log into Delybell and check if the order appears there.

## 🚨 If Order Was NOT Synced

### Option A: Register Webhooks (for future orders)

```bash
curl -X POST https://semisubterranean-racheal-ungloomy.ngrok-free.dev/api/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "delybell.myshopify.com",
    "webhookUrl": "https://semisubterranean-racheal-ungloomy.ngrok-free.dev"
  }'
```

### Option B: Manually Sync This Order

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

This will sync the **most recent order** from Shopify to Delybell.

## 📋 Complete Checklist

After placing order in Shopify:

- [ ] Check server logs for webhook receipt
- [ ] Check if order processing logs appear
- [ ] Check Shopify order tags (should have `delybell-synced`)
- [ ] Check Delybell dashboard for the order
- [ ] If not synced, register webhooks or manually sync

## 🎯 What You Should See

### In Server Logs:
```
Received webhook for new order: #1001
Processing Shopify order: #1001
✅ Order created successfully in Delybell: XXXXX
```

### In Shopify Order:
- Tags: `delybell-synced`, `delybell-order-id:XXXXX`

### In Delybell:
- Order appears in dashboard
- Order has tracking information

## ⚠️ Important Notes

1. **Order Status Doesn't Matter**
   - Order syncs when **created**, not when "completed"
   - You don't need to mark it as "fulfilled" or "completed"

2. **Address Mapping**
   - Currently using default block/road/building IDs (1, 1, 1)
   - You should update these to match actual addresses
   - Check the order in Delybell to verify address mapping

3. **Webhooks Required**
   - Without webhooks, orders won't auto-sync
   - You'll need to manually sync each order

## 🚀 Next Steps

1. **Check server logs** - See if webhook was received
2. **Check Shopify order tags** - Verify if synced
3. **Check Delybell dashboard** - Confirm order exists
4. **If not synced** - Register webhooks or manually sync

