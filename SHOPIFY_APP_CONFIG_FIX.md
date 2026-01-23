# Fix Shopify App Configuration Issues

## 🔴 Issues Found

Based on your Shopify app configuration, here are the problems:

### 1. **App URL has trailing slash** ❌
- **Current:** `https://delybell.onrender.com/`
- **Should be:** `https://delybell.onrender.com` (no trailing slash)

### 2. **Legacy install flow enabled** ❌
- **Current:** `Use legacy install flow: true`
- **Should be:** `Use legacy install flow: false` (for modern embedded apps)

### 3. **API version mismatch** ⚠️
- **Shopify shows:** `2026-01`
- **shopify.app.toml has:** `2024-01`
- **Note:** `2026-01` doesn't exist yet - Shopify might be showing a future version or it's a typo

---

## ✅ Correct Configuration

### In Shopify Partner Dashboard → App Setup:

| Field | Correct Value |
|-------|--------------|
| **App URL** | `https://delybell.onrender.com` (no trailing slash) |
| **Redirect URLs** | `https://delybell.onrender.com/auth/callback` |
| **Scopes** | `read_orders,write_orders` ✅ |
| **Use legacy install flow** | `false` (uncheck this) |
| **Embedded** | `true` ✅ |
| **Webhooks API version** | `2024-01` (or latest available) |

---

## 🔧 Step-by-Step Fix

### 1. Fix App URL (Remove Trailing Slash)

1. Go to **Shopify Partner Dashboard** → Your App → **App setup**
2. Find **"App URL"** field
3. Change from:
   ```
   https://delybell.onrender.com/
   ```
   To:
   ```
   https://delybell.onrender.com
   ```
4. **Remove the trailing slash** - this is important!

### 2. Disable Legacy Install Flow

1. In the same **App setup** page
2. Find **"Use legacy install flow"** checkbox
3. **Uncheck it** (set to `false`)
4. This enables modern OAuth flow for embedded apps

### 3. Fix Webhook API Version (if needed)

1. Go to **Webhooks** section
2. Check the API version
3. If it shows `2026-01`, change it to `2024-01` (or latest available)
4. **Note:** `2026-01` doesn't exist - Shopify might auto-correct this

### 4. Save All Changes

1. Click **"Save"** button
2. Wait a few seconds for changes to propagate
3. Clear browser cache

---

## 📋 Complete Correct Configuration

### App Setup Tab:

```
App name: DelyBell Integration
App URL: https://delybell.onrender.com
Redirect URLs: https://delybell.onrender.com/auth/callback
Scopes: read_orders,write_orders
Use legacy install flow: false (unchecked)
Embedded: true (checked)
```

### Webhooks Tab:

```
API Version: 2024-01
Webhooks:
  - orders/create → https://delybell.onrender.com/webhooks/orders/create
  - orders/updated → https://delybell.onrender.com/webhooks/orders/update
  - app/uninstalled → https://delybell.onrender.com/webhooks/app/uninstalled
```

---

## 🧪 Test After Fix

1. **Clear browser cache completely**
2. **Go to:** `https://delybell.onrender.com`
3. **Enter your shop domain:** `782cba-5a.myshopify.com`
4. **Click "Install App"**
5. **Should redirect properly** to Shopify OAuth
6. **After authorization**, should redirect back to dashboard

---

## ⚠️ Why These Matter

### Trailing Slash Issue:
- Shopify might append paths incorrectly
- Can cause routing issues
- Modern apps should not have trailing slashes

### Legacy Install Flow:
- Legacy flow is for older apps
- Modern embedded apps use new OAuth flow
- Your code uses modern Shopify API library
- Must match your code implementation

### API Version:
- Must match what your code expects
- `2024-01` is the latest stable version
- `2026-01` doesn't exist (might be a display bug)

---

## 🔍 Verify Configuration

After making changes, verify:

1. ✅ App URL: `https://delybell.onrender.com` (no trailing slash)
2. ✅ Redirect URL: `https://delybell.onrender.com/auth/callback`
3. ✅ Legacy install flow: **Disabled** (false)
4. ✅ Embedded: **Enabled** (true)
5. ✅ Scopes: `read_orders,write_orders`

---

## 📝 Summary

**Main Issues:**
1. ❌ App URL has trailing slash → Remove it
2. ❌ Legacy install flow enabled → Disable it
3. ⚠️ API version might be wrong → Use `2024-01`

**After fixing these, installation should work!** ✅
