# Fix: 400 Bad Request Error on Installation

## 🔴 Problem

When clicking "Install" in Shopify, you're getting:
- **Error:** 400 Bad Request
- **URL shows:** `%3C%=%20SHOPIFY_API_KEY%20%%3E` (which is `<%= SHOPIFY_API_KEY %>` URL-encoded)

This means the **App URL** in Shopify Partner Dashboard is incorrectly set.

---

## ✅ Solution

### Fix the App URL in Shopify Partner Dashboard

1. **Go to Shopify Partner Dashboard:**
   - Visit: https://partners.shopify.com
   - Login to your account
   - Go to **Apps** → Select your app: **"Delybell Order Sync"**

2. **Go to App Setup:**
   - Click on **"App setup"** in the left sidebar
   - Scroll to **"App URL"** section

3. **Set the Correct App URL:**
   
   **Current (WRONG):**
   ```
   <%= SHOPIFY_API_KEY %>
   ```
   
   **Should be (CORRECT):**
   ```
   https://delybell.onrender.com
   ```
   
   **⚠️ Important:** 
   - Use **just the URL** - no template placeholders
   - Include `https://`
   - No trailing slash
   - This is your Render deployment URL

4. **Set the Callback URL:**
   
   **Allowed redirection URL(s):**
   ```
   https://delybell.onrender.com/auth/callback
   ```
   
   **⚠️ Important:**
   - Must match exactly
   - Include `https://`
   - Include `/auth/callback` path
   - No trailing slash

5. **Save Changes:**
   - Click **"Save"** button
   - Wait for changes to propagate (may take a few seconds)

---

## 📋 Complete App Setup Configuration

### In Shopify Partner Dashboard → App Setup:

| Field | Value |
|-------|-------|
| **App URL** | `https://delybell.onrender.com` |
| **Allowed redirection URL(s)** | `https://delybell.onrender.com/auth/callback` |
| **Webhook URL (orders/create)** | `https://delybell.onrender.com/webhooks/orders/create` |
| **Webhook URL (orders/updated)** | `https://delybell.onrender.com/webhooks/orders/update` |
| **Webhook URL (app/uninstalled)** | `https://delybell.onrender.com/webhooks/app/uninstalled` |

---

## 🔍 Verify Configuration

### Check `shopify.app.toml`:

Make sure it has:
```toml
application_url = "https://delybell.onrender.com"
```

**✅ This is already correct** - no changes needed here.

---

## 🧪 Test After Fix

1. **Clear browser cache** (important!)
2. **Go to your Shopify store admin**
3. **Try installing the app again:**
   - Visit: `https://delybell.onrender.com`
   - Enter your shop domain
   - Click "Install App"
   - Should redirect properly now

---

## 🐛 If Still Not Working

### Check Render Environment Variables:

Make sure in Render Dashboard → Environment:
```
SHOPIFY_HOST=delybell.onrender.com
```

**⚠️ Important:** 
- No `https://` prefix
- No trailing slash
- Just the domain: `delybell.onrender.com`

### Check Render Logs:

1. Go to Render Dashboard
2. Click on your service
3. Go to **"Logs"** tab
4. Look for errors when trying to install
5. Check for any OAuth-related errors

---

## 📝 Summary

**The Problem:**
- App URL in Shopify Partner Dashboard has template placeholder: `<%= SHOPIFY_API_KEY %>`
- This should be your actual Render URL: `https://delybell.onrender.com`

**The Fix:**
1. Go to Shopify Partner Dashboard → Your App → App Setup
2. Change **App URL** to: `https://delybell.onrender.com`
3. Set **Callback URL** to: `https://delybell.onrender.com/auth/callback`
4. Save changes
5. Try installing again

**After fixing, the installation should work!** ✅
