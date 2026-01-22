# Free Tunneling Options for Shopify App Development

**Alternatives to ngrok for exposing your local server with HTTPS**

---

## 🚀 Best Free Options

### 1. **Cloudflare Tunnel (cloudflared)** ⭐ RECOMMENDED
**Best for:** Production-like development, unlimited connections, no time limits

#### Pros:
- ✅ **Completely free** - No time limits
- ✅ **Unlimited connections** - No connection limits
- ✅ **Fast and reliable** - Uses Cloudflare's global network
- ✅ **Persistent URLs** - Can get custom subdomain
- ✅ **No signup required** - Works immediately
- ✅ **HTTPS by default** - Perfect for Shopify

#### Cons:
- ⚠️ Requires installation
- ⚠️ URL changes on restart (unless using custom domain)

#### Installation:
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Or download from: https://github.com/cloudflare/cloudflared/releases
```

#### Usage:
```bash
# Start tunnel (creates random URL)
cloudflared tunnel --url http://localhost:3000

# Output will show:
# +--------------------------------------------------------------------------------------------+
# |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
# |  https://random-name.trycloudflare.com                                                    |
# +--------------------------------------------------------------------------------------------+
```

#### For Shopify:
1. Start your server: `npm start`
2. Start tunnel: `cloudflared tunnel --url http://localhost:3000`
3. Copy the HTTPS URL (e.g., `https://abc123.trycloudflare.com`)
4. Update `.env`: `SHOPIFY_HOST=abc123.trycloudflare.com`
5. Update Shopify Partner Dashboard with this URL

---

### 2. **LocalTunnel** ⭐ EASY SETUP
**Best for:** Quick testing, npm package, easy to use

#### Pros:
- ✅ **Free** - No limits
- ✅ **Easy installation** - npm package
- ✅ **Simple to use** - One command
- ✅ **HTTPS included** - Works with Shopify

#### Cons:
- ⚠️ URL changes each time (unless using custom subdomain)
- ⚠️ Can be slower than Cloudflare
- ⚠️ Less reliable for long sessions

#### Installation:
```bash
npm install -g localtunnel
```

#### Usage:
```bash
# Start tunnel
lt --port 3000

# Output:
# your url is: https://random-name.loca.lt
```

#### For Shopify:
1. Start your server: `npm start`
2. Start tunnel: `lt --port 3000`
3. Copy the HTTPS URL
4. Update `.env` and Shopify settings

---

### 3. **Serveo** ⭐ NO INSTALLATION
**Best for:** Quick testing, no installation needed

#### Pros:
- ✅ **No installation** - Uses SSH
- ✅ **Free** - No limits
- ✅ **Custom subdomain** - Can request specific name
- ✅ **HTTPS included**

#### Cons:
- ⚠️ Requires SSH client
- ⚠️ Less reliable
- ⚠️ Can be slow

#### Usage:
```bash
# Request custom subdomain
ssh -R 80:localhost:3000 serveo.net

# Or random subdomain
ssh -R random-name:80:localhost:3000 serveo.net
```

#### For Shopify:
1. Start your server: `npm start`
2. Run SSH command
3. Copy the HTTPS URL
4. Update configuration

---

### 4. **Bore** ⭐ RUST-BASED
**Best for:** Fast performance, modern tool

#### Pros:
- ✅ **Fast** - Rust-based, very fast
- ✅ **Free** - No limits
- ✅ **Simple** - Easy to use
- ✅ **HTTPS** - Works with Shopify

#### Cons:
- ⚠️ Requires installation
- ⚠️ URL changes each time

#### Installation:
```bash
# macOS
brew install bore-cli

# Or download from: https://github.com/ekzhang/bore/releases
```

#### Usage:
```bash
# Start tunnel
bore local 3000 --to bore.pub

# Output:
# Forwarding from https://random-name.bore.pub to localhost:3000
```

---

### 5. **Zrok** ⭐ OPEN SOURCE
**Best for:** Self-hosted option, more control

#### Pros:
- ✅ **Open source** - Free and open
- ✅ **Self-hosted** - More control
- ✅ **Custom domains** - Can use your domain

#### Cons:
- ⚠️ More complex setup
- ⚠️ Requires more configuration

---

## 🎯 Recommended Setup for Shopify Development

### Option A: Cloudflare Tunnel (Best Overall)
```bash
# 1. Install
brew install cloudflare/cloudflare/cloudflared

# 2. Start your server
npm start

# 3. Start tunnel (in another terminal)
cloudflared tunnel --url http://localhost:3000

# 4. Copy the HTTPS URL and update:
# - .env file: SHOPIFY_HOST=your-url.trycloudflare.com
# - Shopify Partner Dashboard: App URL and Callback URL
```

### Option B: LocalTunnel (Easiest)
```bash
# 1. Install
npm install -g localtunnel

# 2. Start your server
npm start

# 3. Start tunnel (in another terminal)
lt --port 3000

# 4. Copy the HTTPS URL and update configuration
```

---

## 📝 Quick Comparison

| Tool | Free | Easy Setup | Persistent URL | Speed | Best For |
|------|------|------------|----------------|-------|----------|
| **Cloudflare Tunnel** | ✅ | ⭐⭐⭐⭐ | ⚠️ | ⭐⭐⭐⭐⭐ | Production-like dev |
| **LocalTunnel** | ✅ | ⭐⭐⭐⭐⭐ | ⚠️ | ⭐⭐⭐ | Quick testing |
| **Serveo** | ✅ | ⭐⭐⭐ | ✅ | ⭐⭐ | Custom subdomain |
| **Bore** | ✅ | ⭐⭐⭐⭐ | ⚠️ | ⭐⭐⭐⭐⭐ | Fast performance |
| **ngrok** | ⚠️ Limited | ⭐⭐⭐⭐⭐ | ✅ Paid | ⭐⭐⭐⭐⭐ | Paid plans |

---

## 🔧 Setup Script for Cloudflare Tunnel

Create a script to make it easier:

### `start-tunnel.sh`
```bash
#!/bin/bash

echo "🚀 Starting Cloudflare Tunnel..."
echo "📡 Your server should be running on http://localhost:3000"
echo ""

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

Make it executable:
```bash
chmod +x start-tunnel.sh
```

Usage:
```bash
# Terminal 1: Start your server
npm start

# Terminal 2: Start tunnel
./start-tunnel.sh
```

---

## 🔧 Setup Script for LocalTunnel

### `start-localtunnel.sh`
```bash
#!/bin/bash

echo "🚀 Starting LocalTunnel..."
echo "📡 Your server should be running on http://localhost:3000"
echo ""

# Start tunnel
lt --port 3000
```

---

## 📋 Complete Development Workflow

### Using Cloudflare Tunnel:

1. **Start your server:**
   ```bash
   npm start
   ```

2. **Start tunnel (new terminal):**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.trycloudflare.com`)

4. **Update `.env`:**
   ```env
   SHOPIFY_HOST=abc123.trycloudflare.com
   ```

5. **Update Shopify Partner Dashboard:**
   - App URL: `https://abc123.trycloudflare.com/app`
   - Callback URL: `https://abc123.trycloudflare.com/auth/callback`
   - Webhook URLs:
     - `https://abc123.trycloudflare.com/webhooks/orders/create`
     - `https://abc123.trycloudflare.com/webhooks/orders/update`
     - `https://abc123.trycloudflare.com/webhooks/app/uninstalled`

6. **Restart your server** (to load new env vars):
   ```bash
   npm start
   ```

7. **Test installation:**
   ```
   https://abc123.trycloudflare.com/auth/install?shop=your-store.myshopify.com
   ```

---

## ⚠️ Important Notes

### URL Changes
- **Cloudflare Tunnel** and **LocalTunnel** URLs change each time you restart
- You'll need to update Shopify settings each time
- **Solution:** Use a custom subdomain (if available) or keep tunnel running

### Keeping Tunnel Running
- Keep the tunnel terminal open while developing
- If tunnel closes, restart it and update URLs
- Consider using `screen` or `tmux` to keep it running in background

### Production
- For production, use a real domain with HTTPS
- Don't use tunnels for production apps
- Deploy to Render, Railway, Fly.io, etc.

---

## 🚀 Quick Start (Recommended: Cloudflare Tunnel)

```bash
# 1. Install Cloudflare Tunnel
brew install cloudflare/cloudflare/cloudflared

# 2. Start your server
npm start

# 3. In another terminal, start tunnel
cloudflared tunnel --url http://localhost:3000

# 4. Copy the HTTPS URL and update:
#    - .env file
#    - Shopify Partner Dashboard
```

---

## 💡 Pro Tips

1. **Keep tunnel running:** Use `screen` or `tmux` to keep tunnel running in background
2. **Use custom subdomain:** Some tools allow custom subdomains for persistent URLs
3. **Test quickly:** Use LocalTunnel for quick tests, Cloudflare for longer sessions
4. **Production ready:** Always deploy to real hosting for production apps

---

## 🎯 Recommendation

**Use Cloudflare Tunnel** - It's free, fast, reliable, and perfect for Shopify app development!

```bash
# Install
brew install cloudflare/cloudflare/cloudflared

# Use
cloudflared tunnel --url http://localhost:3000
```

That's it! Copy the HTTPS URL and you're ready to go! 🚀
