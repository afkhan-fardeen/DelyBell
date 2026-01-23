# Render Environment Variables Setup

**Configure your app's environment variables in Render dashboard**

---

## 🚀 Quick Setup

Since your app is deployed on Render at `https://delybell.onrender.com`, you need to set environment variables in the **Render Dashboard**, not in a local `.env` file.

---

## 📋 Required Environment Variables

Go to **Render Dashboard** → **Your Service** → **Environment** tab and add these:

### Shopify Configuration
```
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=delybell.onrender.com
```

**⚠️ Important:** 
- `SHOPIFY_HOST` should be `delybell.onrender.com` (without `https://`)
- Get API Key and Secret from [Shopify Partner Dashboard](https://partners.shopify.com)

---

### Delybell Configuration
```
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_delybell_access_key_here
DELYBELL_SECRET_KEY=your_delybell_secret_key_here
```

**⚠️ Important:**
- Get these credentials from Delybell
- Keep them secure - never commit to git

---

### Server Configuration
```
NODE_ENV=production
PORT=3000
```

**Note:** Render automatically sets `PORT`, but it's good to have it explicitly set.

---

### Order Processing Configuration
```
DEFAULT_SERVICE_TYPE_ID=1
DEFAULT_PICKUP_SLOT_TYPE=1
DEFAULT_PICKUP_CUSTOMER_NAME=Store
DEFAULT_PICKUP_MOBILE_NUMBER=+97300000000
```

**Note:** These are defaults used for order processing.

---

### Testing Defaults (Optional - only for test endpoints)
```
DEFAULT_DESTINATION_BLOCK_ID=5
DEFAULT_DESTINATION_ROAD_ID=1447
DEFAULT_DESTINATION_BUILDING_ID=1
DEFAULT_DESTINATION_FLAT_NUMBER=N/A
```

**Note:** These are only used for `/test` endpoints, not real orders.

---

## 🔧 How to Set Environment Variables in Render

### Step 1: Go to Render Dashboard
1. Visit [render.com](https://render.com)
2. Login to your account
3. Click on your service: **delybell** (or your service name)

### Step 2: Navigate to Environment Tab
1. Click on **"Environment"** tab in the left sidebar
2. You'll see a list of current environment variables

### Step 3: Add Variables
1. Click **"Add Environment Variable"** button
2. Enter the **Key** (e.g., `SHOPIFY_API_KEY`)
3. Enter the **Value** (e.g., your actual API key)
4. Click **"Save Changes"**
5. Repeat for all variables listed above

### Step 4: Verify
After adding all variables:
- Render will automatically restart your service
- Check the logs to ensure it starts correctly
- Test your app: `https://delybell.onrender.com/health`

---

## ✅ Verification Checklist

After setting all environment variables:

- [ ] All variables are set in Render dashboard
- [ ] `SHOPIFY_HOST` is set to `delybell.onrender.com` (no `https://`)
- [ ] Service restarted successfully
- [ ] Health check works: `https://delybell.onrender.com/health`
- [ ] App loads: `https://delybell.onrender.com/app`
- [ ] OAuth installation works
- [ ] Webhooks are registered

---

## 🔄 Updating Environment Variables

### To Update a Variable:
1. Go to Render Dashboard → Your Service → Environment
2. Find the variable you want to update
3. Click the **pencil icon** (edit)
4. Update the value
5. Click **"Save Changes"**
6. Service will restart automatically

### To Add a New Variable:
1. Go to Environment tab
2. Click **"Add Environment Variable"**
3. Enter Key and Value
4. Save

### To Delete a Variable:
1. Go to Environment tab
2. Find the variable
3. Click **trash icon** (delete)
4. Confirm deletion
5. Service will restart

---

## 🏠 Local Development

For **local development**, you can still use a `.env` file:

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Update `.env` with your local values:
   ```env
   SHOPIFY_HOST=localhost:3000
   # ... other variables
   ```

3. **Important:** Never commit `.env` to git!

---

## 🔐 Security Notes

- ✅ **Never commit** `.env` file to git
- ✅ **Never share** your API keys publicly
- ✅ **Use Render's** environment variables for production
- ✅ **Rotate keys** if they're exposed
- ✅ **Use different keys** for development and production

---

## 📝 Current Render Configuration

Your app is deployed at:
- **URL:** `https://delybell.onrender.com`
- **Service Name:** `delybell` (or your service name)

Make sure `SHOPIFY_HOST` is set to:
```
SHOPIFY_HOST=delybell.onrender.com
```

---

## 🆘 Troubleshooting

### Issue: App won't start
**Check:**
- All required environment variables are set
- `SHOPIFY_HOST` matches your Render URL (without `https://`)
- Check Render logs for specific errors

### Issue: OAuth not working
**Check:**
- `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
- `SHOPIFY_HOST` is set correctly
- Shopify Partner Dashboard URLs match Render URL

### Issue: Webhooks not working
**Check:**
- `SHOPIFY_API_SECRET` is correct (used for webhook verification)
- Webhook URLs in Shopify Partner Dashboard match Render URL
- Check Render logs for webhook errors

---

## 📚 Related Documentation

- **[Render App Store Setup](./RENDER_APP_STORE_SETUP.md)** - Complete deployment guide
- **[Deployment URLs](./DEPLOYMENT_URLS.md)** - All your app URLs
- **[Testing Guide](./TESTING_GUIDE.md)** - How to test your app

---

**Need help?** Check Render logs or refer to the troubleshooting section above! 🚀
