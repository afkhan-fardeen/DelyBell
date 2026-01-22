#!/bin/bash

# Cloudflare Tunnel Starter Script
# This script starts a Cloudflare tunnel for local development

echo "🚀 Starting Cloudflare Tunnel..."
echo "📡 Make sure your server is running on http://localhost:3000"
echo ""
echo "⚠️  Note: The URL will change each time you restart the tunnel"
echo "📝 Update your .env file and Shopify settings with the new URL"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed!"
    echo ""
    echo "Install it with:"
    echo "  brew install cloudflare/cloudflare/cloudflared"
    echo ""
    echo "Or download from: https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

# Start tunnel
echo "✅ Starting tunnel..."
cloudflared tunnel --url http://localhost:3000
