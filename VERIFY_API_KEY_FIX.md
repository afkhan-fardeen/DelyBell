# Verify API Key Injection Fix

## Problem
The HTML template contains placeholders `<%= SHOPIFY_API_KEY %>` that must be replaced with the actual API key value before serving to the browser.

## How It Works
The `routes/admin.js` file replaces these placeholders when serving the HTML:
- **Line 458-459**: Replaces `<meta name="shopify-api-key" content="<%= SHOPIFY_API_KEY %>">` with actual API key
- **Line 464-465**: Replaces `window.SHOPIFY_API_KEY = '<%= SHOPIFY_API_KEY %>';` with actual API key

## Verification Checklist

### ✅ Step 1: View Page Source

1. **Deploy your app** to Render (or run locally)
2. **Open your app URL**: `https://delybell.onrender.com/?shop=your-shop.myshopify.com`
3. **Right-click** → **View Page Source** (or press `Ctrl+U` / `Cmd+U`)

### ✅ Step 2: Search for Placeholder (MUST NOT EXIST)

In the page source, search for:
```
<%= SHOPIFY_API_KEY %>
```

**Expected Result**: ❌ **NOT FOUND** (0 results)

If you find this placeholder, the replacement is NOT working!

### ✅ Step 3: Verify Meta Tag Has Real API Key

In the page source, search for:
```html
<meta name="shopify-api-key"
```

**Expected Result**: ✅ Should see something like:
```html
<meta name="shopify-api-key" content="abcd1234efgh5678ijkl9012mnop3456">
```

**NOT**:
```html
<meta name="shopify-api-key" content="<%= SHOPIFY_API_KEY %>">
```

### ✅ Step 4: Verify JavaScript Variable Has Real API Key

In the page source, search for:
```javascript
window.SHOPIFY_API_KEY
```

**Expected Result**: ✅ Should see something like:
```javascript
window.SHOPIFY_API_KEY = 'abcd1234efgh5678ijkl9012mnop3456';
```

**NOT**:
```javascript
window.SHOPIFY_API_KEY = '<%= SHOPIFY_API_KEY %>';
```

### ✅ Step 5: Test App URL Directly

Open this URL in your browser (replace `{API_KEY}` with your actual API key):
```
https://{shop}.myshopify.com/admin/apps/{API_KEY}/
```

**Example**:
```
https://782cba-5a.myshopify.com/admin/apps/abcd1234efgh5678ijkl9012mnop3456/
```

**Expected Result**: ✅ **App loads successfully** (not 400 Bad Request)

**If you get 400 Bad Request**: The API key is still a placeholder or incorrect.

## Troubleshooting

### Issue: Placeholder Still Exists in HTML

**Possible Causes**:
1. `SHOPIFY_API_KEY` environment variable not set in Render
2. `config.shopify.apiKey` is `undefined` or `null`
3. Replacement regex not matching

**Fix**:
1. Check Render Dashboard → Environment Variables → `SHOPIFY_API_KEY` is set
2. Check server logs for: `[Admin] Injected shop...` (confirms route is working)
3. Verify `config.js` reads from `process.env.SHOPIFY_API_KEY`

### Issue: API Key is Empty String

**Check**:
- Render environment variable is set correctly
- No extra spaces or quotes in environment variable value
- Restart Render service after setting environment variables

### Issue: App URL Returns 400 Bad Request

**Check**:
1. API key in Shopify Partner Dashboard matches environment variable
2. App URL in Shopify Partner Dashboard is: `https://delybell.onrender.com` (not a placeholder)
3. Redirect URL is: `https://delybell.onrender.com/auth/callback`

## Quick Test Script

Run this in browser console (F12) after loading your app:

```javascript
// Check if API key is injected
const apiKey = window.SHOPIFY_API_KEY || document.querySelector('meta[name="shopify-api-key"]')?.content;

if (!apiKey) {
  console.error('❌ API key not found!');
} else if (apiKey.includes('<%=') || apiKey.includes('SHOPIFY_API_KEY')) {
  console.error('❌ API key is still a placeholder!', apiKey);
} else if (apiKey.length < 20) {
  console.error('❌ API key seems too short:', apiKey);
} else {
  console.log('✅ API key is properly injected:', apiKey.substring(0, 10) + '...');
}
```

## Expected Console Output

When app loads correctly, you should see:
```
[Delybell] API Key: Found
[Delybell] Initial shop: your-shop.myshopify.com
[Admin] Injected shop into HTML: your-shop.myshopify.com
```

If you see:
```
[Delybell] API Key: Not found
```

Then the API key injection failed.

## Summary

✅ **PASS** if:
- No `<%= SHOPIFY_API_KEY %>` in page source
- Meta tag has real API key (32+ characters)
- JavaScript variable has real API key
- App URL opens successfully

❌ **FAIL** if:
- Placeholder exists in page source
- API key is empty or placeholder
- App URL returns 400 Bad Request
