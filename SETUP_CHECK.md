# Setup Verification Checklist

## Before Running the App

### 1. Install Dependencies

```bash
npm install
```

This will:
- Install all required packages including `@shopify/shopify-api`
- Generate `package-lock.json` for reproducible builds
- Set up the Node.js adapter for Shopify API

### 2. Verify Installation

Check that `node_modules/@shopify/shopify-api` exists:

```bash
ls node_modules/@shopify/shopify-api
```

### 3. Set Up Environment Variables

Copy and configure `.env`:

```bash
cp env.example .env
# Edit .env with your credentials
```

### 4. Test the Server

```bash
npm run dev
```

You should see:
```
[Shopify] ✅ Shopify API client initialized successfully
Server running on port 3000
```

## Common Issues

### Error: Cannot find module '@shopify/shopify-api'

**Solution:** Run `npm install` to install dependencies.

### Error: Cannot find module '/rest/admin/2025-10'

**Solution:** This has been fixed. Make sure you're using the latest code. The `restResources` import has been removed as it's not needed for basic operations.

### Error: SHOPIFY_API_KEY is undefined

**Solution:** Make sure `.env` file exists and contains `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`.

## Production Deployment (Render)

The app is configured to work on Render with:

- **Build Command:** `npm ci` (uses package-lock.json for reproducible builds)
- **Start Command:** `npm start` (runs `node web/index.js`)
- **Health Check:** `/health` endpoint

Make sure all environment variables are set in Render dashboard.
