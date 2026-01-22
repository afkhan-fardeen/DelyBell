# Render Deployment Guide

**Step-by-step guide to deploy your Shopify app on Render**

---

## 🚀 Prerequisites

1. ✅ **GitHub account** - Your code must be in a GitHub repository
2. ✅ **Render account** - Sign up at [render.com](https://render.com) (free)
3. ✅ **Shopify Partner account** - For app credentials
4. ✅ **Delybell API credentials** - From Delybell

---

## 📋 Step 1: Prepare Your Repository

### 1.1 Push Code to GitHub

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 1.2 Verify Required Files

Ensure these files exist in your repo:
- ✅ `package.json` - Node.js dependencies
- ✅ `server.js` - Main server file
- ✅ `render.yaml` - Render configuration (optional but recommended)
- ✅ `.env.example` - Environment variables template

---

## 🔧 Step 2: Create Render Account & Service

### 2.1 Sign Up / Login

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended) or email
3. Verify your email if needed

### 2.2 Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub account (if not already connected)
3. Select your repository: `DelyBell` (or your repo name)
4. Click **"Connect"**

---

## ⚙️ Step 3: Configure Service Settings

### 3.1 Basic Settings

Fill in the following:

- **Name:** `delybell-shopify-app` (or your preferred name)
- **Region:** Choose closest to your users (e.g., `Singapore` for Bahrain)
- **Branch:** `main` (or your default branch)
- **Root Directory:** Leave empty (or `./` if needed)
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** 
  - **Free** - Spins down after 15 min inactivity (good for testing)
  - **Starter ($7/month)** - Always on (recommended for production)

### 3.2 Advanced Settings (Optional)

- **Auto-Deploy:** `Yes` (deploys on every push)
- **Health Check Path:** `/health`

---

## 🔐 Step 4: Configure Environment Variables

### 4.1 Required Environment Variables

Click **"Environment"** tab and add these variables:

#### Shopify Configuration
```
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=delybell-shopify-app.onrender.com
```

**⚠️ Important:** Replace `SHOPIFY_HOST` with your actual Render URL after deployment!

#### Delybell Configuration
```
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_delybell_access_key_here
DELYBELL_SECRET_KEY=your_delybell_secret_key_here
```

#### Server Configuration
```
NODE_ENV=production
PORT=3000
```

#### Order Processing Configuration
```
DEFAULT_SERVICE_TYPE_ID=1
DEFAULT_PICKUP_SLOT_TYPE=1
DEFAULT_PICKUP_CUSTOMER_NAME=Store
DEFAULT_PICKUP_MOBILE_NUMBER=+97300000000
```

#### Testing Defaults (Optional - only for test endpoints)
```
DEFAULT_DESTINATION_BLOCK_ID=5
DEFAULT_DESTINATION_ROAD_ID=1447
DEFAULT_DESTINATION_BUILDING_ID=1
```

### 4.2 Get Shopify API Credentials

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Create a new app (or use existing)
3. Copy **API Key** and **API Secret**
4. Set **App URL:** `https://delybell-shopify-app.onrender.com`
5. Set **Allowed redirection URL(s):** `https://delybell-shopify-app.onrender.com/auth/callback`

---

## 🚀 Step 5: Deploy

### 5.1 Initial Deployment

1. Click **"Create Web Service"**
2. Render will start building your app
3. Watch the build logs for any errors
4. Once deployed, you'll get a URL: `https://delybell-shopify-app.onrender.com`

### 5.2 Update Shopify App Settings

After deployment, update your Shopify app:

1. Go to Shopify Partner Dashboard → Your App → App Setup
2. Update **App URL:** `https://delybell-shopify-app.onrender.com`
3. Update **Allowed redirection URL(s):** `https://delybell-shopify-app.onrender.com/auth/callback`
4. Update **Webhook URL:** `https://delybell-shopify-app.onrender.com/webhooks/orders/create`
5. Save changes

### 5.3 Update Render Environment Variable

1. Go to Render Dashboard → Your Service → Environment
2. Update `SHOPIFY_HOST` to your actual Render URL:
   ```
   SHOPIFY_HOST=delybell-shopify-app.onrender.com
   ```
3. Save changes (service will restart automatically)

---

## ✅ Step 6: Verify Deployment

### 6.1 Health Check

Visit: `https://delybell-shopify-app.onrender.com/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-18T10:00:00.000Z"
}
```

### 6.2 Test App Installation

1. Go to your Shopify store admin
2. Install your app
3. Verify OAuth flow works
4. Check that app loads in Shopify admin

### 6.3 Test Webhook

1. Create a test order in Shopify
2. Check Render logs for webhook processing
3. Verify order syncs to Delybell

---

## 🔍 Troubleshooting

### Issue: Build Fails

**Check:**
- ✅ `package.json` exists and is valid
- ✅ All dependencies are listed in `package.json`
- ✅ Build logs show specific error

**Solution:**
- Check build logs in Render dashboard
- Ensure Node.js version is compatible (Render uses Node 18 by default)

### Issue: App Won't Start

**Check:**
- ✅ All environment variables are set
- ✅ `SHOPIFY_HOST` matches your Render URL
- ✅ Port is set to `3000` (or Render's assigned port)

**Solution:**
- Check logs in Render dashboard
- Verify `server.js` listens on `process.env.PORT || 3000`

### Issue: Webhooks Not Working

**Check:**
- ✅ Webhook URL is correct in Shopify Partner Dashboard
- ✅ Webhook verification middleware is working
- ✅ HMAC secret matches Shopify

**Solution:**
- Check webhook logs in Render dashboard
- Verify webhook verification middleware is enabled

### Issue: Free Tier Spins Down

**Problem:** Free tier spins down after 15 min inactivity

**Solutions:**
1. Upgrade to Starter plan ($7/month) for always-on
2. Use a service like [UptimeRobot](https://uptimerobot.com) to ping your app every 5 minutes
3. Set up a cron job to keep it alive

---

## 🔄 Step 7: Auto-Deploy Setup

### 7.1 Enable Auto-Deploy

Render automatically deploys on every push to your main branch.

**To deploy manually:**
1. Go to Render Dashboard → Your Service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

### 7.2 Deploy Specific Branch

1. Go to Settings → Build & Deploy
2. Change **Branch** to your desired branch
3. Save changes

---

## 📊 Step 8: Monitoring & Logs

### 8.1 View Logs

1. Go to Render Dashboard → Your Service
2. Click **"Logs"** tab
3. View real-time logs

### 8.2 Set Up Monitoring (Optional)

- Use Render's built-in metrics
- Set up external monitoring (e.g., UptimeRobot)
- Configure alerts for downtime

---

## 🔒 Step 9: Security Checklist

- ✅ Never commit `.env` file
- ✅ Use environment variables for all secrets
- ✅ Enable HTTPS (automatic on Render)
- ✅ Keep dependencies updated
- ✅ Use strong API keys
- ✅ Enable webhook verification

---

## 💰 Pricing

### Free Tier
- ✅ 750 hours/month free
- ✅ Free SSL certificate
- ✅ Free subdomain
- ⚠️ Spins down after 15 min inactivity

### Starter Plan ($7/month)
- ✅ Always on
- ✅ 512 MB RAM
- ✅ 0.5 CPU
- ✅ Unlimited bandwidth

### Professional Plan ($25/month)
- ✅ Always on
- ✅ 2 GB RAM
- ✅ 1 CPU
- ✅ Better performance

---

## 📝 Next Steps

1. ✅ Deploy to Render
2. ✅ Test app installation
3. ✅ Test order processing
4. ✅ Set up custom domain (optional)
5. ✅ Configure monitoring
6. ✅ Submit to Shopify App Store

---

## 🆘 Support

- **Render Docs:** [render.com/docs](https://render.com/docs)
- **Render Support:** [render.com/support](https://render.com/support)
- **Shopify Docs:** [shopify.dev](https://shopify.dev)

---

**Ready to deploy?** Follow the steps above and your app will be live in minutes! 🚀
