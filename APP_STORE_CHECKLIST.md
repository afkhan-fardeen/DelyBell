# Shopify App Store Publishing Checklist

Quick reference checklist for publishing the Delybell Integration app to Shopify App Store.

## Pre-Submission Checklist

### ✅ Partner Account Setup
- [ ] Shopify Partner account created
- [ ] Partner profile completed
- [ ] Support email configured
- [ ] Support URL configured (optional)

### ✅ App Creation
- [ ] App created in Partner Dashboard
- [ ] API Key obtained
- [ ] API Secret obtained
- [ ] App name: "Delybell Integration"
- [ ] App type: Public App
- [ ] Pricing: Free

### ✅ App Configuration
- [ ] App URL: `https://your-production-domain.com`
- [ ] Callback URL: `https://your-production-domain.com/auth/callback`
- [ ] Webhook URL: `https://your-production-domain.com/webhooks/orders/create`
- [ ] Scopes: `read_orders`, `write_orders`
- [ ] Environment variables updated in production

### ✅ OAuth Flow
- [ ] OAuth install route works (`/auth/install`)
- [ ] OAuth callback route works (`/auth/callback`)
- [ ] Success page displays (`/auth/success`)
- [ ] Sessions are stored correctly
- [ ] Test installation completes successfully

### ✅ Webhook Configuration
- [ ] `orders/create` webhook registered
- [ ] `orders/updated` webhook registered
- [ ] Webhook HMAC verification enabled
- [ ] Webhooks receiving test orders
- [ ] Orders processing correctly

### ✅ Functionality Testing
- [ ] Test order created in Shopify
- [ ] Order received via webhook
- [ ] Address parsed correctly
- [ ] Order created in Delybell
- [ ] Tracking info updated in Shopify
- [ ] Error handling works
- [ ] Invalid addresses rejected gracefully

### ✅ App Listing Content
- [ ] App name: "Delybell Integration"
- [ ] Tagline (80 chars max)
- [ ] Description (500 words max)
- [ ] Category selected
- [ ] Pricing set to "Free"
- [ ] Support email provided
- [ ] Privacy policy URL provided
- [ ] Terms of service URL provided

### ✅ App Store Assets
- [ ] App icon (1200x1200px)
- [ ] Screenshot 1 (1200x630px)
- [ ] Screenshot 2 (1200x630px)
- [ ] Screenshot 3 (1200x630px)
- [ ] Promotional banner (optional)
- [ ] Demo video (optional)

### ✅ Legal & Compliance
- [ ] Privacy policy published and accessible
- [ ] Terms of service published and accessible
- [ ] Support email monitored
- [ ] GDPR compliance (if applicable)
- [ ] Data handling disclosed

### ✅ Production Readiness
- [ ] Server deployed and running
- [ ] HTTPS/SSL enabled
- [ ] Domain configured
- [ ] Environment variables set
- [ ] Database configured (if using)
- [ ] Logging configured
- [ ] Error tracking configured
- [ ] Monitoring configured

### ✅ Testing
- [ ] Install app in test store
- [ ] Create test order
- [ ] Verify order syncs to Delybell
- [ ] Check tracking appears in Shopify
- [ ] Test error scenarios
- [ ] Verify all endpoints work
- [ ] Test with multiple stores (if applicable)

## Submission Checklist

### Before Submitting
- [ ] All items above checked
- [ ] App tested in production environment
- [ ] No console errors
- [ ] No broken links
- [ ] Support email responds within 24 hours

### Review Notes Template
```
App Name: Delybell Integration
App Type: Public App (Free)

Description:
Automatically syncs Shopify orders to Delybell delivery management system.

Testing Instructions:
1. Install app in test store: test-store.myshopify.com
2. Create order with address: "Building 134, Road 354, Block 306"
3. Verify order appears in Delybell dashboard
4. Check Shopify order tags for Delybell order ID

Test Credentials:
[If required - provide test store credentials]

Notes:
- App is free with no revenue model
- Requires Delybell account with API access
- Shipping addresses must include Block and Road numbers
```

## Post-Submission

### After Submission
- [ ] Monitor Partner Dashboard for updates
- [ ] Respond to Shopify feedback promptly
- [ ] Make requested changes if needed
- [ ] Resubmit if rejected

### After Approval
- [ ] App goes live automatically
- [ ] Monitor installations
- [ ] Watch for errors
- [ ] Respond to support requests
- [ ] Track metrics

## Quick Reference

### Required URLs
```
App URL: https://your-production-domain.com
Callback: https://your-production-domain.com/auth/callback
Webhook: https://your-production-domain.com/webhooks/orders/create
```

### Required Environment Variables
```env
SHOPIFY_API_KEY=<from_partner_dashboard>
SHOPIFY_API_SECRET=<from_partner_dashboard>
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=your-production-domain.com
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=<your_key>
DELYBELL_SECRET_KEY=<your_secret>
```

### Key Files
- `server.js` - Main entry point
- `routes/auth.js` - OAuth flow
- `routes/webhooks.js` - Webhook handlers
- `services/orderProcessor.js` - Order processing
- `middleware/webhookVerification.js` - Security

### Partner Dashboard Links
- Dashboard: https://partners.shopify.com
- App Settings: Partners → Apps → Your App → Configuration
- App Store Listing: Partners → Apps → Your App → App Store listing

## Timeline

- **Setup**: 1-2 days
- **Testing**: 2-3 days
- **Submission**: 1 day
- **Review**: 3-5 business days
- **Revisions** (if needed): 2-3 days per revision
- **Total**: ~1-2 weeks

## Support

- [Shopify Partner Docs](https://shopify.dev/docs/apps)
- [App Store Requirements](https://shopify.dev/docs/apps/store/requirements)
- [Partner Support](https://partners.shopify.com/support)

---

**Ready?** Follow [SHOPIFY_APP_STORE_GUIDE.md](./SHOPIFY_APP_STORE_GUIDE.md) for detailed steps!
