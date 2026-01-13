# Testing Delybell API via Ngrok URL

## Prerequisites

1. ✅ Server running: `npm start`
2. ✅ Ngrok running: `ngrok http 3000`
3. ✅ `.env` file updated with working credentials:
   ```env
   DELYBELL_API_URL=https://new.api.delybell.com
   DELYBELL_ACCESS_KEY=a6cce0c6d10bea3ad9f4f3ce5fca982649adb83bd798c303ab5672ca0c542066
   DELYBELL_SECRET_KEY=c22cf52a7bd7d3d7ebd2bb94769460bb4b575b534c5aaa1af67e92a9b0692044
   ```

## Test Endpoints

Replace `YOUR-NGROK-URL` with your actual ngrok URL (e.g., `semisubterranean-racheal-ungloomy.ngrok-free.dev`)

### 1. Service Types
```bash
curl https://YOUR-NGROK-URL/api/service-types
```

Expected response:
```json
{
  "status": true,
  "message": "Service type list",
  "data": [
    { "id": 3, "name": "Express" },
    { "id": 2, "name": "Next Day" },
    { "id": 1, "name": "Same Day" }
  ]
}
```

### 2. Blocks
```bash
curl https://YOUR-NGROK-URL/api/blocks
```

Or search for a specific block:
```bash
curl "https://YOUR-NGROK-URL/api/blocks?search=Manama"
```

### 3. Roads (requires block_id)
```bash
curl "https://YOUR-NGROK-URL/api/roads?block_id=5"
```

### 4. Buildings (requires road_id and block_id)
```bash
curl "https://YOUR-NGROK-URL/api/buildings?road_id=1&block_id=5"
```

### 5. Health Check
```bash
curl https://YOUR-NGROK-URL/health
```

### 6. API Documentation
```bash
curl https://YOUR-NGROK-URL/
```

## Testing with Browser

You can also test directly in your browser:

1. **Service Types:**
   ```
   https://YOUR-NGROK-URL/api/service-types
   ```

2. **Blocks:**
   ```
   https://YOUR-NGROK-URL/api/blocks
   ```

3. **Roads:**
   ```
   https://YOUR-NGROK-URL/api/roads?block_id=5
   ```

4. **Buildings:**
   ```
   https://YOUR-NGROK-URL/api/buildings?road_id=1&block_id=5
   ```

## Example Test Sequence

```bash
# 1. Get service types
curl https://YOUR-NGROK-URL/api/service-types

# 2. Get blocks
curl https://YOUR-NGROK-URL/api/blocks

# 3. Get roads for block_id=5
curl "https://YOUR-NGROK-URL/api/roads?block_id=5"

# 4. Get buildings for road_id=1 in block_id=5
curl "https://YOUR-NGROK-URL/api/buildings?road_id=1&block_id=5"
```

## Troubleshooting

### "Cannot GET /api/service-types"
- Make sure your server is running: `npm start`
- Check that ngrok is running: `ngrok http 3000`
- Verify the ngrok URL is correct

### "Unauthorized: Invalid credentials"
- Check your `.env` file has the correct credentials
- Restart your server after updating `.env`
- Verify credentials are on separate lines in `.env`

### "block_id is required" or "road_id is required"
- Make sure you're including the required query parameters
- Check the URL format: `?block_id=5&road_id=1`

## Next Steps

Once API endpoints are working:
1. ✅ Test order processing with mock data
2. ✅ Set up address mapping
3. ✅ Register webhooks for automatic order sync
4. ✅ Test with real Shopify orders

