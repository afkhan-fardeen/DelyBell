# Debug Order Sync Issues

## Problem
Orders are not syncing to Delybell and nothing appears in `order_logs` table in Supabase.

## Diagnostic Steps

### 1. Check Webhook Registration

Visit: `https://delybell.onrender.com/admin/api/webhooks/status?shop=782cba-5a.myshopify.com`

This will show:
- Whether webhooks are registered
- Webhook URLs
- Authentication status

### 2. Check Order Logs

Visit: `https://delybell.onrender.com/admin/api/order-logs?shop=782cba-5a.myshopify.com&limit=50`

This will show:
- All order processing attempts
- Success/failure status
- Error messages

### 3. Manually Test Order Processing

Visit: `https://delybell.onrender.com/admin/api/test-order?shop=782cba-5a.myshopify.com&orderId=ORDER_ID`

Replace `ORDER_ID` with an actual order ID (e.g., `1006`).

This will:
- Fetch the order from Shopify
- Process it manually
- Show detailed error messages
- Log to database

### 4. Check Server Logs

Look for these log messages:

**Webhook Received:**
```
[Webhook] 🎯 Handler called: /orders/create
[Webhook] Headers: { ... }
```

**Order Processing Started:**
```
[Webhook] 🚀 Starting order processing for order 1006
[OrderProcessor] Processing Shopify order: 1006
```

**Order Logged:**
```
[OrderProcessor] ✅ Order 1006 logged to database
```

**If Failed:**
```
[OrderProcessor] ❌ Error processing order: ...
[OrderProcessor] ✅ Failed order 1006 logged to database
```

## Common Issues

### Issue 1: Webhooks Not Registered

**Symptom:** No webhook logs appear when orders are placed.

**Solution:**
1. Check webhook registration: `/admin/api/webhooks/status`
2. If not registered, re-register during OAuth or manually via API

### Issue 2: Webhook Verification Failing

**Symptom:** Webhooks are rejected with 401 error.

**Solution:**
1. Check `SHOPIFY_API_SECRET` is set in Render
2. Verify webhook middleware is working

### Issue 3: Store Address Not Parsed

**Symptom:** Error: "Could not parse store address"

**Solution:**
1. Update Shopify store address to include Block and Road
2. Format: "Building X, Road Y, Block Z" or "Road Y, Block Z"

### Issue 4: Database Logging Failing

**Symptom:** Orders process but don't appear in `order_logs`.

**Solution:**
1. Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
2. Verify `order_logs` table exists with `error_message` column
3. Run migration: `supabase/migrations/001_create_tables.sql`

### Issue 5: Order Processing Failing Silently

**Symptom:** No logs, no errors, nothing in database.

**Solution:**
1. Check server logs for exceptions
2. Use manual test endpoint to see detailed errors
3. Verify Delybell API credentials are correct

## Next Steps

1. **Check webhook status** - Verify webhooks are registered
2. **Place a test order** - Watch server logs
3. **Use manual test endpoint** - Process order manually to see errors
4. **Check order logs** - See what's in the database

## Quick Test

Run this to manually process order 1006:
```
https://delybell.onrender.com/admin/api/test-order?shop=782cba-5a.myshopify.com&orderId=1006
```

This will show you exactly what's failing.
