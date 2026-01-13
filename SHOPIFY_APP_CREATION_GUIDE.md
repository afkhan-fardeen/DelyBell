# 🛍️ Complete Guide: Creating a Custom Shopify App

This guide walks you through creating a custom Shopify app from scratch in the Shopify Partners Dashboard.

---

## 📋 Prerequisites

Before you start, make sure you have:

- ✅ **Shopify Partner Account** - [Sign up here](https://partners.shopify.com/signup) (free)
- ✅ **Email address** - For account verification
- ✅ **Shopify Store** (optional for testing) - You can create a development store during setup

---

## 🚀 Step 1: Create Shopify Partner Account

### 1.1 Sign Up for Partners Account

1. Go to [https://partners.shopify.com/signup](https://partners.shopify.com/signup)
2. Fill in the form:
   - **Email address**
   - **Password** (at least 8 characters)
   - **First name** and **Last name**
   - **Company name** (optional)
3. Click **"Create account"**
4. Check your email and verify your account

### 1.2 Complete Partner Profile

1. After verification, log in to [Partners Dashboard](https://partners.shopify.com/)
2. Complete your profile:
   - Add company information (if applicable)
   - Set up payment information (for future app sales)
   - Verify your identity (may be required)

---

## 🏪 Step 2: Create a Development Store (Optional but Recommended)

A development store lets you test your app without affecting a real store.

### 2.1 Create Development Store

1. In Partners Dashboard, click **"Stores"** in the left sidebar
2. Click **"Add store"** → **"Development store"**
3. Fill in the form:
   - **Store name**: `My Test Store` (or any name)
   - **Store purpose**: Select **"Test apps and the Shopify API"**
   - **Store type**: Choose **"Development store"**
4. Click **"Create development store"**

### 2.2 Access Your Development Store

1. Your store will be created at: `your-store-name.myshopify.com`
2. Click **"Manage store"** to access the admin
3. Note down your store URL - you'll need it later!

---

## 📱 Step 3: Create Your Custom App

### 3.1 Navigate to Apps Section

1. In Partners Dashboard, click **"Apps"** in the left sidebar
2. You'll see a list of your apps (empty if this is your first)
3. Click **"Create app"** button (top right)

### 3.2 Choose App Type

You'll see two options:

**Option A: Public app** (Recommended for this integration)
- Can be installed on multiple stores
- Requires app review for public listing
- Best for: Apps you want to distribute

**Option B: Custom app**
- Only for your own stores
- No app review needed
- Best for: Internal tools

**👉 Select "Public app"** (you can always keep it private)

### 3.3 Fill in App Details

Fill in the following information:

#### Basic Information

- **App name**: `Delybell Integration` (or your preferred name)
  - This is what users will see
  - Can be changed later
  
- **App URL**: `https://your-domain.com` or `https://your-ngrok-url.ngrok.io`
  - ⚠️ **Important**: This must be a publicly accessible HTTPS URL
  - For local development, use ngrok (see Step 4)
  - For production, use your actual domain
  - **Example**: `https://abc123.ngrok.io` (if using ngrok)

#### App Setup

- **Allowed redirection URL(s)**: 
  ```
  https://your-domain.com/auth/callback
  ```
  - Replace `your-domain.com` with your actual domain/ngrok URL
  - This is where Shopify redirects after OAuth
  - **Example**: `https://abc123.ngrok.io/auth/callback`
  - You can add multiple URLs (one per line)

#### App Visibility (Optional)

- **App visibility**: Choose **"Unlisted"** (for now)
  - Unlisted = Only accessible via direct link
  - Public = Listed in Shopify App Store (requires review)
  - You can change this later

### 3.4 Review and Create

1. Review all the information
2. Check the **"I understand"** checkbox
3. Click **"Create app"**

---

## 🔑 Step 4: Get Your API Credentials

After creating the app, you'll be taken to the app overview page.

### 4.1 Find Your Credentials

1. On the app overview page, look for **"Client credentials"** section
2. You'll see:
   - **API Key** (also called Client ID)
   - **API Secret Key** (also called Client Secret)

### 4.2 Copy Your Credentials

**⚠️ IMPORTANT**: Copy these immediately and store them securely!

- **API Key**: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **API Secret Key**: `shpss_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**💡 Tip**: Click the **"Reveal"** button to see the full secret key.

### 4.3 Save Credentials

Save these in a safe place:
- Add to your `.env` file (see Step 5)
- Store in a password manager
- **Never commit these to Git!**

---

## ⚙️ Step 5: Configure App Settings

### 5.1 Access App Settings

1. In your app overview, click **"App setup"** tab (left sidebar)
2. Or click **"Configure"** button

### 5.2 Configure OAuth Settings

#### App URL
- Should already be set from Step 3.3
- Format: `https://your-domain.com`
- Must be HTTPS (not HTTP)

#### Allowed redirection URL(s)
- Should already be set from Step 3.3
- Format: `https://your-domain.com/auth/callback`
- Add one URL per line if you have multiple environments

### 5.3 Configure API Scopes

1. Scroll down to **"Scopes"** section
2. Click **"Configure scopes"**
3. Select the following scopes:

**Required Scopes:**
- ✅ **`read_orders`** - Read orders from store
- ✅ **`write_orders`** - Update orders (for tags)

**Optional Scopes** (add if needed):
- `read_products` - If you need product information
- `read_customers` - If you need customer information
- `read_inventory` - If you need inventory data

4. Click **"Save"**

### 5.4 Configure Webhooks (Optional - Can Do Later)

1. Scroll to **"Webhooks"** section
2. Click **"Create webhook"**
3. Configure:
   - **Event**: `Order creation`
   - **Format**: `JSON`
   - **URL**: `https://your-domain.com/webhooks/orders/create`
4. Click **"Save webhook"**

Repeat for:
- **Event**: `Order update`
- **URL**: `https://your-domain.com/webhooks/orders/update`

**Note**: You can also register webhooks programmatically via API (recommended).

---

## 🌐 Step 6: Set Up Public URL (For Local Development)

If you're developing locally, you need a public URL. Use **ngrok**.

### 6.1 Install ngrok

**macOS:**
```bash
brew install ngrok
```

**Windows:**
- Download from [ngrok.com/download](https://ngrok.com/download)
- Extract and add to PATH

**Linux:**
```bash
# Download and install
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### 6.2 Start Your Server

```bash
cd /Users/dev/Desktop/Fardeen/Shopify
npm install
npm start
```

Your server should be running on `http://localhost:3000`

### 6.3 Start ngrok Tunnel

In a **new terminal**:

```bash
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy the HTTPS URL**: `https://abc123.ngrok.io`

### 6.4 Update Shopify App Settings

1. Go back to your Shopify app settings
2. Update **App URL** to: `https://abc123.ngrok.io`
3. Update **Allowed redirection URL(s)** to: `https://abc123.ngrok.io/auth/callback`
4. Click **"Save"**

**⚠️ Important**: Every time you restart ngrok, you get a new URL. You'll need to:
- Update Shopify app settings
- Update `.env` file
- Re-register webhooks

**💡 Tip**: Get a free ngrok account for a fixed domain (or use a paid plan).

---

## 📝 Step 7: Configure Environment Variables

### 7.1 Create `.env` File

Create a `.env` file in your project root:

```bash
cd /Users/dev/Desktop/Fardeen/Shopify
touch .env
```

### 7.2 Add Shopify Credentials

Open `.env` and add:

```env
# Shopify Configuration
SHOPIFY_API_KEY=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_SECRET=shpss_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=abc123.ngrok.io

# Delybell API Configuration
DELYBELL_API_URL=https://api.delybell.com
DELYBELL_ACCESS_KEY=fb74e2976aca54c81f28cb65284c279df7cdc8e06b77a0d03c84ea99bc078a77
DELYBELL_SECRET_KEY=660990668c85cafa6bf4b6b45ea492fd14b974ac69bba6df99e8a8daa7437bc3

# Server Configuration
PORT=3000
```

**Replace:**
- `shpat_xxx...` with your **API Key** from Step 4.1
- `shpss_xxx...` with your **API Secret Key** from Step 4.1
- `abc123.ngrok.io` with your **ngrok URL** from Step 6.3

### 7.3 Verify `.env` File

Make sure `.env` is in `.gitignore` (it should be):

```bash
cat .gitignore | grep .env
```

Should output: `.env`

---

## ✅ Step 8: Verify App Configuration

### 8.1 Check App Status

In Shopify Partners Dashboard:
- Go to your app
- Check **"App status"** - should be **"Active"**
- Check **"App URL"** - should match your ngrok URL
- Check **"Redirect URLs"** - should include `/auth/callback`

### 8.2 Test Server Connection

```bash
# Start server (if not running)
npm start

# In another terminal, test health endpoint
curl http://localhost:3000/health
```

Should return:
```json
{"status":"ok","timestamp":"2026-01-10T..."}
```

### 8.3 Test ngrok Connection

```bash
# Test via ngrok URL
curl https://abc123.ngrok.io/health
```

Should return the same JSON response.

---

## 🎯 Step 9: Install App on Your Store

### 9.1 Generate Install URL

Visit in your browser (replace `your-shop` with your store name):

```
http://localhost:3000/auth/install?shop=your-shop.myshopify.com
```

**Example:**
```
http://localhost:3000/auth/install?shop=my-test-store.myshopify.com
```

### 9.2 Complete OAuth Flow

1. You'll be redirected to Shopify's authorization page
2. Review the permissions requested:
   - Read orders
   - Write orders
3. Click **"Install app"**
4. You'll be redirected back to `/auth/success`

### 9.3 Verify Installation

Check if installation was successful:

```bash
curl "http://localhost:3000/auth/check?shop=your-shop.myshopify.com"
```

Should return:
```json
{
  "success": true,
  "authenticated": true,
  "shop": "your-shop.myshopify.com",
  "expiresAt": "2026-01-10T..."
}
```

---

## 🔔 Step 10: Register Webhooks

### 10.1 Register via API (Recommended)

```bash
curl -X POST http://localhost:3000/api/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "shop": "your-shop.myshopify.com",
    "webhookUrl": "https://abc123.ngrok.io"
  }'
```

Should return:
```json
{
  "success": true,
  "message": "Registered 2 webhooks",
  "webhooks": [...]
}
```

### 10.2 Verify in Shopify Admin

1. Go to your Shopify store admin
2. Navigate to **Settings** → **Notifications**
3. Scroll down to **Webhooks**
4. You should see:
   - `orders/create` → `https://abc123.ngrok.io/webhooks/orders/create`
   - `orders/update` → `https://abc123.ngrok.io/webhooks/orders/update`

---

## ✅ Step 11: Test the Integration

### 11.1 Create a Test Order

1. Go to your Shopify store admin
2. Navigate to **Orders** → **Create order**
3. Add a test product
4. Fill in customer details
5. Complete the order

### 11.2 Check Server Logs

In your server terminal, you should see:

```
Received webhook for new order: #1001
✅ Webhook verified: orders/create from your-shop.myshopify.com
Processing Shopify order: 1001
```

### 11.3 Check Order Tags

1. Go to **Orders** in Shopify admin
2. Open the test order
3. Check **Tags** section
4. Should see: `delybell-synced`, `delybell-order-id:xxx`

---

## 🐛 Troubleshooting

### Issue: "Invalid API credentials"

**Solution:**
- Double-check API Key and Secret in `.env`
- Make sure there are no extra spaces
- Verify credentials in Partners Dashboard

### Issue: "Redirect URI mismatch"

**Solution:**
- Check **Allowed redirection URL(s)** in app settings
- Must match exactly: `https://your-domain.com/auth/callback`
- Include protocol (`https://`) and full path

### Issue: "Shop not authenticated"

**Solution:**
- Re-install the app: `/auth/install?shop=your-shop.myshopify.com`
- Check session storage (sessions are in-memory, lost on restart)
- Verify `.env` file has correct credentials

### Issue: "ngrok URL changed"

**Solution:**
1. Copy new ngrok URL
2. Update Shopify app settings
3. Update `SHOPIFY_HOST` in `.env`
4. Re-register webhooks

### Issue: "Webhooks not firing"

**Solution:**
1. Check webhook registration: `GET /auth/check?shop=your-shop`
2. Verify webhook URL is accessible
3. Check ngrok inspector: `http://localhost:4040`
4. Verify webhooks in Shopify admin → Settings → Notifications

### Issue: "CORS errors"

**Solution:**
- Make sure you're using HTTPS (ngrok provides this)
- Check that App URL uses `https://` not `http://`

---

## 📚 Additional Resources

- **Shopify Partners Dashboard**: [https://partners.shopify.com/](https://partners.shopify.com/)
- **Shopify API Documentation**: [https://shopify.dev/docs/api](https://shopify.dev/docs/api)
- **ngrok Documentation**: [https://ngrok.com/docs](https://ngrok.com/docs)
- **Shopify App Development**: [https://shopify.dev/docs/apps](https://shopify.dev/docs/apps)

---

## 🎉 You're Done!

Your Shopify app is now set up and ready to:
- ✅ Authenticate with Shopify stores
- ✅ Receive webhooks for new orders
- ✅ Process orders and sync to Delybell
- ✅ Update order tags in Shopify

**Next Steps:**
1. Get the actual Delybell API URL from your client
2. Update `DELYBELL_API_URL` in `.env`
3. Configure address mapping
4. Test with real orders

---

## 📞 Quick Reference

### Important URLs

- **Partners Dashboard**: [https://partners.shopify.com/](https://partners.shopify.com/)
- **Your App**: `https://partners.shopify.com/[your-partner-id]/apps/[app-id]`
- **Development Store**: `https://your-store.myshopify.com/admin`

### Key Endpoints

- **Install App**: `GET /auth/install?shop=your-shop.myshopify.com`
- **Check Auth**: `GET /auth/check?shop=your-shop.myshopify.com`
- **Register Webhooks**: `POST /api/webhooks/register`
- **Health Check**: `GET /health`

---

**Need help?** Check the other guides:
- `QUICK_START_SHOPIFY.md` - Quick 5-minute setup
- `SHOPIFY_SETUP.md` - Complete integration guide
- `TESTING.md` - Test without Shopify

