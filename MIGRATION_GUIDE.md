# Migration Guide: EJS to Next.js

This guide explains the safe, gradual migration from EJS templates to Next.js React components.

## 🎯 Migration Strategy

**Safe Path**: Keep Express backend intact, migrate UI gradually.

### Current Structure
```
/
├── server.js          # Express server (kept as-is)
├── routes/            # Express routes (kept as-is)
│   ├── auth.js        # OAuth routes
│   ├── webhooks.js    # Webhook handlers
│   ├── admin.js       # Admin API + EJS routes
│   └── api.js         # API routes
├── services/          # Business logic (kept as-is)
└── views/             # EJS templates (being migrated)
    ├── app.ejs        # → Migrating to Next.js
    └── admin-dashboard.ejs  # → Keep for now
```

### New Structure
```
/
├── server.js          # Express server (unchanged)
├── routes/            # Express routes (unchanged)
├── services/          # Business logic (unchanged)
├── views/             # EJS templates (gradually removed)
└── app-ui/            # Next.js app (NEW)
    ├── app/
    │   └── app/
    │       └── page.tsx  # Main app page
    ├── components/        # React components
    └── package.json
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
# Install Next.js dependencies
cd app-ui
npm install

# Install concurrently for running both servers (optional)
cd ..
npm install --save-dev concurrently
```

### 2. Run Development Servers

**Option A: Run separately (recommended for development)**
```bash
# Terminal 1: Express server
npm run dev

# Terminal 2: Next.js UI
npm run dev:ui
```

**Option B: Run together**
```bash
npm run dev:all
```

### 3. Access the App

- **Express API**: http://localhost:3000
- **Next.js UI**: http://localhost:3001
- **App Page**: http://localhost:3001/app?shop=your-shop.myshopify.com

## 📋 Migration Checklist

### ✅ Phase 1: Setup (DONE)
- [x] Create Next.js app structure
- [x] Configure Tailwind CSS
- [x] Set up TypeScript
- [x] Configure API proxy

### 🔄 Phase 2: Migrate `/app` Route (IN PROGRESS)
- [x] Create Next.js `/app` page
- [x] Migrate health cards component
- [x] Migrate sync mode card
- [x] Migrate settings card
- [x] Migrate orders card
- [ ] Add bulk actions
- [ ] Add error handling
- [ ] Add loading states

### ⏳ Phase 3: Update Express Routes
- [ ] Update `/app` route to redirect to Next.js (or proxy)
- [ ] Keep `/auth` routes in Express
- [ ] Keep `/webhooks` routes in Express
- [ ] Keep `/admin/api/*` routes in Express

### ⏳ Phase 4: Migrate Admin Dashboard
- [ ] Create `/admin` Next.js page
- [ ] Migrate admin dashboard components
- [ ] Keep admin API routes in Express

### ⏳ Phase 5: Cleanup
- [ ] Remove EJS templates
- [ ] Remove EJS dependencies
- [ ] Update deployment configs

## 🔧 Configuration

### Next.js Proxy Configuration

The `next.config.js` proxies API requests to Express:

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3000/api/:path*',
    },
    {
      source: '/admin/api/:path*',
      destination: 'http://localhost:3000/admin/api/:path*',
    },
    {
      source: '/auth/:path*',
      destination: 'http://localhost:3000/auth/:path*',
    },
  ];
}
```

### Environment Variables

Create `.env.local` in `app-ui/`:

```env
NEXT_PUBLIC_SHOPIFY_API_KEY=your_api_key
```

## 🎨 UI Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Shopify App Bridge React**
- **TanStack Query** (React Query)
- **Material Icons**

## 🔐 Authentication

For now, authentication is handled by Express:
- OAuth flow stays in Express (`/auth/*`)
- Session management stays in Express
- Next.js makes API calls to Express
- App Bridge provides shop context

## 📝 Notes

1. **No Breaking Changes**: Express backend remains unchanged
2. **Gradual Migration**: Migrate one route at a time
3. **API First**: All API routes stay in Express
4. **UI Only**: Next.js handles UI, Express handles logic

## 🐛 Troubleshooting

### Port Conflicts
- Express runs on port 3000
- Next.js runs on port 3001
- Update ports in configs if needed

### API Calls Failing
- Check proxy configuration in `next.config.js`
- Ensure Express server is running
- Check CORS settings if needed

### Build Issues
- Run `npm install` in both root and `app-ui/`
- Clear `.next` folder: `rm -rf app-ui/.next`
- Check TypeScript errors: `cd app-ui && npm run lint`

## 🚢 Deployment

### Development
- Run both servers separately or together

### Production
- Build Next.js: `npm run build:ui`
- Express serves Next.js static files (or use separate deployments)
- Or deploy Next.js separately (Vercel, etc.)

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Shopify App Bridge React](https://shopify.dev/docs/apps/tools/app-bridge/react-components)
- [TanStack Query](https://tanstack.com/query/latest)
