#!/bin/bash

# Register webhooks with Shopify for automatic order sync
# Make sure your server is running and ngrok is active before running this script

NGROK_URL="https://semisubterranean-racheal-ungloomy.ngrok-free.dev"
SHOP="delybell.myshopify.com"

echo "🔔 Registering webhooks with Shopify..."
echo "Webhook URL: ${NGROK_URL}"
echo "Shop: ${SHOP}"
echo ""

# Register webhooks
curl -X POST "${NGROK_URL}/api/webhooks/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"shop\": \"${SHOP}\",
    \"webhookUrl\": \"${NGROK_URL}\"
  }"

echo ""
echo ""
echo "✅ Webhook registration complete!"
echo ""
echo "Now when you create an order in Shopify, it will automatically sync to Delybell!"
