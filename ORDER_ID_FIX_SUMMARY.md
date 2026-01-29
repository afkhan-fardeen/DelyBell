# Order ID and Data Mapping Fix Summary

## Issues Fixed

### 1. ✅ Store Shopify Order ID and Order Number Separately

**Problem**: The system was mixing `shopify_order_id` (long ID like `10643266011430`) with `shopify_order_number` (display number like `1022`).

**Solution**:
- Created migration `002_add_order_fields.sql` to add `shopify_order_number` column
- Updated `orderProcessor.js` to save both:
  - `shopify_order_id` → Long ID (e.g., `10643266011430`) - **USE FOR API CALLS**
  - `shopify_order_number` → Display number (e.g., `1022`) - **USE FOR DISPLAY ONLY**

### 2. ✅ Use Shopify Order ID for API Calls

**Problem**: API calls were using order number instead of order ID, causing failures.

**Solution**:
- Updated `synced-orders` endpoint to use `log.shopify_order_id` (long ID) for Shopify API calls
- Added comments clarifying that `shopify_order_id` is for API calls, `shopify_order_number` is for display

### 3. ✅ Fix Supabase Schema Usage

**Problem**: Schema didn't clearly separate order ID from order number.

**Solution**:
- `shopify_order_id` → BIGINT/STRING (API ID like `10643266011430`)
- `shopify_order_number` → INT (display number like `1022`)
- Added index on `shopify_order_number` for faster lookups
- Migration updates existing records to extract order_number from shopify_order_id where applicable

### 4. ✅ Fix Customer Name Extraction

**Problem**: Customer name wasn't reading from `shipping_address` first.

**Solution**:
- Updated `synced-orders` endpoint to read from `shipping_address.name` first
- Falls back to `customer.first_name` + `customer.last_name` if shipping address name not available
- Falls back to 'Guest' if neither available

**Note**: `orderTransformer.js` already had correct logic (`shippingAddress?.name` first), but dashboard endpoint needed update.

### 5. ✅ Fix Amount and Currency

**Problem**: `total_price` and `currency` weren't being saved to database.

**Solution**:
- Added `total_price` (DECIMAL) and `currency` (VARCHAR) columns to `order_logs` table
- Updated `logOrder()` to save `total_price` and `currency` from Shopify order
- Dashboard now uses saved values from database, falls back to Shopify API if not available

### 6. ✅ Fix Dashboard Rendering

**Problem**: Dashboard might hardcode currency or not handle missing values properly.

**Solution**:
- Updated `formatCurrency()` function to:
  - Handle null/undefined amounts gracefully
  - Always use currency from order data (never hardcode `$`)
  - Default to 'USD' only if currency is completely missing
- Dashboard displays: `{currency} {amount}` format (e.g., "BHD 5.00", "USD 10.50")

## Database Migration Required

**Run this migration in Supabase:**

```sql
-- File: supabase/migrations/002_add_order_fields.sql
-- This adds shopify_order_number, total_price, and currency columns
```

**To apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the migration file: `supabase/migrations/002_add_order_fields.sql`
3. Or use Supabase CLI: `supabase migration up`

## What Needs to be Updated in Shopify

**Nothing needs to be updated in Shopify!**

All fixes are backend-only:
- The app correctly reads order data from Shopify webhooks
- No changes needed to Shopify store settings
- No changes needed to Shopify app configuration
- Existing orders will continue to work

## Key Changes Summary

1. **Order ID Storage**: Now stores both long ID (for APIs) and display number (for UI)
2. **API Calls**: Always uses long ID (`shopifyOrder.id`) for Shopify API calls
3. **Customer Name**: Reads from `shipping_address.name` first, then customer object
4. **Amount/Currency**: Saves `total_price` and `currency` to database for reliable display
5. **Dashboard**: Properly formats currency using saved values, never hardcodes `$`

## Testing Checklist

- [ ] Run database migration
- [ ] Test new order sync (should save both ID and number)
- [ ] Test dashboard display (should show correct order numbers and currency)
- [ ] Test API calls (should use long ID, not order number)
- [ ] Verify customer names show correctly (from shipping address)
- [ ] Verify currency displays correctly (not hardcoded $)

## Files Modified

1. `supabase/migrations/002_add_order_fields.sql` - New migration
2. `services/orderProcessor.js` - Updated to save both ID and number, plus amount/currency
3. `routes/admin.js` - Updated synced-orders endpoint to use long ID for API calls
4. `views/app.ejs` - Updated formatCurrency function to handle currency properly

## Important Notes

- **Shopify order numbers are for humans** (display only)
- **Shopify order IDs are for APIs** (use for all API calls)
- The system now properly separates these two concepts
- Existing orders with incorrect IDs will be fixed by the migration where possible
- New orders will always have correct IDs
