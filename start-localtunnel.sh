#!/bin/bash

# LocalTunnel Starter Script
# This script starts a LocalTunnel for local development

echo "🚀 Starting LocalTunnel..."
echo "📡 Make sure your server is running on http://localhost:3000"
echo ""
echo "⚠️  Note: The URL will change each time you restart the tunnel"
echo "📝 Update your .env file and Shopify settings with the new URL"
echo ""

# Check if localtunnel is installed
if ! command -v lt &> /dev/null; then
    echo "❌ localtunnel is not installed!"
    echo ""
    echo "Install it with:"
    echo "  npm install -g localtunnel"
    exit 1
fi

# Start tunnel
echo "✅ Starting tunnel..."
lt --port 3000
