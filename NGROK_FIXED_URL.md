# 🌐 ngrok Setup Guide

## Free Plan (URL Changes Each Time)

### Step 1: Configure ngrok

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### Step 2: Start ngrok

```bash
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

**Note**: Free plan URLs change each time you restart ngrok.

### Step 3: Update Setup

1. **Update `.env`**:
   ```env
   SHOPIFY_HOST=abc123.ngrok.io
   ```

2. **Update Shopify App Settings**:
   - **App URL**: `https://abc123.ngrok.io`
   - **Redirect URL**: `https://abc123.ngrok.io/auth/callback`

---

## 💰 Fixed URL Options (Paid Plans)

### Option 1: ngrok Paid Plan

Upgrade at: https://dashboard.ngrok.com/billing/choose-a-plan

Then use:
```bash
ngrok http 3000 --domain=your-fixed-domain.ngrok.app
```

### Option 2: Use localhost for OAuth (Recommended!)

**Best approach for free plan:**

1. **Shopify App Settings**:
   - **App URL**: `http://localhost:3000`
   - **Redirect URL**: `http://localhost:3000/auth/callback`

2. **Install app** (uses localhost - no tunnel needed):
   ```
   http://localhost:3000/auth/install?shop=delybell.myshopify.com
   ```

3. **Use ngrok ONLY for webhooks**:
   ```bash
   ngrok http 3000
   ```
   Copy URL and register webhooks with it.

**Benefits:**
- ✅ OAuth never breaks (localhost doesn't change)
- ✅ Only webhook URL changes (easy to re-register)
- ✅ No paid plan needed!

---

## 🎯 Recommended Setup (Free Plan)

1. **Shopify settings**: Use `localhost:3000`
2. **OAuth**: Use `localhost:3000` 
3. **Webhooks**: Use ngrok URL (can change, just re-register)

---

**For free plan: Use localhost for OAuth, ngrok only for webhooks!** 🚀

