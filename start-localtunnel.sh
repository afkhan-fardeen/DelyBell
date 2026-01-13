#!/bin/bash

# Start localtunnel for Shopify integration (using npx - no global install needed!)

echo "🚀 Starting localtunnel..."
echo ""

# Check if server is running
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Server is not running on port 3000"
    echo "Start your server first: npm start"
    exit 1
fi

echo "✅ Server is running on port 3000"
echo ""
echo "Starting localtunnel (using npx - no installation needed)..."
echo "Copy the URL you see below!"
echo ""

# Start localtunnel using npx (no global install needed)
npx localtunnel --port 3000

