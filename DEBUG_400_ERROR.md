# Debugging 400 Bad Request Error

## Understanding 400 Errors

A `400 Bad Request` error means the server received an invalid request. In this app, 400 errors occur when:

1. **Missing required parameters** (shop, code, etc.)
2. **Invalid shop domain format**
3. **Missing API key** (though this usually causes different errors)
4. **Malformed request data**

## Common 400 Error Scenarios

### 1. Missing Shop Parameter

**Error Location**: `routes/admin.js:417`, `routes/auth.js:19`, `routes/auth.js:281`

**Symptoms**:
- URL doesn't have `?shop=...` parameter
- Accessing `/` without shop parameter
- Accessing `/auth/check` without shop parameter

**Fix**:
- Ensure URL includes shop: `/?shop=your-shop.myshopify.com`
- Check browser console for the exact URL being called
- Verify shop is being extracted from Shopify headers (for embedded apps)

### 2. Invalid Shop Domain Format

**Error Location**: `routes/admin.js:417,422`, `routes/auth.js:33,38,291`

**Symptoms**:
- Shop domain doesn't end with `.myshopify.com`
- Shop domain has extra characters or invalid format
- Shop domain is empty or malformed

**Fix**:
- Ensure shop format: `your-shop.myshopify.com`
- Check normalization logic in `routes/admin.js` (lines 58-74)
- Verify shop extraction from headers/referer

### 3. Missing Code Parameter (OAuth Callback)

**Error Location**: `routes/auth.js:153`

**Symptoms**:
- OAuth callback URL missing `code` parameter
- Shopify redirect URL malformed

**Fix**:
- Check OAuth callback URL in Shopify Partner Dashboard
- Ensure redirect URL is: `https://delybell.onrender.com/auth/callback`
- Verify OAuth flow completes properly

### 4. API Key Placeholder Issue

**Error Location**: Browser/client-side (not server)

**Symptoms**:
- App URL shows: `https://{shop}.myshopify.com/admin/apps/<%= SHOPIFY_API_KEY %>/`
- Browser console shows 400 error when loading app
- API key not injected into HTML

**Fix**:
- Check `routes/admin.js` lines 454-473 (API key injection)
- Verify `SHOPIFY_API_KEY` environment variable is set in Render
- Check server logs for: `[Admin] ✅ API key injected: ...`

## Step-by-Step Debugging

### Step 1: Check Browser Console

Open browser DevTools (F12) → Console tab and look for:

```
Failed to load resource: the server responded with a status of 400
```

**Note the exact URL** that failed. This tells you which endpoint is returning 400.

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Reload the page
3. Find the request that returned 400
4. Click on it to see:
   - **Request URL**: What URL was called?
   - **Request Headers**: What headers were sent?
   - **Response**: What error message was returned?

### Step 3: Check Server Logs

In Render Dashboard → Logs, look for:

```
[Admin] Final normalized shop: ...
[Auth] /auth/check called for shop: ...
[Admin] ⚠️ WARNING: SHOPIFY_API_KEY not set!
```

**Common log patterns**:
- `Missing shop parameter` → Shop not in URL/headers
- `Invalid shop domain format` → Shop format is wrong
- `SHOPIFY_API_KEY not set` → Environment variable missing

### Step 4: Identify the Specific Error

Based on the URL that failed:

| URL Pattern | Error Type | Fix |
|------------|-----------|-----|
| `/?shop=...` | Shop validation | Check shop format |
| `/auth/check?shop=...` | Missing/invalid shop | Verify shop parameter |
| `/auth/callback?shop=...` | Missing code | Check OAuth flow |
| `/admin/api/status?shop=...` | Missing shop | Add shop parameter |
| `https://{shop}.myshopify.com/admin/apps/{API_KEY}/` | API key placeholder | Check API key injection |

## Quick Fixes

### Fix 1: Shop Parameter Missing

**If accessing `/` without shop**:
- Add `?shop=your-shop.myshopify.com` to URL
- Or ensure Shopify headers are being read (for embedded apps)

**Check**: `routes/admin.js` lines 22-53 (shop extraction logic)

### Fix 2: Invalid Shop Format

**If shop format is wrong**:
```javascript
// Expected format: your-shop.myshopify.com
// Common mistakes:
// - your-shop.com (missing .myshopify.com)
// - your-shop.myshopify.com/extra (has path)
// - YOUR-SHOP.MYSHOPIFY.COM (wrong case - should be lowercase)
```

**Check**: `routes/admin.js` lines 58-74 (normalization)

### Fix 3: API Key Not Injected

**If seeing placeholder in URL**:
1. Check Render environment variables:
   ```
   SHOPIFY_API_KEY=your_actual_api_key_here
   ```
2. Restart Render service after setting env vars
3. Check server logs for API key injection message

**Check**: `routes/admin.js` lines 454-473

### Fix 4: OAuth Callback Missing Code

**If `/auth/callback` returns 400**:
1. Verify redirect URL in Shopify Partner Dashboard:
   ```
   https://delybell.onrender.com/auth/callback
   ```
2. Check OAuth flow completes (user clicks "Install")
3. Verify shop parameter is included in callback URL

## Testing Checklist

### ✅ Test 1: Direct URL Access

```bash
# Should work (with valid shop):
https://delybell.onrender.com/?shop=782cba-5a.myshopify.com

# Should return 400 (missing shop):
https://delybell.onrender.com/
```

### ✅ Test 2: Auth Check Endpoint

```bash
# Should work:
curl "https://delybell.onrender.com/auth/check?shop=782cba-5a.myshopify.com"

# Should return 400:
curl "https://delybell.onrender.com/auth/check"
```

### ✅ Test 3: Shop Format Validation

```bash
# Should work:
curl "https://delybell.onrender.com/?shop=782cba-5a.myshopify.com"

# Should return 400 (invalid format):
curl "https://delybell.onrender.com/?shop=782cba-5a"
curl "https://delybell.onrender.com/?shop=782cba-5a.com"
```

### ✅ Test 4: API Key Injection

1. View page source of: `https://delybell.onrender.com/?shop=782cba-5a.myshopify.com`
2. Search for: `<%= SHOPIFY_API_KEY %>`
3. Should NOT find it (if found, API key injection failed)
4. Search for: `window.SHOPIFY_API_KEY = '`
5. Should find actual API key (not placeholder)

## Common Error Messages

| Error Message | Cause | Location |
|--------------|-------|----------|
| `Missing shop parameter` | No shop in URL/query | `routes/admin.js:417`, `routes/auth.js:19` |
| `Invalid shop domain format` | Shop doesn't match format | `routes/admin.js:417,422` |
| `Must end with .myshopify.com` | Shop missing `.myshopify.com` | `routes/auth.js:38` |
| `Missing required parameters: shop or code` | OAuth callback missing params | `routes/auth.js:153` |
| `Shop parameter is required` | API endpoint missing shop | `routes/auth.js:281` |

## Still Stuck?

1. **Check Render Logs**: Render Dashboard → Your Service → Logs
2. **Check Browser Console**: F12 → Console tab → Look for errors
3. **Check Network Tab**: F12 → Network tab → Find failed request → Check Response
4. **Verify Environment Variables**: Render Dashboard → Environment → Check `SHOPIFY_API_KEY` is set
5. **Test Locally**: Run app locally with `.env` file to isolate Render-specific issues

## Example Debug Session

```bash
# 1. Check what URL is failing
# Browser Console shows:
# Failed to load resource: https://delybell.onrender.com/auth/check?shop=782cba-5a.myshopify.com

# 2. Test endpoint directly
curl "https://delybell.onrender.com/auth/check?shop=782cba-5a.myshopify.com"

# 3. Check server logs in Render
# Look for: [Auth] /auth/check called for shop: ...

# 4. If shop is missing, check normalization
# Look for: [Admin] Final normalized shop: ...
```
