# Testing Guide - Without Shopify Access

Since you don't have access to Shopify, this guide shows you how to test the Delybell API integration using mock data.

## Quick Start

### 1. Configure Delybell API Credentials

Make sure your `.env` file has valid Delybell credentials:

```env
DELYBELL_API_URL=https://api.delybell.com
DELYBELL_ACCESS_KEY=your_access_key_here
DELYBELL_SECRET_KEY=your_secret_key_here
```

### 2. Test Delybell API Connection

Run the test script to verify your API credentials work:

```bash
npm run test:delybell
```

This will test:
- ✅ Service Types API
- ✅ Blocks API
- ✅ Roads API
- ✅ Buildings API
- ✅ Shipping Charge Calculation
- ✅ Order Transformation (Shopify → Delybell format)

### 3. Start the Server

```bash
npm run dev
```

## Testing Endpoints

### Test 1: Get Sample Mock Order Structure

See what a mock Shopify order looks like:

```bash
curl http://localhost:3000/test/mock-order-sample
```

### Test 2: Process a Single Mock Order

Process a mock order through the Delybell API:

```bash
curl -X POST http://localhost:3000/test/process-mock-order \
  -H "Content-Type: application/json" \
  -d '{
    "service_type_id": 1,
    "destination_mapping": {
      "block_id": 1,
      "road_id": 1,
      "building_id": 1
    },
    "pickup_mapping": {
      "block_id": 1,
      "road_id": 1,
      "building_id": 1
    }
  }'
```

### Test 3: Process Multiple Mock Orders

Process multiple mock orders at once:

```bash
curl -X POST http://localhost:3000/test/process-mock-orders \
  -H "Content-Type: application/json" \
  -d '{
    "count": 3,
    "service_type_id": 1,
    "destination_mapping": {
      "block_id": 1,
      "road_id": 1,
      "building_id": 1
    },
    "pickup_mapping": {
      "block_id": 1,
      "road_id": 1,
      "building_id": 1
    }
  }'
```

### Test 4: Process Custom Mock Order

Send your own custom order data:

```bash
curl -X POST http://localhost:3000/test/process-mock-order \
  -H "Content-Type: application/json" \
  -d '{
    "order": {
      "order_number": 99999,
      "email": "test@example.com",
      "customer": {
        "first_name": "Test",
        "last_name": "Customer",
        "phone": "+1234567890"
      },
      "shipping_address": {
        "first_name": "Test",
        "last_name": "Customer",
        "address1": "123 Test Street",
        "city": "Test City",
        "province": "TS",
        "zip": "12345",
        "country": "United States",
        "phone": "+1234567890"
      },
      "billing_address": {
        "first_name": "Store",
        "last_name": "Owner",
        "address1": "456 Store Street",
        "city": "Store City",
        "province": "SC",
        "zip": "54321",
        "country": "United States",
        "phone": "+1987654321"
      },
      "line_items": [
        {
          "name": "Test Product",
          "quantity": 1,
          "price": "50.00",
          "grams": 500
        }
      ],
      "total_price": "50.00",
      "currency": "USD",
      "financial_status": "pending"
    },
    "service_type_id": 1,
    "destination_mapping": {
      "block_id": 1,
      "road_id": 1,
      "building_id": 1
    },
    "pickup_mapping": {
      "block_id": 1,
      "road_id": 1,
      "building_id": 1
    }
  }'
```

## Finding Correct Address IDs

Before processing orders, you need to find the correct block/road/building IDs from Delybell:

### Get Service Types
```bash
curl http://localhost:3000/api/service-types
```

### Get Blocks
```bash
curl http://localhost:3000/api/blocks
```

### Get Roads (for a specific block)
```bash
curl "http://localhost:3000/api/roads?block_id=1"
```

### Get Buildings (for a specific road)
```bash
curl "http://localhost:3000/api/buildings?road_id=1"
```

## Testing Order Tracking

Once you've created an order, you can track it:

```bash
curl http://localhost:3000/api/track/YOUR_ORDER_ID
```

Replace `YOUR_ORDER_ID` with either:
- The `customer_input_order_id` (your Shopify order number)
- The Delybell `order_id` returned when creating the order

## Understanding the Flow

1. **Mock Order Generated**: Creates a sample Shopify order structure
2. **Order Transformation**: Converts Shopify format to Delybell format
3. **Shipping Calculation**: Calculates shipping charge (optional)
4. **Order Creation**: Creates order in Delybell system
5. **Result Returned**: Returns success/failure with order details

## Common Issues

### Issue: "Authentication failed"
**Solution:** 
- Check your `.env` file has correct `DELYBELL_ACCESS_KEY` and `DELYBELL_SECRET_KEY`
- Verify the API URL is correct

### Issue: "Address mapping error"
**Solution:**
- Use the master APIs to find correct block/road/building IDs
- Make sure IDs are integers, not strings
- Verify the IDs exist in your Delybell system

### Issue: "Service type not found"
**Solution:**
- First call `/api/service-types` to see available service types
- Use a valid `service_type_id` in your requests

## Next Steps

Once you have Shopify access:

1. Update `.env` with Shopify credentials
2. Configure webhooks in Shopify admin
3. Replace mock orders with real Shopify orders
4. The same code will work - just change the data source!

## API Testing Tools

You can also use tools like:
- **Postman**: Import the Delybell API collection
- **Insomnia**: Test API endpoints
- **curl**: Command line (examples above)
- **Browser**: For GET requests

## Example: Complete Test Flow

```bash
# 1. Start server
npm run dev

# 2. Test API connection
npm run test:delybell

# 3. Get service types
curl http://localhost:3000/api/service-types

# 4. Get blocks
curl http://localhost:3000/api/blocks

# 5. Process a mock order
curl -X POST http://localhost:3000/test/process-mock-order \
  -H "Content-Type: application/json" \
  -d '{
    "service_type_id": 1,
    "destination_mapping": {"block_id": 1, "road_id": 1, "building_id": 1},
    "pickup_mapping": {"block_id": 1, "road_id": 1, "building_id": 1}
  }'

# 6. Track the order (use order_id from step 5)
curl http://localhost:3000/api/track/YOUR_ORDER_ID
```

