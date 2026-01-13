# Address Mapping Configuration Guide

## What are these values?

When Shopify orders are automatically synced to Delybell, the system needs to know the **Delybell location IDs** for:
- **Pickup location** (where the order is being shipped FROM - usually your store/warehouse)
- **Destination location** (where the order is being shipped TO - the customer's address)

Delybell uses a hierarchical address system:
- **Block** → **Road** → **Building** → **Flat/Office**

## How to Find These Values

### Step 1: Get Service Types
```bash
curl https://semisubterranean-racheal-ungloomy.ngrok-free.dev/api/service-types
```
This will show available service types. Use the `id` of the service you want (usually `1` for standard delivery).

### Step 2: Get Blocks
```bash
curl https://semisubterranean-racheal-ungloomy.ngrok-free.dev/api/blocks
```
Find your pickup block (where orders ship from) and destination blocks (where orders ship to).

### Step 3: Get Roads for a Block
```bash
curl "https://semisubterranean-racheal-ungloomy.ngrok-free.dev/api/roads?block_id=5"
```
Replace `5` with your block ID. Find the road ID for your pickup and destination locations.

### Step 4: Get Buildings for a Road
```bash
curl "https://semisubterranean-racheal-ungloomy.ngrok-free.dev/api/buildings?block_id=5&road_id=1447"
```
Replace with your block_id and road_id. Find the building ID for your pickup and destination locations.

## Example Configuration

Based on your current setup, you're using:
- **Pickup Location**: Block 5, Road 1447, Building 1
- **Destination Location**: Block 5, Road 1447, Building 1

**Note**: These are currently set to the same values, which means pickup and delivery are from the same location. You should update the destination mapping based on your actual customer addresses.

## Setting Up Your .env File

Add these to your `.env` file:

```bash
# Default Order Processing Configuration
# These are used for automatic webhook processing

# Service Type (usually 1 for standard delivery)
DEFAULT_SERVICE_TYPE_ID=1

# Destination Location (where orders are delivered TO)
# Update these based on your customer addresses
DEFAULT_DESTINATION_BLOCK_ID=5
DEFAULT_DESTINATION_ROAD_ID=1447
DEFAULT_DESTINATION_BUILDING_ID=1

# Pickup Location (where orders are shipped FROM - your store/warehouse)
# Update these to your actual pickup location
DEFAULT_PICKUP_BLOCK_ID=5
DEFAULT_PICKUP_ROAD_ID=1447
DEFAULT_PICKUP_BUILDING_ID=1
```

## Important Notes

1. **These are DEFAULT values** - They're used when webhooks automatically process orders
2. **For manual sync**, you can override these by passing different values in the API request
3. **For production**, you might want to:
   - Map Shopify addresses to Delybell locations dynamically
   - Store address mappings in a database
   - Use geocoding to find the closest Delybell location

## Current Values (What You're Using)

Based on your successful manual sync, you're currently using:
- Service Type: `1`
- Block ID: `5`
- Road ID: `1447`
- Building ID: `1`

These values work for your current setup, but you should update them based on your actual pickup and delivery locations.

