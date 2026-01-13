# Fix: "redirect_uri is not whitelisted" Error

## 🔍 What This Error Means

Shopify is saying the redirect URL in your OAuth request doesn't match what's configured in your Shopify app settings.

## ✅ Step-by-Step Fix

### 1️⃣ Check Your Current Configuration

Visit this URL to see what redirect URL your app is using:

```
https://YOUR-NGROK-URL/auth/debug/config
```

Example output:
```json
{
  "hostName": "semisubterranean-racheal-ungloomy.ngrok-free.dev",
  "redirectUrl": "https://semisubterranean-racheal-ungloomy.ngrok-free.dev/auth/callback",
  "callbackPath": "/auth/callback",
  "apiKey": "d19d0cec...",
  "message": "Make sure this redirectUrl matches EXACTLY in Shopify app settings"
}
```

**Copy the `redirectUrl` value** - this is what your app is sending to Shopify.

---

### 2️⃣ Check Your .env File

Make sure your `.env` file has:

```env
SHOPIFY_HOST=semisubterranean-racheal-ungloomy.ngrok-free.dev
```

**Important:**
- ✅ **WITHOUT** `https://`
- ✅ **WITHOUT** trailing slash
- ✅ Just the domain: `semisubterranean-racheal-ungloomy.ngrok-free.dev`

---

### 3️⃣ Update Shopify App Settings

Go to: **DelyBell Integration → Versions → Active version → Configuration**

Find **"Redirect URLs"** field and add:

```
https://semisubterranean-racheal-ungloomy.ngrok-free.dev/auth/callback
```

**Important:**
- ✅ Must start with `https://`
- ✅ Must include `/auth/callback` at the end
- ✅ Must match EXACTLY (no trailing slash, no extra spaces)

---

### 4️⃣ Update App URL (if needed)

Also set **"App URL"** to:

```
https://semisubterranean-racheal-ungloomy.ngrok-free.dev
```

---

### 5️⃣ Release the Version

**CRITICAL:** After updating settings, you MUST:

1. Click **"Release"** button
2. Wait for confirmation
3. Then try installing again

**If you don't release, changes won't take effect!**

---

### 6️⃣ Restart Your Server

After updating `.env`, restart your Node server:

```bash
# Stop server (Ctrl+C)
# Then restart:
npm start
```

---

### 7️⃣ Try Installing Again

Visit:

```
https://semisubterranean-racheal-ungloomy.ngrok-free.dev/auth/install?shop=delybell.myshopify.com
```

---

## 🔍 Common Mistakes

### ❌ Wrong: Redirect URL has trailing slash
```
https://semisubterranean-racheal-ungloomy.ngrok-free.dev/auth/callback/
```
**Fix:** Remove the trailing slash

### ❌ Wrong: Redirect URL uses http:// instead of https://
```
http://semisubterranean-racheal-ungloomy.ngrok-free.dev/auth/callback
```
**Fix:** Use `https://`

### ❌ Wrong: SHOPIFY_HOST includes https://
```env
SHOPIFY_HOST=https://semisubterranean-racheal-ungloomy.ngrok-free.dev
```
**Fix:** Remove `https://` from `.env`

### ❌ Wrong: Forgot to Release version
**Fix:** Always click "Release" after updating settings

### ❌ Wrong: Ngrok URL changed but didn't update
**Fix:** If you restarted ngrok, update both `.env` and Shopify settings with the new URL

---

## 🧪 Verify It's Fixed

1. Check debug endpoint: `https://YOUR-NGROK-URL/auth/debug/config`
2. Compare `redirectUrl` with Shopify app settings
3. They must match EXACTLY (character by character)

---

## 📝 Quick Checklist

- [ ] `.env` has `SHOPIFY_HOST` without `https://`
- [ ] Shopify app settings has redirect URL with `https://` and `/auth/callback`
- [ ] Clicked "Release" after updating Shopify settings
- [ ] Restarted Node server after updating `.env`
- [ ] Ngrok is running and URL matches everywhere
- [ ] Redirect URLs match EXACTLY (no trailing slashes, no extra spaces)

---

## 🆘 Still Not Working?

1. **Check server logs** - Look for the exact redirect URL being sent
2. **Check Shopify app settings** - Copy/paste the redirect URL to ensure no hidden characters
3. **Try clearing browser cache** - Sometimes old redirects are cached
4. **Verify ngrok is running** - Make sure ngrok URL is still active

