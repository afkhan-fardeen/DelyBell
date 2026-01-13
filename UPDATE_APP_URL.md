# 🔧 Update App URL in Shopify

## Current Status

✅ **Redirect URL**: Already set! (`http://localhost:3000/auth/callback`)
⚠️ **App URL**: Needs to be updated (`https://example.com` → `http://localhost:3000`)

## ✅ Fix Steps

### Step 1: Update App URL

In the app configuration page you're seeing:

1. Find **"App URL"** field
2. Change from: `https://example.com`
3. Change to: `http://localhost:3000`

**Important**:
- Use `http://` (not `https://`)
- Use `localhost:3000` (not example.com)

### Step 2: Optional Settings

- **Embed app in Shopify admin**: Check this if you want embedded app
- **Preferences URL**: Can leave empty or set to `http://localhost:3000`

### Step 3: Save

Click **"Save"** or **"Create version"** button

### Step 4: Try Installing

After saving:
```
http://localhost:3000/auth/install?shop=delybell.myshopify.com
```

---

## 📋 Complete Settings

- **App URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback` ✅ (already set!)
- **Preferences URL**: `http://localhost:3000` (optional)

---

**Update App URL to localhost:3000 and save!** 🚀

