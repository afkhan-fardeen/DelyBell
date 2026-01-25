# Architecture Refactor - Split Public Install from Embedded App

## Problem

The current `/` route is doing too much:
- Marketing landing page
- Installer
- OAuth launcher
- Embedded admin UI
- Debug UI
- Custom-app connector

This causes:
- Complexity
- Edge-case bugs
- Shopify iframe weirdness
- Hard-to-debug failures (400 errors)

## Solution: Split into Two Pages

### 1. `/` - Public Landing/Install Page (STATIC)
- Purpose: Accept shop domain, redirect to OAuth
- Static HTML (no App Bridge, no SHOPIFY_API_KEY)
- Safe to be static
- No Shopify iframe here

### 2. `/app` - Embedded Shopify Admin Page (EJS)
- Purpose: Actual app UI inside Shopify Admin
- MUST be server-rendered (EJS template)
- Injects SHOPIFY_API_KEY
- Uses App Bridge
- Assumes shop context exists
- Simplified shop detection (URL params only)
- Removed: Manual shop input, custom app connector, installation guides

## Implementation Steps

1. ✅ Created simple static `/` page (public/index.html)
2. ⏳ Create `/app` route with EJS template
3. ⏳ Configure Express to use EJS
4. ⏳ Update OAuth callback to redirect to `/app`
5. ⏳ Clean up embedded app UI (remove manual inputs, custom app flow)

## Files Changed

- `public/index.html` - Now simple static install page
- `views/app.ejs` - New embedded app template (to be created)
- `routes/admin.js` - Update to handle `/` (static) and `/app` (EJS)
- `server.js` - Configure EJS view engine
- `routes/auth.js` - Update callback redirect to `/app`
- `package.json` - Add `ejs` dependency

## Next Steps

1. Install EJS: `pnpm add ejs`
2. Create `views/app.ejs` from cleaned-up embedded UI
3. Update `server.js` to configure EJS
4. Update `routes/admin.js` to serve `/app` with EJS
5. Update `routes/auth.js` callback redirect
6. Test installation flow
7. Test embedded app in Shopify Admin
