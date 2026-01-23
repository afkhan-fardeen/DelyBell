# Fix Shopify Partner Dashboard App URL

## Problem
You're seeing this error when trying to install:
```
https://782cba-5a.myshopify.com/admin/apps/%3C%=%20SHOPIFY_API_KEY%20%%3E/
400 Bad Request
```

This means your **App URL** in Shopify Partner Dashboard has a template placeholder (`<%= SHOPIFY_API_KEY %>`) instead of your actual app URL.

## Solution

### Step 1: Go to Shopify Partner Dashboard
1. Visit: https://partners.shopify.com
2. Login to your account
3. Go to **Apps** → Select your app: **DelyBell Integration**

### Step 2: Fix the App URL
1. Go to **App Setup** tab (or **Configuration**)
2. Find the **App URL** field
3. **Current (WRONG):** 
   ```
   https://delybell.onrender.com/apps/<%= SHOPIFY_API_KEY %>
   ```
   or similar with template placeholders

4. **Change to (CORRECT):**
   ```
   https://delybell.onrender.com
   ```
   **Important:** 
   - No trailing slash
   - No `/apps/` path
   - No template placeholders
   - Just your base URL: `https://delybell.onrender.com`

### Step 3: Verify Other Settings

**Allowed redirection URL(s):**
```
https://delybell.onrender.com/auth/callback
```

**App distribution:**
- Set to **"Public"** (not "App Store" or "Unlisted")
- This allows direct installation via URL

**Embedded:**
- ✅ **Checked** (enabled)

**Use legacy install flow:**
- ❌ **Unchecked** (disabled)

### Step 4: Save Changes
1. Click **Save** or **Update**
2. Wait a few seconds for changes to propagate

### Step 5: Test Installation
1. Go to: `https://delybell.onrender.com`
2. Enter your shop domain: `782cba-5a.myshopify.com`
3. Click **Install App**
4. You should be redirected to Shopify OAuth (not the error page)

## Why This Happens

Shopify Partner Dashboard sometimes shows template placeholders in the App URL field, especially if:
- The app was created from a template
- The URL was copied incorrectly
- There was a configuration error

The App URL should **always** be your base deployment URL without any paths or placeholders.

## Verification

After fixing, when you click "Install App", you should be redirected to:
```
https://782cba-5a.myshopify.com/admin/oauth/authorize?client_id=YOUR_API_KEY&...
```

NOT to:
```
https://782cba-5a.myshopify.com/admin/apps/%3C%=%20SHOPIFY_API_KEY%20%%3E/
```

## Still Having Issues?

1. **Clear browser cache** - Old redirects might be cached
2. **Check server logs** - Look for OAuth errors
3. **Verify API Key** - Make sure your API key matches in both places
4. **Check Render deployment** - Make sure app is running: `https://delybell.onrender.com/health`
