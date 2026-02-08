# Quick Start Guide - DelyBell Order Sync

## Prerequisites

- Node.js 18+ installed
- Shopify Partner account
- Supabase account (for database)
- DelyBell API credentials

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `env.example` to `.env` and fill in your credentials:

```bash
cp env.example .env
```

Required variables:
- `SHOPIFY_API_KEY` - From Shopify Partner Dashboard
- `SHOPIFY_API_SECRET` - From Shopify Partner Dashboard
- `SHOPIFY_SCOPES` - `read_orders,write_orders`
- `SHOPIFY_HOST` - Your domain (e.g., `delybell.onrender.com`)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DELYBELL_API_URL` - `https://new.api.delybell.com`
- `DELYBELL_ACCESS_KEY` - Your DelyBell access key
- `DELYBELL_SECRET_KEY` - Your DelyBell secret key

### 3. Set Up Database

Run Supabase migrations:

```bash
# Connect to your Supabase project and run migrations from supabase/migrations/
```

### 4. Development

**Option A: Using Shopify CLI (Recommended)**

```bash
npm run shopify app dev
```

This will:
- Start the development server
- Set up ngrok tunnel automatically
- Register webhooks automatically
- Handle OAuth flow automatically

**Option B: Using Nodemon (Legacy)**

```bash
npm run dev
```

Then manually:
- Set up ngrok tunnel: `ngrok http 3000`
- Update `SHOPIFY_HOST` in `.env` with ngrok URL
- Register webhooks manually via Shopify Admin

### 5. Production Deployment

1. Deploy to your hosting provider (Render, Fly.io, AWS, etc.)
2. Set environment variables in your hosting dashboard
3. Update `SHOPIFY_HOST` in `.env` to your production domain
4. Update App URL in Shopify Partner Dashboard
5. Webhooks will be registered automatically on app install

## Testing

### Test Webhooks

1. Install the app on a test Shopify store
2. Create a test order in Shopify
3. Check server logs for webhook receipt
4. Verify order appears in admin dashboard with `pending_sync` status

### Test OAuth Flow

1. Visit `/auth/install?shop=your-test-store.myshopify.com`
2. Complete OAuth authorization
3. Should redirect to `/app` dashboard
4. Verify shop is saved in Supabase `shops` table

### Test Order Sync

1. Go to admin dashboard (`/app`)
2. Select orders with `pending_sync` status
3. Click "Sync Selected"
4. Verify orders are sent to DelyBell API
5. Check status updates to `processed` with DelyBell order ID

## Common Issues

### Webhooks Not Received

- Check webhook registration in Shopify Admin → Settings → Notifications
- Verify `SHOPIFY_API_SECRET` matches Partner Dashboard
- Check webhook URLs are correct
- Ensure server is accessible (not behind firewall)

### OAuth Fails

- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
- Check callback URL matches Partner Dashboard settings
- Ensure cookies are enabled
- Check Supabase connection

### Orders Not Syncing

- Verify shop is authenticated (check Supabase `shops` table)
- Check DelyBell API credentials
- Review server logs for errors
- Verify address mapping is working correctly

## File Structure

```
/
├── web/                    # Shopify CLI app structure
│   ├── index.js           # Main entry point
│   ├── shopify.js         # Shopify API config
│   └── routes/            # Route handlers
├── services/              # Business logic (unchanged)
├── views/                 # EJS templates
├── supabase/              # Database migrations
├── config.js              # Configuration
└── package.json           # Dependencies
```

## Support

For detailed migration information, see `SHOPIFY_CLI_MIGRATION_GUIDE.md`.

For troubleshooting, check server logs and verify all environment variables are set correctly.
