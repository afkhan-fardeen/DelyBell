# Installable App Checklist

**Quick checklist to make your app installable from Shopify App Store using Render**

---

## ✅ Pre-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Shopify Partner account created
- [ ] Render account created
- [ ] Delybell API credentials ready

---

## 🚀 Deployment Steps

### 1. Deploy to Render

- [ ] Create Render Web Service
- [ ] Set plan to **Starter** ($7/month) - Required for App Store
- [ ] Configure build command: `npm install`
- [ ] Configure start command: `npm start`
- [ ] Add all environment variables
- [ ] Deploy successfully
- [ ] Test health check endpoint

### 2. Create Shopify App

- [ ] Create app in Shopify Partner Dashboard
- [ ] Copy API Key and API Secret
- [ ] Configure App URL: `https://your-app.onrender.com/app`
- [ ] Configure Callback URL: `https://your-app.onrender.com/auth/callback`
- [ ] Set scopes: `read_orders,write_orders`
- [ ] Configure webhooks:
  - [ ] `orders/create` → `/webhooks/orders/create`
  - [ ] `orders/updated` → `/webhooks/orders/update`
  - [ ] `app/uninstalled` → `/webhooks/app/uninstalled`

### 3. Update Configuration

- [ ] Update `shopify.app.toml` with Client ID
- [ ] Update `shopify.app.toml` with Render URL
- [ ] Update Render environment variables with Shopify credentials
- [ ] Update `SHOPIFY_HOST` in Render with actual Render URL
- [ ] Commit and push changes

### 4. Test Installation

- [ ] Test install in development store
- [ ] Verify OAuth flow works
- [ ] Verify app loads in Shopify admin
- [ ] Create test order
- [ ] Verify order syncs to Delybell
- [ ] Verify webhooks are registered
- [ ] Test app uninstall

---

## 🏪 App Store Submission

### 5. Prepare App Store Listing

- [ ] App name finalized
- [ ] Short description written (80 chars max)
- [ ] Long description written (2000 chars max)
- [ ] Category selected: Shipping & Delivery
- [ ] Pricing set to: Free
- [ ] Support email configured
- [ ] Support response time set

### 6. App Assets

- [ ] App icon ready (1200x1200)
- [ ] Screenshots ready (1200x630, min 1)
- [ ] Promotional banner (optional)

### 7. Legal Pages

- [ ] Privacy Policy accessible: `/privacy-policy.html`
- [ ] Terms of Service accessible: `/terms-of-service.html`
- [ ] Both pages load correctly on Render

### 8. Final Checks

- [ ] App works on all Shopify plans
- [ ] No console errors
- [ ] Error handling is user-friendly
- [ ] Webhooks work reliably
- [ ] Orders sync correctly
- [ ] App uninstall handler works

### 9. Submit

- [ ] Complete App Store listing form
- [ ] Upload all assets
- [ ] Add legal page URLs
- [ ] Submit for review
- [ ] Wait for approval (5-7 business days)

---

## 📝 Important URLs

After deployment, ensure these URLs work:

- **App URL:** `https://your-app.onrender.com/app`
- **OAuth Install:** `https://your-app.onrender.com/auth/install?shop=store.myshopify.com`
- **OAuth Callback:** `https://your-app.onrender.com/auth/callback`
- **Webhooks:**
  - Orders Create: `https://your-app.onrender.com/webhooks/orders/create`
  - Orders Update: `https://your-app.onrender.com/webhooks/orders/update`
  - App Uninstall: `https://your-app.onrender.com/webhooks/app/uninstalled`
- **Legal:**
  - Privacy: `https://your-app.onrender.com/privacy-policy.html`
  - Terms: `https://your-app.onrender.com/terms-of-service.html`
- **Health:** `https://your-app.onrender.com/health`

---

## 🔑 Environment Variables

Required in Render:

```
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=your-app.onrender.com
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_key
DELYBELL_SECRET_KEY=your_secret
NODE_ENV=production
PORT=3000
DEFAULT_SERVICE_TYPE_ID=1
DEFAULT_PICKUP_SLOT_TYPE=1
```

---

## 📚 Full Guides

- **[Render + App Store Setup](./RENDER_APP_STORE_SETUP.md)** - Complete step-by-step guide
- **[Render Environment Variables](./RENDER_ENV_SETUP.md)** - How to configure environment variables
- **[Deployment URLs](./DEPLOYMENT_URLS.md)** - All your app URLs

---

**Follow this checklist and your app will be installable from the Shopify App Store!** 🎉
