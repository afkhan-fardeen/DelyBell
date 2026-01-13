# 🔧 Fix Redirect URI for Custom App

## Custom App vs Partners App

You're using a **custom app** (created in store admin), not a Partners app. The settings are different!

## ✅ Fix Steps for Custom App

### Step 1: Go to Your Store Admin

1. Go to: **https://delybell.myshopify.com/admin**
2. Log in

### Step 2: Find App Settings

1. Go to **"Settings"** (bottom left)
2. Click **"Apps and sales channels"**
3. Click **"Develop apps"** (at the bottom)
4. Find your app: **"Delybell Integration"**
5. Click on it

### Step 3: Configure OAuth Redirect URL

1. In your app, look for:
   - **"Configuration"** tab
   - **"OAuth"** section
   - **"Allowed redirection URL(s)"** field
   - Or **"Redirect URLs"** field

2. Add this URL:
   ```
   http://localhost:3000/auth/callback
   ```

3. Click **"Save"**

### Step 4: Alternative - Check API Credentials Section

If you don't see OAuth settings:
1. Go to **"API credentials"** tab
2. Look for redirect URL settings
3. Add: `http://localhost:3000/auth/callback`

### Step 5: Try Installing Again

After saving:
```
http://localhost:3000/auth/install?shop=delybell.myshopify.com
```

---

## 📋 Quick Path

**Store Admin** → **Settings** → **Apps and sales channels** → **Develop apps** → **Your App** → **Configuration** → **Add Redirect URL**

---

## ⚠️ Important

For custom apps, the redirect URL might be:
- Set when creating the app
- In the app's configuration
- In API credentials section

**Add**: `http://localhost:3000/auth/callback`

---

**Go to your store admin and add the redirect URL!** 🚀

