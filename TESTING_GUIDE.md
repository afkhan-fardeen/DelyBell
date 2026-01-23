# Testing Guide for Delybell Order Sync App

## 🧪 Quick Test Checklist

### 1. Test Local Server (if running locally)

#### Start the server:
```bash
npm start
# or
npm run dev
```

#### Test Health Endpoint:
```bash
curl http://localhost:3000/health
```
**Expected:** `{"status":"ok","timestamp":"..."}`

---

### 2. Test Root Route (`/`)

**URL:** `http://localhost:3000/` or `https://delybell.onrender.com/`

**Expected:**
- Shows a simple page with message "Please access the app at:"
- Has a button/link to `/app`
- **No redirect** - just shows message

---

### 3. Test App Route (`/app`)

**URL:** `http://localhost:3000/app` or `https://delybell.onrender.com/app`

**Without shop parameter:**
- Shows installation prompt
- Has input field for shop domain
- Has "Install App" button

**With shop parameter:**
```bash
# Test URL
https://delybell.onrender.com/app?shop=your-store.myshopify.com
```

**Expected:**
- If shop is **not installed**: Shows "Installation Required" with install button
- If shop **is installed**: Shows dashboard with:
  - App Status (✓ Installed)
  - Shop name
  - Session Status (✓ Active)
  - Synced Orders table

---

### 4. Test OAuth Installation Flow

#### Step 1: Start Installation
**URL:** `https://delybell.onrender.com/auth/install?shop=your-store.myshopify.com`

**Expected:**
- Redirects to Shopify OAuth page
- Shows authorization screen
- Asks for permissions (read_orders, write_orders)

#### Step 2: Complete OAuth
- Click "Install" in Shopify
- Should redirect back to: `https://delybell.onrender.com/app?shop=your-store.myshopify.com`

#### Step 3: Verify Installation
**Check:** `https://delybell.onrender.com/auth/check?shop=your-store.myshopify.com`

**Expected Response:**
```json
{
  "success": true,
  "authenticated": true,
  "shop": "your-store.myshopify.com",
  "sessionId": "...",
  "expiresAt": "..."
}
```

---

### 5. Test API Endpoints

#### Health Check
```bash
curl https://delybell.onrender.com/health
```

#### Check App Status
```bash
curl "https://delybell.onrender.com/admin/api/status?shop=your-store.myshopify.com"
```

#### Get Synced Orders
```bash
curl "https://delybell.onrender.com/admin/api/synced-orders?shop=your-store.myshopify.com&limit=10"
```

---

### 6. Test from Shopify Admin

1. **Go to Shopify Admin**
   - Navigate to: `https://your-store.myshopify.com/admin`

2. **Install the App**
   - Go to Apps → Find "Delybell Order Sync"
   - Click "Install"
   - Complete OAuth flow

3. **Open the App**
   - Click on "Delybell Order Sync" in Apps list
   - Should load: `https://delybell.onrender.com/app`
   - Should show dashboard (not installation prompt)

4. **Verify Shop Detection**
   - App should automatically detect shop from Shopify context
   - No need to manually enter shop domain

---

### 7. Test Order Sync

#### Create Test Order in Shopify
1. Go to Shopify Admin → Orders
2. Create a test order with:
   - Shipping address (must include Block/Road/Building info)
   - Any products
   - Complete checkout

#### Verify Webhook Processing
1. Check Render logs for webhook processing
2. Check order tags in Shopify - should have:
   - `delybell-synced`
   - `delybell-order-id:XXXX`
   - `delybell-tracking:URL` (if available)

#### Check Synced Orders in App
1. Open app dashboard
2. Go to "Synced Orders" section
3. Should see the test order listed

---

### 8. Test Error Scenarios

#### Invalid Shop Domain
**URL:** `https://delybell.onrender.com/app?shop=invalid-domain`

**Expected:** Error message or installation prompt

#### Missing Shop Parameter
**URL:** `https://delybell.onrender.com/app`

**Expected:** Installation prompt with input field

#### Uninstalled Shop
**URL:** `https://delybell.onrender.com/app?shop=uninstalled-store.myshopify.com`

**Expected:** "Installation Required" message with install button

---

## 🐛 Common Issues & Solutions

### Issue: "Installation Required" after installing
**Solution:**
- Check if shop parameter is in URL
- Verify session was stored correctly
- Check Render logs for errors
- Try reinstalling the app

### Issue: Shop not detected in embedded app
**Solution:**
- Ensure App Bridge is initialized correctly
- Check browser console for errors
- Verify `SHOPIFY_API_KEY` is set correctly
- Check Shopify headers are being passed

### Issue: Orders not syncing
**Solution:**
- Verify webhooks are registered
- Check webhook URLs in Shopify Partner Dashboard
- Check Render logs for webhook errors
- Verify Delybell API credentials

---

## ✅ Testing Checklist

- [ ] Health endpoint works (`/health`)
- [ ] Root route (`/`) shows message (no redirect)
- [ ] App route (`/app`) loads correctly
- [ ] Installation prompt shows when shop not provided
- [ ] OAuth installation flow works
- [ ] App detects shop from Shopify Admin context
- [ ] Dashboard shows when app is installed
- [ ] Session is stored correctly after installation
- [ ] Webhooks are registered automatically
- [ ] Orders sync to Delybell
- [ ] Synced orders appear in dashboard
- [ ] Error handling works correctly

---

## 📝 Notes

- **Local Testing:** Use `http://localhost:3000` (if server running locally)
- **Production Testing:** Use `https://delybell.onrender.com`
- **Shopify Admin:** App should be accessible from Shopify Admin → Apps
- **Webhooks:** Test with real orders in Shopify store
- **Logs:** Check Render logs for debugging

---

**Ready to test?** Start with the health endpoint and work through each step! 🚀
