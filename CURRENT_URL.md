# 🌐 Current ngrok URL

## Your ngrok URL

**URL**: `https://semisubterranean-racheal-ungloomy.ngrok-free.dev`

## 📋 Update These

### 1. Update .env File

Edit `.env` and set:
```env
SHOPIFY_HOST=semisubterranean-racheal-ungloomy.ngrok-free.dev
```

### 2. Update Shopify App Settings

- **App URL**: `http://localhost:3000` (use localhost!)
- **Redirect URL**: `http://localhost:3000/auth/callback` (use localhost!)

**Why localhost?** OAuth works better with localhost, and it never changes!

### 3. Install App

Visit:
```
http://localhost:3000/auth/install?shop=delybell.myshopify.com
```

### 4. Register Webhooks

After installing, run:
```bash
./register-webhooks.sh
```

This will register webhooks with: `https://semisubterranean-racheal-ungloomy.ngrok-free.dev`

---

## ⚠️ Note

**Free plan**: URL changes each time you restart ngrok. If it changes:
1. Update `.env` with new URL
2. Re-run `./register-webhooks.sh`

**OAuth stays on localhost** - never changes! ✅

---

**Update .env and Shopify settings, then install app!** 🚀

