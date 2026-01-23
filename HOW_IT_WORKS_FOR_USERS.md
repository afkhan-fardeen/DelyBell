# How the App Works for Users

## 🎯 Can Anyone Install It?

**Yes!** Once the app is set to **"Public"** or **"App Store"** in Shopify Partner Dashboard, any Shopify store can install it.

---

## 📱 How Users See the App in Shopify Admin

### Before Installation:

1. **From Shopify App Store** (if published):
   - User searches for "Delybell Order Sync" in Shopify App Store
   - Clicks "Install" button
   - Goes through OAuth flow
   - App appears in their Shopify Admin → Apps

2. **Direct Installation** (if not in App Store yet):
   - User visits: `https://delybell.onrender.com/?shop=their-store.myshopify.com`
   - Sees the installation form
   - Enters their Shopify domain
   - Clicks "Install App"
   - Goes through OAuth flow
   - App appears in their Shopify Admin → Apps

### After Installation:

**In Shopify Admin:**
- App appears in **Apps** section (left sidebar)
- User clicks on "Delybell Order Sync"
- **Embedded app loads** - Your dashboard appears **inside** Shopify Admin
- URL shows: `admin.shopify.com/store/STORE-NAME/apps/DELYBELL-APP-ID`
- User sees **their own dashboard** with:
  - App Status (Installed ✓)
  - Their shop name
  - Their synced orders
  - Their order data

---

## 🖥️ What Each User Sees

### Each Store Gets Their Own Dashboard:

✅ **Separate sessions** - Each store has its own authentication session  
✅ **Separate data** - Each store only sees their own orders  
✅ **Separate webhooks** - Each store has their own webhook registrations  
✅ **Isolated** - Store A cannot see Store B's data  

### Dashboard Features:

1. **App Status Section:**
   - Installation Status: ✓ Installed
   - Shop: their-store.myshopify.com
   - Session Status: ✓ Active

2. **Synced Orders Section:**
   - Table showing **only their orders** that were synced to Delybell
   - Order numbers, customer info, Delybell order IDs
   - Tracking links (if available)
   - Refresh button to reload orders

3. **Guide Sections:**
   - "How It Works" - Explains automatic syncing
   - "Legal & Support" - Links to privacy policy, terms, support

---

## 🔄 Installation Flow for Users

### Step 1: User Finds the App
- **Option A:** From Shopify App Store (if published)
- **Option B:** Direct link: `https://delybell.onrender.com`

### Step 2: User Enters Their Domain
- User enters: `their-store.myshopify.com` or `their-store.com`
- App resolves it to Shopify domain
- User clicks "Install App"

### Step 3: OAuth Authorization
- Redirected to Shopify authorization page
- User grants permissions (read/write orders)
- Shopify redirects back to app

### Step 4: App Installs Automatically
- Session is created and stored
- Webhooks are registered automatically
- User is redirected to dashboard

### Step 5: Dashboard Appears
- User sees their dashboard **inside Shopify Admin**
- App is now in their Apps list
- Orders will sync automatically

---

## 📍 Where the App Appears

### In Shopify Partner Dashboard (Your Side):
- **App URL:** `https://delybell.onrender.com` (configured in Partner Dashboard)
- This is where Shopify loads the app from

### In User's Shopify Admin:
- **Apps Section:** Left sidebar → Apps → "Delybell Order Sync"
- **Embedded View:** App loads inside Shopify Admin (not in new tab)
- **URL Pattern:** `admin.shopify.com/store/STORE-NAME/apps/YOUR-APP-ID`

---

## 🎨 User Experience

### What Users DON'T See:
❌ Installation form after they've installed (they see dashboard instead)  
❌ Other stores' data  
❌ Technical details (webhooks, sessions, etc.)  
❌ Configuration screens (everything is automatic)  

### What Users DO See:
✅ Clean dashboard with their order data  
✅ Installation status  
✅ Synced orders table  
✅ Helpful guides  
✅ Support links  

---

## 🔐 Security & Isolation

### Each Store is Isolated:
- **Separate sessions** - Each store has unique access token
- **Separate data** - Orders are filtered by shop domain
- **Separate webhooks** - Each store's webhooks are registered separately
- **No cross-store access** - Store A cannot access Store B's data

### How It Works:
1. When user opens app in Shopify Admin, Shopify sends their shop domain
2. App checks: "Is this shop authenticated?"
3. If yes → Shows dashboard with **only their data**
4. If no → Shows installation prompt

---

## 📊 Summary

| Question | Answer |
|----------|--------|
| **Can anyone install?** | Yes, if app is set to "Public" or "App Store" |
| **Do they get a dashboard?** | Yes, each store gets their own dashboard |
| **Where do they see it?** | In Shopify Admin → Apps → "Delybell Order Sync" |
| **Is it embedded?** | Yes, loads inside Shopify Admin (not new tab) |
| **Do they see install form?** | Only if not installed yet |
| **Is data isolated?** | Yes, each store only sees their own data |
| **Is it automatic?** | Yes, orders sync automatically after installation |

---

## 🚀 Next Steps for Users

After installation, users just need to:
1. ✅ Open the app from Shopify Admin
2. ✅ View their synced orders
3. ✅ That's it! Orders sync automatically

No configuration needed - everything works automatically! 🎉
