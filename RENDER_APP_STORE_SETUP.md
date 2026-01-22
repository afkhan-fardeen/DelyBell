# Render + Shopify App Store Setup Guide

**Complete guide to deploy your app on Render and make it installable from the Shopify App Store**

---

## 🎯 Goal

Make your app:
- ✅ Hosted on Render (production-ready)
- ✅ Installable from Shopify App Store
- ✅ Public app (free, no revenue model)
- ✅ Works for any Shopify store that installs it

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] **Shopify Partner Account** - [Sign up here](https://partners.shopify.com)
- [ ] **GitHub Account** - Code must be in a GitHub repository
- [ ] **Render Account** - [Sign up here](https://render.com) (free)
- [ ] **Delybell API Credentials** - From Delybell
- [ ] **Domain (Optional)** - Custom domain for your app (Render provides free subdomain)

---

## 🚀 Step 1: Deploy to Render

### 1.1 Push Code to GitHub

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 1.2 Create Render Web Service

1. Go to [render.com](https://render.com) → Sign up/Login
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub → Select your repository
4. Configure:
   - **Name:** `delybell-shopify-app` (or your preferred name)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Starter` ($7/month) - **Required for App Store** (always-on)
   - **Region:** Choose closest to your users (e.g., `Singapore`)

### 1.3 Add Environment Variables

In Render dashboard → Your Service → Environment, add:

```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=delybell.onrender.com

# Delybell Configuration
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_delybell_access_key
DELYBELL_SECRET_KEY=your_delybell_secret_key

# Server Configuration
NODE_ENV=production
PORT=3000

# Order Processing
DEFAULT_SERVICE_TYPE_ID=1
DEFAULT_PICKUP_SLOT_TYPE=1
DEFAULT_PICKUP_CUSTOMER_NAME=Store
DEFAULT_PICKUP_MOBILE_NUMBER=+97300000000
```

**⚠️ Important:** Set `SHOPIFY_HOST=delybell.onrender.com` (your actual Render URL)

### 1.4 Deploy

1. Click **"Create Web Service"**
2. Wait for build to complete (~2-3 minutes)
3. Copy your app URL: `https://delybell.onrender.com`
4. Test health check: `https://delybell.onrender.com/health`

---

## 🔧 Step 2: Create Shopify App in Partner Dashboard

### 2.1 Create New App

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Click **"Apps"** → **"Create app"**
3. Choose **"Create app manually"**
4. Fill in:
   - **App name:** `Delybell Order Sync` (or your name)
   - **App URL:** `https://delybell.onrender.com/app`
   - **Allowed redirection URL(s):** `https://delybell.onrender.com/auth/callback`
5. Click **"Create app"**

### 2.2 Configure App Settings

Go to **"App setup"** tab:

**App URL:**
```
https://delybell.onrender.com/app
```

**Allowed redirection URL(s):**
```
https://delybell.onrender.com/auth/callback
```

**Webhooks:**
- `orders/create` → `https://delybell.onrender.com/webhooks/orders/create`
- `orders/updated` → `https://delybell.onrender.com/webhooks/orders/update`
- `app/uninstalled` → `https://delybell.onrender.com/webhooks/app/uninstalled`

**Scopes (API access scopes):**
- ✅ `read_orders` - Read orders
- ✅ `write_orders` - Update orders (for tags)

### 2.3 Copy API Credentials

From **"Client credentials"** section, copy:
- **API Key** → Use as `SHOPIFY_API_KEY` in Render
- **API Secret** → Use as `SHOPIFY_API_SECRET` in Render

### 2.4 Update Render Environment Variables

Go back to Render → Environment → Update:
- `SHOPIFY_API_KEY` with your API Key
- `SHOPIFY_API_SECRET` with your API Secret
- `SHOPIFY_HOST` with your Render URL (if not already set)

---

## 📝 Step 3: Update App Configuration Files

### 3.1 Update `shopify.app.toml`

Edit `shopify.app.toml`:

```toml
# Shopify App Configuration
name = "Delybell Order Sync"

# Replace with your actual Client ID from Partner Dashboard
client_id = "YOUR_CLIENT_ID_FROM_PARTNER_DASHBOARD"

# Your Render URL
application_url = "https://delybell.onrender.com"

embedded = true

[access_scopes]
scopes = "read_orders,write_orders"

[[webhooks]]
api_version = "2024-01"
subscriptions = ["orders/create", "orders/updated", "app/uninstalled"]

[app_proxy]
url = "https://delybell.onrender.com"
subpath = "apps"
prefix = "delybell"

[build]
automatically_update_urls_on_dev = true
dev_store_url = "your-dev-store.myshopify.com"
include_config_on_deploy = true
```

**To find your Client ID:**
1. Go to Partner Dashboard → Your App → **"Client credentials"**
2. Copy the **"Client ID"** value

### 3.2 Update `public/index.html` (if needed)

Ensure the admin UI has proper App Bridge setup. The file should already be configured correctly.

### 3.3 Commit and Push Changes

```bash
git add shopify.app.toml
git commit -m "Update Shopify app configuration for Render"
git push origin main
```

Render will auto-deploy the changes.

---

## ✅ Step 4: Test Installation

### 4.1 Test in Development Store

1. Go to Partner Dashboard → Your App → **"Test on development store"**
2. Click **"Select store"** → Choose a development store
3. Click **"Install"**
4. Complete OAuth flow
5. Verify app loads in Shopify admin

### 4.2 Test Order Processing

1. Create a test order in your development store
2. Check Render logs for webhook processing
3. Verify order syncs to Delybell

### 4.3 Verify Webhooks

1. Go to Shopify Admin → Settings → Notifications
2. Check webhook delivery status
3. Verify webhooks are registered correctly

---

## 🏪 Step 5: Prepare for App Store Submission

### 5.1 App Store Listing Requirements

Go to Partner Dashboard → Your App → **"App Store listing"**

#### Basic Information

- **App name:** `Delybell Order Sync` (or your name)
- **Short description:** (80 characters max)
  ```
  Automatically sync Shopify orders to Delybell delivery management system
  ```
- **Long description:** (2000 characters max)
  ```
  Delybell Order Sync seamlessly integrates your Shopify store with Delybell's delivery management system. When customers place orders, they are automatically processed and dispatched through Delybell.

  Features:
  • Automatic order synchronization
  • Real-time webhook processing
  • Seamless integration with Delybell
  • No manual configuration required
  • Free to use

  Perfect for Shopify stores using Delybell for order fulfillment and delivery management.
  ```

#### Category & Pricing

- **Category:** `Shipping & Delivery`
- **Pricing:** `Free` (no revenue model)
- **Support email:** Your support email
- **Support response time:** `24 hours` (or your preference)

#### App Assets

**App Icon:**
- Size: 1200x1200 pixels
- Format: PNG or JPG
- Must represent your app

**Screenshots:**
- Size: 1200x630 pixels
- Format: PNG or JPG
- Minimum: 1 screenshot
- Recommended: 3-5 screenshots
- Show your app's admin interface

**Promotional Banner (Optional):**
- Size: 1200x500 pixels
- Format: PNG or JPG

### 5.2 Legal Pages

Your app already includes:
- ✅ Privacy Policy: `https://delybell.onrender.com/privacy-policy.html`
- ✅ Terms of Service: `https://delybell.onrender.com/terms-of-service.html`

**Verify these URLs are accessible:**
1. Visit: `https://delybell.onrender.com/privacy-policy.html`
2. Visit: `https://delybell.onrender.com/terms-of-service.html`
3. Ensure both pages load correctly

### 5.3 App Functionality Checklist

Before submitting, ensure:

- [ ] App installs successfully
- [ ] OAuth flow works correctly
- [ ] Orders sync to Delybell automatically
- [ ] Webhooks are registered automatically
- [ ] App uninstall handler works
- [ ] Admin UI loads in Shopify admin
- [ ] No console errors in browser
- [ ] Works on all Shopify plans (Basic, Shopify, Advanced, Plus)

---

## 📤 Step 6: Submit to App Store

### 6.1 Complete App Store Listing

1. Go to Partner Dashboard → Your App → **"App Store listing"**
2. Fill in all required fields:
   - Basic information
   - App assets (icon, screenshots)
   - Category & pricing
   - Support information
   - Legal pages URLs
3. Click **"Save"**

### 6.2 Submit for Review

1. Click **"Submit for review"**
2. Shopify will review your app (typically 5-7 business days)
3. You'll receive email notifications about review status

### 6.3 Review Process

Shopify will check:
- ✅ App functionality
- ✅ Security and privacy
- ✅ User experience
- ✅ Compliance with Shopify policies
- ✅ Webhook reliability
- ✅ Error handling

**Common Issues:**
- App crashes or errors
- Webhooks not working
- Missing error handling
- Privacy policy not accessible
- Poor user experience

---

## 🎉 Step 7: After Approval

### 7.1 App Goes Live

Once approved:
- ✅ Your app appears in Shopify App Store
- ✅ Any Shopify store can install it
- ✅ Installation flow works automatically
- ✅ Each store's orders sync to Delybell

### 7.2 Monitor Usage

- Check Render logs for app activity
- Monitor webhook processing
- Track order sync success rate
- Respond to support requests

### 7.3 Support

Be ready to:
- Answer support emails
- Fix bugs quickly
- Update app as needed
- Maintain app store listing

---

## 🔄 Step 8: Updates & Maintenance

### 8.1 Updating Your App

1. Make changes to code
2. Push to GitHub
3. Render auto-deploys
4. Test changes
5. Submit update to App Store (if needed)

### 8.2 App Store Updates

For significant changes:
1. Update app version in `package.json`
2. Update App Store listing if needed
3. Submit for review (if required)

---

## 📚 Important URLs Reference

After deployment, your app will have these URLs:

**Main App:**
- App URL: `https://delybell.onrender.com/app`
- API Root: `https://delybell.onrender.com/`

**OAuth:**
- Install: `https://delybell.onrender.com/auth/install?shop=store.myshopify.com`
- Callback: `https://delybell.onrender.com/auth/callback`

**Webhooks:**
- Orders Create: `https://delybell.onrender.com/webhooks/orders/create`
- Orders Update: `https://delybell.onrender.com/webhooks/orders/update`
- App Uninstall: `https://delybell.onrender.com/webhooks/app/uninstalled`

**Legal:**
- Privacy Policy: `https://delybell.onrender.com/privacy-policy.html`
- Terms of Service: `https://delybell.onrender.com/terms-of-service.html`

**Health Check:**
- Health: `https://delybell.onrender.com/health`

---

## 🆘 Troubleshooting

### App Won't Install

**Check:**
- ✅ All URLs use HTTPS
- ✅ `SHOPIFY_HOST` matches Render URL
- ✅ OAuth callback URL is correct
- ✅ API credentials are correct

**Solution:**
- Verify Render service is running
- Check Render logs for errors
- Verify Shopify Partner Dashboard settings

### Webhooks Not Working

**Check:**
- ✅ Webhook URLs are correct
- ✅ Webhook verification middleware is enabled
- ✅ Render service is accessible

**Solution:**
- Check Render logs
- Verify webhook registration
- Test webhook endpoints manually

### Orders Not Syncing

**Check:**
- ✅ Webhooks are registered
- ✅ Delybell API credentials are correct
- ✅ Order processing logic is working

**Solution:**
- Check Render logs
- Test order processing manually
- Verify Delybell API connectivity

---

## 💰 Pricing Summary

**Render:**
- Starter Plan: $7/month (always-on, required for App Store)
- Free tier available but spins down (not suitable for App Store)

**Shopify:**
- Partner account: Free
- App Store listing: Free
- No revenue share for free apps

**Total Cost:** ~$7/month (Render hosting)

---

## ✅ Final Checklist

Before submitting to App Store:

- [ ] App deployed on Render (Starter plan)
- [ ] All environment variables configured
- [ ] Shopify app created in Partner Dashboard
- [ ] All URLs configured correctly
- [ ] App installs successfully in test store
- [ ] Orders sync correctly
- [ ] Webhooks work reliably
- [ ] Legal pages accessible
- [ ] App Store listing completed
- [ ] App icon and screenshots ready
- [ ] Support email configured
- [ ] App tested thoroughly

---

## 📖 Additional Resources

- **[Render Deployment Guide](./RENDER_DEPLOYMENT.md)** - Detailed Render setup
- **[App Store Ready Checklist](./APP_STORE_READY.md)** - Complete checklist
- **[App Store Listing Guide](./APP_STORE_LISTING.md)** - Listing details
- **[Shopify App Setup](./SHOPIFY_APP_SETUP.md)** - App configuration

---

**Ready to go live?** Follow these steps and your app will be installable from the Shopify App Store! 🚀
