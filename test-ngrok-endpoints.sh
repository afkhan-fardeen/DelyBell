#!/bin/bash

# Test Delybell API endpoints via ngrok URL
NGROK_URL="semisubterranean-racheal-ungloomy.ngrok-free.dev"

echo "🧪 Testing Delybell API via ngrok URL: https://${NGROK_URL}"
echo ""

# Test 1: Service Types
echo "1️⃣  Testing Service Types..."
curl -s "https://${NGROK_URL}/api/service-types" | jq '.' || curl -s "https://${NGROK_URL}/api/service-types"
echo ""
echo ""

# Test 2: Blocks
echo "2️⃣  Testing Blocks..."
curl -s "https://${NGROK_URL}/api/blocks" | jq '.data | length' || echo "Blocks endpoint called"
echo ""

# Test 3: Roads (with block_id=5)
echo "3️⃣  Testing Roads (block_id=5)..."
curl -s "https://${NGROK_URL}/api/roads?block_id=5" | jq '.' || curl -s "https://${NGROK_URL}/api/roads?block_id=5"
echo ""
echo ""

# Test 4: Buildings (with road_id=1 and block_id=5)
echo "4️⃣  Testing Buildings (road_id=1, block_id=5)..."
curl -s "https://${NGROK_URL}/api/buildings?road_id=1&block_id=5" | jq '.' || curl -s "https://${NGROK_URL}/api/buildings?road_id=1&block_id=5"
echo ""
echo ""

# Test 5: Health Check
echo "5️⃣  Testing Health Check..."
curl -s "https://${NGROK_URL}/health" | jq '.' || curl -s "https://${NGROK_URL}/health"
echo ""
echo ""

echo "✅ Testing complete!"

