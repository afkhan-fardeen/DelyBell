# Localhost Setup Guide

This guide shows how to set up the Shopify app using `localhost` instead of ngrok.

## ✅ Advantages of Using Localhost

- ✅ No need for ngrok or tunneling services
- ✅ URL never changes
- ✅ Faster development
- ✅ No password pages or tunnel issues

## ⚠️ Limitations

- ⚠️ Webhooks won't work (Shopify can't reach localhost)
- ⚠️ Only works for OAuth installation
- ⚠️ For webhooks, you'll need ngrok or a public URL

---

## 🔹 Step 1: Update .env File

Make sure your `.env` file has:

```env
SHOPIFY_HOST=localhost:3000
```

**Important:**
- ✅ **WITHOUT** `https://` or `http://`
- ✅ Just: `localhost:3000`

---

## 🔹 Step 2: Update Shopify App Settings

Go to: **DelyBell Integration → Versions → Active version → Configuration**

Set these values:

| Field | Value |
|-------|-------|
| **App URL** | `http://localhost:3000` |
| **Redirect URLs** | `http://localhost:3000/auth/callback` |
| **Legacy install flow** | `true` |
| **Embedded** | `true` |
| **Scopes** | `read_orders,write_orders` |

**Important:**
- ✅ Use `http://` (not `https://`) for localhost
- ✅ Must include `/auth/callback` in Redirect URLs
- ✅ No trailing slashes

---

## 🔹 Step 3: Release the Version

**CRITICAL:** After updating settings, click **"Release"** button.

Changes won't take effect until you release!

---

## 🔹 Step 4: Start Your Server

```bash
npm start
```

You should see:
```
Server running on port 3000
```

---

## 🔹 Step 5: Install the App

Open your browser and visit:

```
http://localhost:3000/auth/install?shop=delybell.myshopify.com
```

**What happens:**
1. Shopify will show permission screen → click **Install**
2. After install, you'll be redirected to: `/auth/callback?code=xxx&shop=delybell.myshopify.com&hmac=xxx`
3. Your app validates HMAC → exchanges code for access token → redirects to `/auth/success`

✅ **At this point, the app is fully installed!**

---

## 🔹 Step 6: Verify Configuration

Check your OAuth configuration:

```
http://localhost:3000/auth/debug/config
```

You should see:
```json
{
  "hostName": "localhost:3000",
  "redirectUrl": "http://localhost:3000/auth/callback",
  "protocol": "http",
  "message": "Make sure this redirectUrl matches EXACTLY in Shopify app settings",
  "note": "Using http:// for localhost (Shopify allows this for custom apps)"
}
```

---

## 🔍 Troubleshooting

### "redirect_uri is not whitelisted"

1. **Check `.env` file:**
   ```env
   SHOPIFY_HOST=localhost:3000
   ```
   (No `https://` or `http://`)

2. **Check Shopify app settings:**
   - Redirect URLs: `http://localhost:3000/auth/callback`
   - App URL: `http://localhost:3000`

3. **Did you click "Release"?**
   - Always click "Release" after updating settings

4. **Restart your server:**
   ```bash
   npm start
   ```

### "Shop not authenticated"

- Make sure you completed OAuth installation first
- Visit `/auth/install?shop=delybell.myshopify.com` again

---

## 📝 Quick Checklist

- [ ] `.env` has `SHOPIFY_HOST=localhost:3000` (no `http://`)
- [ ] Shopify app settings has:
  - App URL: `http://localhost:3000`
  - Redirect URLs: `http://localhost:3000/auth/callback`
- [ ] Clicked "Release" after updating Shopify settings
- [ ] Server is running: `npm start`
- [ ] Visiting: `http://localhost:3000/auth/install?shop=delybell.myshopify.com`

---

## 🚨 Important Notes

### Webhooks Won't Work with Localhost

Shopify **cannot** send webhooks to `localhost:3000` because it's not accessible from the internet.

**Options:**
1. **Use ngrok for webhooks only** (after OAuth is done)
2. **Use API endpoints** to manually sync orders
3. **Deploy to a public server** for production

### For Webhooks (After OAuth)

If you need webhooks, you can:
1. Complete OAuth with localhost (as above)
2. Then use ngrok just for webhooks:
   ```bash
   ngrok http 3000
   ```
3. Register webhooks using the ngrok URL:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/register \
     -H "Content-Type: application/json" \
     -d '{"shop": "delybell.myshopify.com", "webhookUrl": "https://YOUR-NGROK-URL"}'
   ```

---

## ✅ Success!

Once OAuth is complete, you can:
- ✅ Use API endpoints to sync orders
- ✅ Test order processing
- ✅ Use Delybell API integration

For webhooks, you'll need a public URL (ngrok or deployed server).

