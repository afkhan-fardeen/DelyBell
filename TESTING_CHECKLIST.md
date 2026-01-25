# Testing Checklist

Follow this checklist to verify the Supabase migration is working correctly.

## Prerequisites

- [ ] Supabase project created
- [ ] Migration SQL executed (`supabase/migrations/001_create_tables.sql`)
- [ ] Environment variables set in Render:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - All other existing variables

## Phase 1: Auth Testing

### Test 1: Install App
1. [ ] Go to `https://delybell.onrender.com`
2. [ ] Enter shop domain: `your-test-store.myshopify.com`
3. [ ] Click "Install App"
4. [ ] Complete OAuth flow
5. [ ] **Verify:** Redirected back to app
6. [ ] **Verify:** App shows "Installed" status
7. [ ] **Check Supabase:** Go to Table Editor → `shops` table
8. [ ] **Verify:** Shop record exists with:
   - `shop` = your shop domain
   - `access_token` = not null
   - `scopes` = read_orders,write_orders
   - `installed_at` = timestamp

### Test 2: Restart Server
1. [ ] Restart Render service (or redeploy)
2. [ ] **Verify:** App still shows "Installed" status
3. [ ] **Verify:** No "Installation Required" message
4. [ ] **This proves:** Sessions persist across restarts ✅

### Test 3: Auth Check Endpoint
1. [ ] Call: `GET /auth/check?shop=your-test-store.myshopify.com`
2. [ ] **Verify:** Returns `authenticated: true`
3. [ ] **Verify:** `storage: 'supabase'` in response

## Phase 2: Webhook Testing

### Test 4: Order Webhook (Happy Path)
1. [ ] Create test order in Shopify
2. [ ] **Verify:** Webhook received (`POST /webhooks/orders/create`)
3. [ ] **Verify:** Order processed successfully
4. [ ] **Check Supabase:** Go to `order_logs` table
5. [ ] **Verify:** Log entry exists with:
   - `shop` = your shop domain
   - `shopify_order_id` = Shopify order ID
   - `delybell_order_id` = Delybell order ID
   - `status` = 'processed'

### Test 5: Webhook After Restart
1. [ ] Restart Render service
2. [ ] Create new test order in Shopify
3. [ ] **Verify:** Webhook still processes correctly
4. [ ] **Verify:** Order logged in Supabase
5. [ ] **This proves:** Webhooks are stateless ✅

### Test 6: Failed Order Handling
1. [ ] Create order with invalid address (or mock Delybell API failure)
2. [ ] **Verify:** Webhook responds 200 OK (doesn't block Shopify)
3. [ ] **Check Supabase:** Go to `order_logs` table
4. [ ] **Verify:** Log entry exists with:
   - `status` = 'failed'
   - `error_message` = error details

## Phase 3: Uninstall Testing

### Test 7: App Uninstall
1. [ ] Uninstall app from Shopify Admin
2. [ ] **Verify:** Uninstall webhook received
3. [ ] **Check Supabase:** Go to `shops` table
4. [ ] **Verify:** Shop record deleted
5. [ ] **Verify:** Order logs still exist (historical record)

### Test 8: Reinstall After Uninstall
1. [ ] Install app again (same shop)
2. [ ] **Verify:** New shop record created in Supabase
3. [ ] **Verify:** App works normally

## Phase 4: Edge Cases

### Test 9: Multiple Shops
1. [ ] Install app on Shop A
2. [ ] Install app on Shop B
3. [ ] **Check Supabase:** Both shops in `shops` table
4. [ ] Create order in Shop A
5. [ ] **Verify:** Order logged with correct shop
6. [ ] Create order in Shop B
7. [ ] **Verify:** Order logged with correct shop

### Test 10: Invalid Shop Domain
1. [ ] Try to install with invalid shop: `invalid-shop`
2. [ ] **Verify:** Error message shown
3. [ ] **Verify:** No record created in Supabase

### Test 11: Missing Supabase Config (Fallback)
1. [ ] Temporarily remove `SUPABASE_URL` from Render
2. [ ] **Verify:** App still works (falls back to in-memory)
3. [ ] **Verify:** Warning logged about in-memory storage
4. [ ] **Restore:** Add `SUPABASE_URL` back

## Success Criteria

All tests pass:
- ✅ Sessions persist across server restarts
- ✅ Webhooks work after restart
- ✅ Orders are logged correctly
- ✅ Failed orders are logged
- ✅ Uninstall cleans up shop data
- ✅ Multiple shops work independently

## If Tests Fail

### "Installation Required" After Install
- Check Supabase connection (credentials correct?)
- Check migration ran successfully
- Check shop domain normalization
- Check server logs for errors

### Webhooks Not Processing
- Check webhook HMAC verification
- Check shop exists in Supabase
- Check order_logs table for errors
- Check Delybell API credentials

### Orders Not Logged
- Check Supabase connection
- Check `order_logs` table exists
- Check server logs for logging errors
- Verify `SUPABASE_URL` is set

## Production Readiness

Once all tests pass:
- [ ] Remove any debug logging
- [ ] Verify environment variables set correctly
- [ ] Monitor Supabase usage (free tier limits)
- [ ] Set up Supabase backups (recommended)
- [ ] Document Supabase credentials securely
