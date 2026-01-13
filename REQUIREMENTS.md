# Requirements & What to Ask Your Client

## ✅ What You Can Test RIGHT NOW (No Shopify Needed)

You can fully test the **Delybell API integration** using mock data. You only need:

### Required from Client:
1. **Delybell API Credentials**
   - `DELYBELL_ACCESS_KEY` (x-access-key)
   - `DELYBELL_SECRET_KEY` (x-secret-key)
   - `DELYBELL_API_URL` (usually `https://api.delybell.com`)

### What You Can Test:
- ✅ Delybell API connection
- ✅ Service Types API
- ✅ Blocks/Roads/Buildings APIs
- ✅ Shipping Charge Calculation
- ✅ Order Creation in Delybell
- ✅ Order Tracking
- ✅ Order Transformation Logic (Shopify format → Delybell format)

**You can test 100% of the Delybell integration without Shopify!**

---

## 🔄 What You Need for FULL Integration Testing

### Required from Client:

1. **Delybell API Credentials** (REQUIRED)
   ```
   - Access Key (x-access-key)
   - Secret Key (x-secret-key)
   - API Base URL
   ```

2. **Shopify Credentials** (OPTIONAL - for full integration)
   ```
   - Shopify API Key
   - Shopify API Secret
   - Shopify Store Domain (e.g., mystore.myshopify.com)
   ```

3. **Address Mapping Information** (HELPFUL)
   ```
   - Default Block ID for pickup location
   - Default Road ID for pickup location
   - Default Building ID for pickup location
   - Or: How to map addresses to Delybell's block/road/building system
   ```

4. **Service Type ID** (HELPFUL)
   ```
   - Which service type ID to use for orders
   - Or: How to determine service type per order
   ```

---

## 📧 Email Template: What to Ask Your Client

**Subject: Delybell API Integration - Required Credentials**

Hi [Client Name],

I'm building the Shopify-Delybell integration app. To test and complete the integration, I need the following:

### 1. Delybell API Credentials (REQUIRED)
Please provide:
- **Delybell Access Key** (x-access-key)
- **Delybell Secret Key** (x-secret-key)
- **Delybell API Base URL** (if different from `https://api.delybell.com`)

These are required to test the Delybell API integration.

### 2. Shopify Credentials (OPTIONAL - for full testing)
If you want me to test with real Shopify orders, please provide:
- **Shopify API Key**
- **Shopify API Secret**
- **Shopify Store Domain** (e.g., `yourstore.myshopify.com`)

*Note: I can test the Delybell integration using mock data without Shopify access.*

### 3. Address Mapping Configuration (HELPFUL)
To process orders correctly, I need to know:
- **Default Pickup Location**: Block ID, Road ID, Building ID for your store/warehouse
- **How to map customer addresses**: 
  - Do you have a mapping system?
  - Should I use Delybell's master APIs to find matching blocks/roads/buildings?
  - Or do you have default IDs to use?

### 4. Service Type (HELPFUL)
- Which **Service Type ID** should I use for orders?
- Or should I let customers choose, or determine it automatically?

### 5. Testing Environment
- Do you have a **test/sandbox environment** for Delybell API?
- Or should I use the production API?

---

**Priority:**
1. **Delybell API Credentials** - I can start testing immediately with these
2. **Address Mapping** - Needed before processing real orders
3. **Shopify Credentials** - Only needed for full end-to-end testing

Please let me know what you can provide, and I'll proceed accordingly.

Thanks!

---

## 🎯 Minimum Viable Testing (What You Can Do Now)

**With JUST Delybell API credentials, you can:**

1. ✅ Test all Delybell API endpoints
2. ✅ Verify API authentication works
3. ✅ Test order creation with mock data
4. ✅ Test shipping calculation
5. ✅ Test order tracking
6. ✅ Verify order transformation logic

**This covers 90% of the integration!**

The remaining 10% (Shopify-specific parts) can be tested later when you have Shopify access, or you can use the mock data endpoints we've built.

---

## 📋 Checklist: What to Request

- [ ] Delybell Access Key
- [ ] Delybell Secret Key  
- [ ] Delybell API URL (if custom)
- [ ] Default Service Type ID
- [ ] Default Pickup Location (Block/Road/Building IDs)
- [ ] Address Mapping Strategy
- [ ] Shopify API Key (optional)
- [ ] Shopify API Secret (optional)
- [ ] Shopify Store Domain (optional)
- [ ] Test/Sandbox Environment Details (if available)

---

## 💡 What to Tell Your Client

**"I can build and test 90% of the integration with just Delybell API credentials. The Shopify integration can be added later when you're ready. The app is designed to work with mock data for testing, so we don't need Shopify access immediately."**

