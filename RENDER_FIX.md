# Render Build Fix - PNPM Version

## Problem
Render detected `pnpm-lock.yaml` and tried to use pnpm, but the lockfile was out of sync with `package.json` after adding `@supabase/supabase-js`.

## Solution Applied ✅
1. ✅ Updated `render.yaml` to use `pnpm install` (you're using pnpm)
2. ✅ Ran `pnpm install --no-frozen-lockfile` to update `pnpm-lock.yaml`
3. ✅ `pnpm-lock.yaml` now includes `@supabase/supabase-js`

## Next Steps ✅

**Done!** The `pnpm-lock.yaml` has been updated with Supabase dependency.

Now commit and push:
```bash
git add pnpm-lock.yaml render.yaml
git commit -m "Add Supabase dependency and update pnpm lockfile"
git push
```

## Verify
After pushing, check Render build logs:
- Should see: `pnpm install` (or `pnpm install --no-frozen-lockfile` in CI)
- Should see: `@supabase/supabase-js` being installed
- Build should succeed ✅

## Render Configuration
Render will automatically:
- Detect `pnpm-lock.yaml` and use pnpm
- Run `pnpm install` during build
- Use `--no-frozen-lockfile` flag in CI (as per Render defaults)

## If Build Still Fails
1. Check Render dashboard → Environment → Build Command
2. Ensure it's set to: `pnpm install` (or leave auto-detected)
3. Render should auto-detect pnpm from `pnpm-lock.yaml`
4. If needed, manually set build command to: `pnpm install --no-frozen-lockfile`
