# Fix: 400 Bad Request - API Key Placeholder Issue

## Problem

You're seeing this error:
```
GET https://782cba-5a.myshopify.com/admin/apps/%3C%=%20SHOPIFY_API_KEY%20%%3E/ 400 (Bad Request)
```

**Decoded URL**: `https://782cba-5a.myshopify.com/admin/apps/<%= SHOPIFY_API_KEY %>/`

This means the API key placeholder `<%= SHOPIFY_API_KEY %>` is **NOT being replaced** with the actual API key value.

## Root Cause

The `SHOPIFY_API_KEY` environment variable is **NOT SET** in Render Dashboard, so:
1. `config.shopify.apiKey` is `undefined`
2. The replacement code in `routes/admin.js` doesn't run
3. HTML still contains `<%= SHOPIFY_API_KEY %>` placeholder
4. Shopify App Bridge tries to use this placeholder as the API key
5. Shopify returns 400 Bad Request (invalid API key)

## Solution

### Step 1: Get Your Shopify API Key

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Select your app
3. Go to **App setup** → **Client credentials**
4. Copy the **API key** (starts with something like `abcd1234...`)

### Step 2: Set Environment Variable in Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your service (`delybell-shopify-app`)
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `SHOPIFY_API_KEY`
   - **Value**: Your API key from Shopify (e.g., `abcd1234efgh5678ijkl9012mnop3456`)
6. Click **Save Changes**

### Step 3: Restart Render Service

1. In Render Dashboard, go to **Manual Deploy** → **Clear build cache & deploy**
2. Or wait for auto-deploy (if enabled)

### Step 4: Verify Fix

1. **Check Render Logs**:
   - Look for: `[Admin] ✅ API key injected successfully: abcd1234...`
   - Should NOT see: `[Admin] ❌ CRITICAL ERROR: SHOPIFY_API_KEY environment variable is NOT SET!`

2. **View Page Source**:
   - Go to: `https://delybell.onrender.com/?shop=782cba-5a.myshopify.com`
   - Right-click → View Page Source
   - Search for: `<%= SHOPIFY_API_KEY %>`
   - **Should NOT find it** (if found, replacement failed)

3. **Check Meta Tag**:
   - In page source, search for: `<meta name="shopify-api-key"`
   - Should see: `<meta name="shopify-api-key" content="abcd1234...">` (real API key)
   - Should NOT see: `<meta name="shopify-api-key" content="<%= SHOPIFY_API_KEY %>">`

4. **Check JavaScript**:
   - In page source, search for: `window.SHOPIFY_API_KEY`
   - Should see: `window.SHOPIFY_API_KEY = 'abcd1234...';` (real API key)
   - Should NOT see: `window.SHOPIFY_API_KEY = '<%= SHOPIFY_API_KEY %>';`

5. **Test App URL**:
   - Open: `https://782cba-5a.myshopify.com/admin/apps/{YOUR_API_KEY}/`
   - Should load successfully (not 400 Bad Request)

## Quick Test

Run this in browser console (F12) after loading your app:

```javascript
const apiKey = window.SHOPIFY_API_KEY || document.querySelector('meta[name="shopify-api-key"]')?.content;
if (!apiKey || apiKey.includes('<%=') || apiKey.includes('SHOPIFY_API_KEY') || apiKey === 'SHOPIFY_API_KEY_NOT_SET') {
  console.error('❌ API key is NOT set correctly!');
  console.error('Fix: Set SHOPIFY_API_KEY in Render Dashboard → Environment Variables');
} else {
  console.log('✅ API key is set:', apiKey.substring(0, 10) + '...');
}
```

## Expected Behavior After Fix

✅ **Before Fix**:
- URL: `https://782cba-5a.myshopify.com/admin/apps/<%= SHOPIFY_API_KEY %>/`
- Result: 400 Bad Request

✅ **After Fix**:
- URL: `https://782cba-5a.myshopify.com/admin/apps/abcd1234efgh5678ijkl9012mnop3456/`
- Result: App loads successfully

## Troubleshooting

### Issue: Still seeing placeholder after setting env var

**Possible causes**:
1. Render service not restarted (restart manually)
2. Wrong environment variable name (must be exactly `SHOPIFY_API_KEY`)
3. Extra spaces/quotes in value (remove them)
4. Build cache issue (clear cache and redeploy)

**Fix**:
1. Verify env var name is exactly `SHOPIFY_API_KEY` (case-sensitive)
2. Verify value has no quotes or extra spaces
3. Restart Render service
4. Check logs for: `[Admin] ✅ API key injected successfully`

### Issue: API key is set but still getting 400

**Possible causes**:
1. API key is incorrect (wrong value)
2. API key doesn't match Shopify Partner Dashboard
3. App URL in Shopify Partner Dashboard is wrong

**Fix**:
1. Verify API key matches Shopify Partner Dashboard exactly
2. Check Shopify Partner Dashboard → App setup → App URL is: `https://delybell.onrender.com`
3. Check Redirect URL is: `https://delybell.onrender.com/auth/callback`

## Prevention

To prevent this in the future:

1. **Always set environment variables before deploying**
2. **Use `env.example` as a checklist**
3. **Check Render logs after deployment** for API key injection confirmation
4. **Test app URL** after deployment to verify it works

## Summary

**The fix is simple**: Set `SHOPIFY_API_KEY` environment variable in Render Dashboard.

**Why it happened**: The environment variable wasn't set, so the placeholder wasn't replaced.

**How to verify**: Check Render logs and page source to confirm API key is injected.
