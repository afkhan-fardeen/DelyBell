# Render Deployment Guide

## Important: Using npm (not pnpm)

This project uses **npm** for package management. Render may try to auto-detect pnpm, but we've configured it to use npm.

### Configuration Files

1. **package.json** - Contains `"packageManager": "npm@10.0.0"` to explicitly specify npm
2. **package-lock.json** - Must be committed to ensure npm is used
3. **render.yaml** - Explicitly uses `npm ci` and `npm start`

### Deployment Steps

1. **Ensure package-lock.json is committed:**
   ```bash
   git add package-lock.json
   git commit -m "Add package-lock.json for npm"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **In Render Dashboard:**
   - If using Blueprint (render.yaml), Render will auto-detect the configuration
   - If manually creating service, ensure:
     - Build Command: `npm ci`
     - Start Command: `npm start`
     - Environment: `Node`

### Troubleshooting

**Error: "Headless installation requires a pnpm-lock.yaml file"**

This means Render is trying to use pnpm. Fix by:

1. Ensure `package-lock.json` exists and is committed
2. Ensure `package.json` has `"packageManager": "npm@10.0.0"`
3. In Render dashboard, manually set:
   - Build Command: `npm ci`
   - Start Command: `npm start`
4. Delete and recreate the service if needed

**Verify npm is being used:**

Check Render build logs - you should see:
```
npm ci
npm start
```

NOT:
```
pnpm install
pnpm start
```

### Environment Variables

Make sure all required environment variables are set in Render dashboard (see render.yaml comments).
