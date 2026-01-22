# Deployment URLs Reference

**Your app is live at:** [https://delybell.onrender.com](https://delybell.onrender.com)

---

## 🔗 Important URLs

### Main App
- **App URL:** `https://delybell.onrender.com/app`
- **API Root:** `https://delybell.onrender.com/`
- **Health Check:** `https://delybell.onrender.com/health`

### OAuth & Authentication
- **Install:** `https://delybell.onrender.com/auth/install?shop=store.myshopify.com`
- **Callback:** `https://delybell.onrender.com/auth/callback`
- **Check Status:** `https://delybell.onrender.com/auth/check?shop=store.myshopify.com`

### Webhooks
- **Orders Create:** `https://delybell.onrender.com/webhooks/orders/create`
- **Orders Update:** `https://delybell.onrender.com/webhooks/orders/update`
- **App Uninstall:** `https://delybell.onrender.com/webhooks/app/uninstalled`

### Legal Pages
- **Privacy Policy:** `https://delybell.onrender.com/privacy-policy.html`
- **Terms of Service:** `https://delybell.onrender.com/terms-of-service.html`

### API Endpoints
- **Sync Orders:** `POST https://delybell.onrender.com/api/sync-orders`
- **Process Order:** `POST https://delybell.onrender.com/api/process-order/:orderId`
- **Service Types:** `GET https://delybell.onrender.com/api/service-types`
- **Track Order:** `GET https://delybell.onrender.com/api/track/:orderId`

---

## ⚙️ Shopify Partner Dashboard Configuration

### App Setup
- **App URL:** `https://delybell.onrender.com/app`
- **Allowed redirection URL(s):** `https://delybell.onrender.com/auth/callback`

### Webhooks
- `orders/create` → `https://delybell.onrender.com/webhooks/orders/create`
- `orders/updated` → `https://delybell.onrender.com/webhooks/orders/update`
- `app/uninstalled` → `https://delybell.onrender.com/webhooks/app/uninstalled`

### Environment Variable
In Render dashboard, set:
```
SHOPIFY_HOST=delybell.onrender.com
```

---

## ✅ Verification Checklist

- [ ] Health check works: [https://delybell.onrender.com/health](https://delybell.onrender.com/health)
- [ ] App loads: [https://delybell.onrender.com/app](https://delybell.onrender.com/app)
- [ ] Privacy Policy accessible: [https://delybell.onrender.com/privacy-policy.html](https://delybell.onrender.com/privacy-policy.html)
- [ ] Terms accessible: [https://delybell.onrender.com/terms-of-service.html](https://delybell.onrender.com/terms-of-service.html)
- [ ] Shopify app configured with correct URLs
- [ ] Webhooks registered in Shopify Partner Dashboard
- [ ] `SHOPIFY_HOST` environment variable set in Render

---

**Last Updated:** App deployed and live on Render
