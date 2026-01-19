# Shopify App Store Publishing Guide

Complete guide to publish the Delybell Integration app as a **public, free app** on the Shopify App Store.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Shopify Partner Account Setup](#step-1-shopify-partner-account-setup)
4. [Step 2: Create App in Partner Dashboard](#step-2-create-app-in-partner-dashboard)
5. [Step 3: Configure App Settings](#step-3-configure-app-settings)
6. [Step 4: Prepare App Listing](#step-4-prepare-app-listing)
7. [Step 5: App Store Assets](#step-5-app-store-assets)
8. [Step 6: Testing & Submission](#step-6-testing--submission)
9. [Step 7: App Review Process](#step-7-app-review-process)
10. [Step 8: Post-Launch](#step-8-post-launch)
11. [File Structure Reference](#file-structure-reference)

---

## Overview

This guide walks you through publishing the Delybell Integration app to the Shopify App Store as a **public, free app** with **no revenue model**. This allows any Shopify merchant to install and use the app without payment.

### App Type: Public App (Free)

- ✅ **Public**: Available to all Shopify merchants
- ✅ **Free**: No charges, subscriptions, or revenue model
- ✅ **OAuth**: Standard Shopify OAuth flow
- ✅ **Webhooks**: Automatic order processing

---

## Prerequisites

Before starting, ensure you have:

- [ ] Shopify Partner account (free to create)
- [ ] Production server deployed (Heroku, AWS, etc.)
- [ ] Domain name with SSL certificate
- [ ] App tested and working in production
- [ ] Delybell API credentials (for app functionality)
- [ ] App screenshots and marketing materials

---

## Step 1: Shopify Partner Account Setup

### 1.1 Create Partner Account

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click **Sign up**
3. Fill in your details:
   - Company name: "Delybell" (or your company name)
   - Email address
   - Password
4. Verify your email

### 1.2 Complete Partner Profile

1. Go to **Settings** → **Account**
2. Complete your profile:
   - Company information
   - Contact details
   - Support email
   - Support URL (optional)

### 1.3 Enable App Development

1. Go to **Apps** in Partner Dashboard
2. Click **Create app**
3. You'll be prompted to accept terms (if first time)

---

## Step 2: Create App in Partner Dashboard

### 2.1 Create New App

1. In Partner Dashboard, go to **Apps**
2. Click **Create app**
3. Choose **Create app manually** (not CLI)
4. Fill in:
   - **App name**: "Delybell Integration" (or "Delybell Order Sync")
   - **App URL**: `https://your-production-domain.com`
   - **Allowed redirection URL(s)**: 
     ```
     https://your-production-domain.com/auth/callback
     ```
5. Click **Create app**

### 2.2 Get App Credentials

After creating the app, you'll receive:
- **API Key** (Client ID)
- **API Secret Key** (Client Secret)

**Save these immediately!** You'll need them for your `.env` file.

### 2.3 Configure App Scopes

1. Go to **Configuration** → **Scopes**
2. Add required scopes:
   - ✅ `read_orders` - Read orders
   - ✅ `write_orders` - Update orders (for tags/notes)
3. Click **Save**

**Note:** Only request scopes you actually use. Don't request unnecessary permissions.

---

## Step 3: Configure App Settings

### 3.1 App URLs

In Partner Dashboard → **Configuration** → **App URLs**:

**App URL:**
```
https://your-production-domain.com
```

**Allowed redirection URL(s):**
```
https://your-production-domain.com/auth/callback
https://your-production-domain.com/auth/success
```

**Webhook URL:**
```
https://your-production-domain.com/webhooks/orders/create
```

### 3.2 Webhook Configuration

1. Go to **Configuration** → **Webhooks**
2. Click **Create webhook**
3. Configure webhooks:

**Webhook 1: Order Creation**
- **Event**: `orders/create`
- **Format**: JSON
- **URL**: `https://your-production-domain.com/webhooks/orders/create`

**Webhook 2: Order Update**
- **Event**: `orders/updated` (Shopify's topic name)
- **Format**: JSON
- **URL**: `https://your-production-domain.com/webhooks/orders/update` (our endpoint route)

4. Click **Save** for each webhook

### 3.3 Update Environment Variables

Update your production `.env` file:

```env
# Shopify Configuration (from Partner Dashboard)
SHOPIFY_API_KEY=your_app_api_key_from_partner_dashboard
SHOPIFY_API_SECRET=your_app_api_secret_from_partner_dashboard
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=your-production-domain.com

# Delybell API Configuration
DELYBELL_API_URL=https://new.api.delybell.com
DELYBELL_ACCESS_KEY=your_delybell_access_key
DELYBELL_SECRET_KEY=your_delybell_secret_key

# Server Configuration
NODE_ENV=production
PORT=3000
```

### 3.4 Test OAuth Flow

1. Visit: `https://your-production-domain.com/auth/install?shop=your-test-store.myshopify.com`
2. Complete OAuth flow
3. Verify redirect to success page
4. Check that session is stored

---

## Step 4: Prepare App Listing

### 4.1 App Listing Information

Go to **App Store listing** in Partner Dashboard and prepare:

**App Name:**
```
Delybell Integration
```

**Tagline (80 characters max):**
```
Automatically sync Shopify orders to Delybell for seamless delivery management
```

**Description (500 words max):**
```
Delybell Integration automatically syncs orders from your Shopify store to Delybell's delivery management system. When customers place orders, they are instantly processed and dispatched through Delybell.

Key Features:
• Automatic order synchronization via webhooks
• Real-time order processing
• Address parsing and validation
• Automatic tracking updates in Shopify
• Support for multiple stores
• No manual intervention required

How It Works:
1. Customer places order in your Shopify store
2. Order is automatically received via webhook
3. Shipping address is parsed and validated
4. Order is created in Delybell system
5. Tracking information is updated in Shopify

Perfect for merchants using Delybell for delivery services who want seamless integration with their Shopify store.

Requirements:
• Delybell account with API access
• Shipping addresses must include Block and Road numbers
```

**Category:**
- Select: **Shipping & delivery** or **Order management**

**Pricing:**
- Select: **Free**

**Support Email:**
```
support@delybell.com
```

**Support URL (optional):**
```
https://delybell.com/support
```

**Privacy Policy URL:**
```
https://your-domain.com/privacy-policy
```

**Terms of Service URL:**
```
https://your-domain.com/terms-of-service
```

### 4.2 App Features

List key features:
- ✅ Automatic order sync
- ✅ Real-time processing
- ✅ Address validation
- ✅ Tracking updates
- ✅ Multi-store support

---

## Step 5: App Store Assets

### 5.1 Required Images

**App Icon:**
- Size: 1200 x 1200 pixels
- Format: PNG or JPG
- Square, no rounded corners
- High quality, professional design
- Should represent Delybell brand

**Screenshots (Required: 3-5 images):**
- Size: 1200 x 630 pixels (or 1200 x 800)
- Format: PNG or JPG
- Show app functionality

**Screenshot Ideas:**
1. **Dashboard View**: Show order sync status
2. **Order Processing**: Show order being processed
3. **Tracking Update**: Show tracking info in Shopify
4. **Settings Page**: Show configuration options
5. **Success Message**: Show installation success

**Promotional Banner (Optional):**
- Size: 1200 x 600 pixels
- Format: PNG or JPG

### 5.2 Video (Optional but Recommended)

**App Demo Video:**
- Duration: 30-60 seconds
- Show: Installation → Order creation → Order sync → Tracking update
- Upload to YouTube/Vimeo
- Add URL in listing

### 5.3 Marketing Copy

**Short Description (200 characters):**
```
Automatically sync Shopify orders to Delybell. Real-time order processing, address validation, and tracking updates.
```

**Keywords:**
```
delybell, delivery, shipping, order sync, logistics, fulfillment, courier
```

---

## Step 6: Testing & Submission

### 6.1 Pre-Submission Checklist

Before submitting, verify:

- [ ] App works in production environment
- [ ] OAuth flow completes successfully
- [ ] Webhooks are receiving orders
- [ ] Orders are being created in Delybell
- [ ] Tracking updates appear in Shopify
- [ ] Error handling works correctly
- [ ] App handles invalid addresses gracefully
- [ ] Privacy policy is published
- [ ] Terms of service are published
- [ ] Support email is monitored
- [ ] All app store assets are ready

### 6.2 Test Installation Flow

1. **Create test Shopify store** (if you don't have one)
2. **Install app** via App Store listing (test mode)
3. **Create test order** with valid address
4. **Verify order syncs** to Delybell
5. **Check tracking** appears in Shopify
6. **Test error scenarios** (invalid address, etc.)

### 6.3 Submit for Review

1. Go to **App Store listing** → **Submit for review**
2. Fill in review notes:
   ```
   This app automatically syncs Shopify orders to Delybell delivery system.
   
   Testing Instructions:
   1. Install app in test store
   2. Create order with address: "Building 134, Road 354, Block 306"
   3. Verify order appears in Delybell dashboard
   4. Check Shopify order tags for Delybell order ID
   
   Test Store: your-test-store.myshopify.com
   Test Credentials: [if required]
   ```
3. Click **Submit for review**

### 6.4 Review Timeline

- **Initial Review**: 3-5 business days
- **Revisions**: 2-3 business days per revision
- **Total**: Typically 1-2 weeks

---

## Step 7: App Review Process

### 7.1 What Shopify Reviews

Shopify will check:
- ✅ App functionality works as described
- ✅ OAuth flow completes successfully
- ✅ Webhooks are properly configured
- ✅ App doesn't break Shopify functionality
- ✅ Privacy policy and terms are accessible
- ✅ Support contact is responsive
- ✅ App follows Shopify design guidelines
- ✅ No security vulnerabilities

### 7.2 Common Rejection Reasons

**Address:**
- App doesn't handle errors gracefully
- Missing error messages
- Poor user experience

**Fix:** Ensure comprehensive error handling and clear messages.

**OAuth Issues:**
- OAuth flow doesn't complete
- Session storage issues
- Redirect URLs incorrect

**Fix:** Test OAuth thoroughly in production.

**Webhook Issues:**
- Webhooks not receiving data
- Webhook verification failing
- Missing HMAC verification

**Fix:** Ensure webhook middleware is enabled.

### 7.3 Responding to Feedback

If Shopify requests changes:
1. **Read feedback carefully**
2. **Make requested changes**
3. **Test thoroughly**
4. **Resubmit with notes** explaining changes

---

## Step 8: Post-Launch

### 8.1 After Approval

Once approved:
1. **App goes live** on Shopify App Store
2. **Merchants can install** via App Store
3. **Monitor installations** in Partner Dashboard
4. **Watch for errors** in logs
5. **Respond to support requests**

### 8.2 Monitoring

**Key Metrics to Track:**
- Installations per day
- Active stores
- Orders processed
- Error rates
- Support requests

**Tools:**
- Partner Dashboard analytics
- Application logs
- Error tracking (Sentry)
- Support email

### 8.3 Updates & Maintenance

**When to Update:**
- Bug fixes
- New features
- Security patches
- Shopify API changes

**Update Process:**
1. Make changes
2. Test thoroughly
3. Submit update for review
4. Wait for approval
5. Deploy to production

---

## File Structure Reference

### Required Files for App Store

```
DelyBell/
├── server.js                    # Main server (required)
├── package.json                 # Dependencies (required)
├── routes/
│   ├── auth.js                 # OAuth flow (required)
│   ├── webhooks.js             # Webhook handlers (required)
│   └── api.js                  # API endpoints (optional)
├── services/
│   ├── shopifyClient.js        # Shopify API client (required)
│   ├── delybellClient.js       # Delybell API client (required)
│   └── orderProcessor.js       # Order processing (required)
├── middleware/
│   └── webhookVerification.js  # Webhook security (required)
├── .env                        # Environment variables (not in git)
├── env.example                 # Environment template (in git)
└── README.md                   # Documentation (helpful)
```

### Files NOT Required for App Store

- Test files (`/test` directory)
- Documentation files (`.md` files)
- Development scripts

**Note:** These can be included but won't affect App Store submission.

---

## Important Notes

### Revenue Model: FREE

- ✅ No charges to merchants
- ✅ No subscriptions
- ✅ No usage fees
- ✅ No revenue sharing

**Why Free?**
- Delybell provides this as a service to their clients
- No monetization needed
- Easier approval process

### App Type: PUBLIC

- ✅ Available to all Shopify merchants
- ✅ No approval required per installation
- ✅ Standard OAuth flow
- ✅ Listed in App Store

### Support Model

**Support Email:**
- Must be monitored
- Respond within 24-48 hours
- Handle installation issues
- Help with configuration

**Support URL (Optional):**
- Documentation
- FAQ
- Troubleshooting guide

---

## Quick Reference

### Partner Dashboard URLs

- **Partner Dashboard**: https://partners.shopify.com
- **App Settings**: Partners → Apps → Your App → Configuration
- **App Store Listing**: Partners → Apps → Your App → App Store listing
- **Analytics**: Partners → Apps → Your App → Analytics

### Required URLs

**App URL:**
```
https://your-production-domain.com
```

**Callback URL:**
```
https://your-production-domain.com/auth/callback
```

**Webhook URLs:**
```
https://your-production-domain.com/webhooks/orders/create
https://your-production-domain.com/webhooks/orders/update
```

### Environment Variables

```env
SHOPIFY_API_KEY=<from_partner_dashboard>
SHOPIFY_API_SECRET=<from_partner_dashboard>
SHOPIFY_SCOPES=read_orders,write_orders
SHOPIFY_HOST=your-production-domain.com
```

---

## Troubleshooting

### OAuth Not Working

**Check:**
- App URL is correct in Partner Dashboard
- Callback URL matches exactly
- API credentials are correct
- HTTPS is enabled (required)

### Webhooks Not Receiving

**Check:**
- Webhook URLs are correct
- Webhooks are registered in Partner Dashboard
- HMAC verification is enabled
- Server is accessible from internet

### App Rejected

**Common Reasons:**
- Missing privacy policy
- OAuth flow broken
- Webhooks not working
- Poor error handling

**Fix:** Address specific feedback from Shopify.

---

## Next Steps

1. ✅ Complete Partner account setup
2. ✅ Create app in Partner Dashboard
3. ✅ Configure app settings
4. ✅ Prepare app listing content
5. ✅ Create app store assets
6. ✅ Test thoroughly
7. ✅ Submit for review
8. ✅ Monitor and maintain

---

## Support

For questions about App Store submission:
- [Shopify Partner Documentation](https://shopify.dev/docs/apps)
- [App Store Requirements](https://shopify.dev/docs/apps/store/requirements)
- [Partner Support](https://partners.shopify.com/support)

---

**Good luck with your App Store submission!** 🚀
