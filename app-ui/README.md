# Delybell App UI (Next.js)

This is the Next.js frontend for the Delybell Order Sync app. It runs alongside the Express backend server.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SHOPIFY_API_KEY=your_shopify_api_key_here
```

### Development

```bash
npm run dev
```

The app will run on http://localhost:3001

### Build

```bash
npm run build
npm start
```

## Architecture

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shopify App Bridge React** for embedded app functionality
- **TanStack Query** for data fetching and caching

## API Integration

All API calls are proxied to the Express server running on port 3000. See `next.config.js` for proxy configuration.

## Components

- `AppContent` - Main app container
- `HealthCards` - Connection status cards
- `SyncModeCard` - Sync mode toggle and explanation
- `SettingsCard` - Collapsible settings
- `OrdersCard` - Orders table with filtering and pagination
- `ToastContainer` - Toast notifications
- `DarkModeToggle` - Dark mode switcher

## Migration Status

✅ Phase 1: Setup complete
🔄 Phase 2: `/app` route migration in progress
⏳ Phase 3: Express route updates pending
⏳ Phase 4: Admin dashboard migration pending

See `../MIGRATION_GUIDE.md` for full migration details.
