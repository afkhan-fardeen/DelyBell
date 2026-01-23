# Simple Setup Guide

## For Store Owners (Super Easy!)

### Option 1: One-Click Install (Recommended)

1. Go to: `https://delybell.onrender.com`
2. Enter your shop domain: `your-store.myshopify.com`
3. Click **"Install App"**
4. Click **"Install"** on Shopify authorization page
5. Done! Orders sync automatically.

**That's it!** No technical knowledge needed.

---

## For App Owner (One-Time Setup)

You need to create a Shopify Partners account and app (one-time setup):

### Step 1: Create Shopify Partners Account
1. Go to: https://partners.shopify.com
2. Sign up (it's FREE for developers)
3. Verify your email

### Step 2: Create App
1. In Partners Dashboard, click **"Apps"**
2. Click **"Create app"**
3. Choose **"Custom app"** or **"Public app"**
4. Fill in app details:
   - Name: Delybell Order Sync
   - App URL: `https://delybell.onrender.com`
   - Allowed redirection URL: `https://delybell.onrender.com/auth/callback`

### Step 3: Get API Credentials
1. Go to **"App setup"** tab
2. Copy **API Key** and **API Secret**
3. Add to Render environment variables:
   - `SHOPIFY_API_KEY=your_api_key`
   - `SHOPIFY_API_SECRET=your_api_secret`
   - `SHOPIFY_HOST=delybell.onrender.com`

### Step 4: Configure Scopes
1. Go to **"Configuration"** → **"Scopes"**
2. Add scopes:
   - `read_orders`
   - `write_orders`

### Step 5: Set Distribution
1. Go to **"Distribution"**
2. Set to **"Public"** (allows direct installation)
3. Save

---

## Important Notes

- **Shopify Partners is FREE** for developers (no fees for basic apps)
- **Fees only apply** if you want to list on App Store or use premium features
- **One-time setup** - you do this once, then all users can install easily
- **Users don't need Partners** - they just click "Install" and authorize

---

## Why This is Better

✅ **Super easy for users** - Just click "Install"  
✅ **No technical knowledge needed** - Works like any Shopify app  
✅ **Secure** - Uses Shopify's standard OAuth flow  
✅ **Free for you** - Partners account is free for developers  
✅ **Professional** - Works like apps from Shopify App Store  

---

## Troubleshooting

**"App can't be installed" error?**
- Check App URL in Partners Dashboard matches your Render URL exactly
- Make sure distribution is set to "Public"
- Verify API credentials are correct in Render

**Users see error page?**
- Check that `SHOPIFY_HOST` is set correctly (without https://)
- Verify callback URL matches exactly in Partners Dashboard
- Check server logs for OAuth errors
