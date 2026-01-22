# Render Quick Start Guide

**Deploy your Shopify app to Render in 5 minutes**

---

## ✅ Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] Code pushed to GitHub
- [ ] Shopify Partner account
- [ ] Shopify app created in Partner Dashboard
- [ ] Delybell API credentials
- [ ] Render account (sign up at render.com)

---

## 🚀 Quick Deploy Steps

### 1. Push to GitHub (if not already done)

```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Create Render Service

1. Go to [render.com](https://render.com) → Sign up/Login
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub → Select your repo
4. Configure:
   - **Name:** `delybell-shopify-app`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free` (or `Starter` for always-on)

### 3. Add Environment Variables

In Render dashboard → Your Service → Environment, add:

**Required:**
```
SHOPIFY_API_KEY=your_key_here
SHOPIFY_API_SECRET=your_secret_here
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=delybell-shopify-app.onrender.com
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_key_here
DELYBELL_SECRET_KEY=your_secret_here
NODE_ENV=production
PORT=3000
DEFAULT_SERVICE_TYPE_ID=1
DEFAULT_PICKUP_SLOT_TYPE=1
```

**Optional:**
```
DEFAULT_PICKUP_CUSTOMER_NAME=Store
DEFAULT_PICKUP_MOBILE_NUMBER=+97300000000
```

### 4. Deploy

1. Click **"Create Web Service"**
2. Wait for build to complete (~2-3 minutes)
3. Copy your app URL: `https://delybell-shopify-app.onrender.com`

### 5. Update Shopify App Settings

1. Go to Shopify Partner Dashboard → Your App
2. Update:
   - **App URL:** `https://delybell-shopify-app.onrender.com`
   - **Allowed redirection URL(s):** `https://delybell-shopify-app.onrender.com/auth/callback`
3. Save

### 6. Update Render Environment Variable

1. Go back to Render → Environment
2. Update `SHOPIFY_HOST` to your actual Render URL
3. Save (service will restart)

### 7. Test

1. Visit: `https://delybell-shopify-app.onrender.com/health`
2. Should see: `{"status":"ok","timestamp":"..."}`
3. Install app in Shopify store
4. Create test order
5. Check Render logs for webhook processing

---

## 🔧 Troubleshooting

**Build fails?**
- Check build logs in Render dashboard
- Ensure `package.json` is valid
- Verify all dependencies are listed

**App won't start?**
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure `SHOPIFY_HOST` matches your Render URL

**Webhooks not working?**
- Verify webhook URL in Shopify Partner Dashboard
- Check webhook verification middleware
- Review Render logs for errors

---

## 📚 Full Documentation

See **[RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)** for detailed guide.

---

**Ready?** Follow the steps above and you'll be live in minutes! 🎉
