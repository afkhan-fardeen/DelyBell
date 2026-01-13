# Delybell Address Requirements

## Important Guidelines

### 1. Pickup Address (Sender)
**CRITICAL**: The pickup address must match **EXACTLY** what's registered in the Delybell system during registration.

- Use the **exact same address** that was registered with Delybell
- Do NOT use Shopify billing address unless it matches the registered address
- Configure this in your `.env` file as `DEFAULT_PICKUP_ADDRESS`

**Example:**
```env
DEFAULT_PICKUP_ADDRESS=Building 1, Road 1447, Block 5, Manama
DEFAULT_PICKUP_CUSTOMER_NAME=Your Store Name
DEFAULT_PICKUP_MOBILE_NUMBER=+97312345678
```

### 2. Delivery Address (Destination)
**CRITICAL**: The delivery address must be entered in a **standard structured format** and should **NOT** be written in a single line.

**Required Format:**
```
Building X, Road Y, Block Z
```

**Why?**
- Delybell's system uses **auto-assignment** based on location blocks
- Orders are automatically assigned to drivers based on location blocks
- Structured format ensures proper block/road/building identification

**Example:**
- ✅ **Correct**: `Building 50, Road 1901, Block 319`
- ❌ **Incorrect**: `Building 50 Road 1901 Block 319` (single line, no commas)
- ❌ **Incorrect**: `50 Main Street, Manama` (not structured)

### 3. Address Mapping Configuration

Configure these in your `.env` file:

```env
# Destination Location Mapping
DEFAULT_DESTINATION_BLOCK_ID=5
DEFAULT_DESTINATION_ROAD_ID=1447
DEFAULT_DESTINATION_BUILDING_ID=1

# Pickup Location Mapping (must match registered Delybell address)
DEFAULT_PICKUP_BLOCK_ID=5
DEFAULT_PICKUP_ROAD_ID=1447
DEFAULT_PICKUP_BUILDING_ID=1
DEFAULT_PICKUP_ADDRESS=Building 1, Road 1447, Block 5
```

### 4. How It Works

1. **Pickup Address**: Uses configured `DEFAULT_PICKUP_ADDRESS` from `.env` (must match Delybell registration)
2. **Destination Address**: Automatically formatted from Shopify shipping address to structured format:
   - Extracts building, road, and block information
   - Formats as: `Building X, Road Y, Block Z`
   - Uses mapping IDs if available, otherwise extracts from address fields

### 5. Testing

To verify addresses are formatted correctly:

1. Create a test order in Shopify
2. Check server logs for the formatted addresses
3. Verify in Delybell system that:
   - Pickup address matches your registered address exactly
   - Destination address is in structured format (Building, Road, Block)

### 6. Troubleshooting

**Issue**: Orders not being assigned to drivers automatically
- **Solution**: Ensure destination address is in structured format: `Building X, Road Y, Block Z`

**Issue**: Pickup address mismatch error
- **Solution**: Update `DEFAULT_PICKUP_ADDRESS` in `.env` to match your registered Delybell address exactly

**Issue**: Address parsing errors
- **Solution**: Ensure Shopify shipping addresses include building, road, and block information, or configure mapping IDs in `.env`

