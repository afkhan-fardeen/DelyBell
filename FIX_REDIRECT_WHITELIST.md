# 🔧 Fix Redirect URI Not Whitelisted

## The Problem

**Error**: "The redirect_uri is not whitelisted"

**Why**: The redirect URL must be added to Shopify app settings.

## ✅ Fix Steps

### Step 1: Go to Shopify Partners Dashboard

1. Go to: **https://partners.shopify.com/**
2. Click **"Apps"** in left sidebar
3. Open your app: **"Delybell Integration"**

### Step 2: Find OAuth Settings

Look for one of these sections:
- **"App setup"** tab
- **"OAuth"** section
- **"Allowed redirection URL(s)"** field
- **"Redirect URLs"** field

### Step 3: Add Redirect URL

Add this URL to the **"Allowed redirection URL(s)"** field:

```
http://localhost:3000/auth/callback
```

**Important**: 
- Must be exactly: `http://localhost:3000/auth/callback`
- Include `http://` (not `https://`)
- Include `/auth/callback` path

### Step 4: Save

Click **"Save"** button

### Step 5: Try Again

After saving, try installing again:

```
http://localhost:3000/auth/install?shop=delybell.myshopify.com
```

---

## 📋 Where to Find It

The redirect URL field is usually:
- In **"App setup"** tab
- Under **"OAuth"** or **"Redirect URLs"** section
- May be labeled as:
  - "Allowed redirection URL(s)"
  - "Redirect URLs"
  - "OAuth redirect URLs"

---

## ⚠️ Common Mistakes

❌ **Wrong**:
- `https://localhost:3000/auth/callback` (use http, not https)
- `localhost:3000/auth/callback` (missing http://)
- `http://localhost:3000` (missing /auth/callback)

✅ **Correct**:
- `http://localhost:3000/auth/callback`

---

**Add the redirect URL in Shopify app settings, then try again!** 🚀

