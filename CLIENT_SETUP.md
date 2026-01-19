# Quick Setup Guide for Delybell Clients

This guide helps Delybell clients quickly set up the Shopify integration for their stores.

## Prerequisites

Before starting, ensure you have:
- ✅ A Shopify store (any plan)
- ✅ Delybell API credentials (Access Key & Secret Key)
- ✅ Admin access to your Shopify store

---

## Step 1: Get Delybell API Credentials

1. Log in to your Delybell account
2. Navigate to **Settings** → **API Access**
3. Generate or copy your:
   - **Access Key**
   - **Secret Key**
4. Save these credentials securely

---

## Step 2: Install the App

### Option A: Install from Shopify App Store (Recommended)

1. Go to your Shopify Admin
2. Navigate to **Apps** → **Visit Shopify App Store**
3. Search for "Delybell Integration"
4. Click **Add app**
5. Click **Install app**

### Option B: Install via Direct Link

Contact Delybell support to get your installation link:
```
https://delybell-app.com/auth/install?shop=your-store.myshopify.com
```

Replace `your-store.myshopify.com` with your actual Shopify store domain.

---

## Step 3: Authorize the App

1. After clicking "Install app", you'll be redirected to authorize
2. Review the permissions requested:
   - Read orders
   - Write orders
3. Click **Install app** to authorize

---

## Step 4: Verify Installation

1. Go to **Apps** in your Shopify Admin
2. Find "Delybell Integration"
3. Click to open the app
4. You should see a success message

---

## Step 5: Configure Your Pickup Address (If Needed)

**Default Setup:**
- The app uses Delybell's default pickup address
- This works for most clients

**Custom Pickup Address:**
If you need a different pickup address:
1. Contact Delybell support
2. Provide your pickup address details:
   - Building number
   - Road number
   - Block number
   - Area/City
3. Support will configure it for you

---

## Step 6: Test the Integration

### Test Order Processing

1. **Create a test order** in your Shopify store:
   - Add a product to cart
   - Use a valid shipping address (include Block, Road, Building numbers)
   - Complete checkout

2. **Check order status:**
   - Go to **Orders** in Shopify Admin
   - Open the test order
   - Look for tags: `delybell:ORDER_ID`
   - Check order notes for Delybell tracking info

3. **Verify in Delybell:**
   - Log in to Delybell dashboard
   - Check **Orders** section
   - Find your test order

### Address Format Requirements

For orders to process successfully, shipping addresses must include:

**Required:**
- ✅ Block number (or postal code)
- ✅ Road number

**Optional:**
- Building number
- Flat/Office number

**Example Addresses:**

✅ **Good:**
```
Building 134, Road 354, Block 306
Block 306, Road 354, Building 134
Road 3953, Building 2733 (with postal code 306)
```

❌ **Bad:**
```
123 Main Street
Downtown Area
(No Block/Road numbers)
```

---

## Step 7: Go Live

Once testing is successful:

1. ✅ Verify test orders are processing correctly
2. ✅ Check Delybell dashboard for orders
3. ✅ Confirm tracking information appears in Shopify
4. ✅ Start accepting real customer orders

---

## How It Works

### Automatic Order Processing

1. **Customer places order** in your Shopify store
2. **Webhook triggers** → App receives order instantly
3. **Address parsing** → App extracts Block/Road/Building numbers
4. **Order creation** → Order created in Delybell automatically
5. **Tracking update** → Shopify order tagged with Delybell order ID

### Order Status Flow

```
Shopify Order Created
    ↓
Delybell Order Created (Status: Pending Pickup)
    ↓
Driver Assigned
    ↓
Out for Delivery
    ↓
Delivered
```

---

## Troubleshooting

### Orders Not Processing

**Check:**
1. Is the app installed? (Go to Apps → Delybell Integration)
2. Is the order's shipping address complete?
3. Does the address include Block and Road numbers?
4. Check Shopify order notes for error messages

**Common Issues:**

**"Invalid destination block ID"**
- **Cause:** Address cannot be parsed or Block not found
- **Solution:** Ensure shipping address includes Block number (or postal code)

**"Order stays in Open state"**
- **Cause:** Pickup scheduling issue
- **Solution:** Contact Delybell support

**"Webhook verification failed"**
- **Cause:** App configuration issue
- **Solution:** Reinstall the app

### Address Format Issues

If orders are failing due to address format:

1. **Check customer's shipping address:**
   - Does it include Block number?
   - Does it include Road number?
   - Is postal code provided?

2. **Update address format:**
   - Ask customers to include Block and Road numbers
   - Update checkout form to require these fields
   - Add address format instructions

---

## Support

### Need Help?

**Delybell Support:**
- Email: support@delybell.com
- Phone: [Your support number]
- Hours: [Your support hours]

**Common Questions:**

**Q: Can I use multiple pickup addresses?**
A: Currently, one pickup address per installation. Contact support for multi-location setup.

**Q: How do I change the pickup address?**
A: Contact Delybell support with your new address details.

**Q: What happens if an address can't be parsed?**
A: The order will fail with an error message. Check Shopify order notes for details.

**Q: Can I process orders manually?**
A: Yes, you can sync orders via API. Contact support for API access.

**Q: How do I track orders?**
A: Orders are automatically tagged in Shopify. Check order notes for tracking links.

---

## Next Steps

- ✅ Test with a few orders
- ✅ Monitor order processing
- ✅ Verify tracking information
- ✅ Train your team on the integration
- ✅ Update customer communication templates

---

## Additional Resources

- [Complete Documentation](./DOCUMENTATION.md)
- [Production Guide](./PRODUCTION_GUIDE.md)
- [Delybell API Docs](https://documenter.getpostman.com/view/37966240/2sB34eKND9)

---

**Congratulations!** Your Shopify store is now integrated with Delybell. Orders will be automatically processed and dispatched! 🚀
