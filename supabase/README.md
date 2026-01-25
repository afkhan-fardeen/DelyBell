# Supabase Setup Instructions

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up / Sign in
3. Click "New Project"
4. Fill in:
   - Project name: `delybell-shopify`
   - Database password: (choose a strong password)
   - Region: Choose closest to your Render deployment
5. Wait for project to be created (~2 minutes)

## Step 2: Get Credentials

1. Go to Project Settings → API
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important:** Use Service Role Key (not anon key) - it bypasses RLS and is safe for server-side use.

## Step 3: Run Migrations

### Option A: Using Supabase Dashboard (Easiest)

1. Go to SQL Editor in Supabase Dashboard
2. Click "New Query"
3. Copy contents of `supabase/migrations/001_create_tables.sql`
4. Paste and click "Run"
5. Verify tables created in Table Editor

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## Step 4: Verify Tables

Go to Table Editor and verify:
- ✅ `shops` table exists
- ✅ `order_logs` table exists
- ✅ Indexes created

## Step 5: Set Environment Variables in Render

Add to Render Dashboard → Environment Variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Security Notes

- ✅ Service Role Key is safe for server-side use
- ✅ Never expose Service Role Key in client-side code
- ✅ Tables don't need RLS (server-side only access)
- ✅ Access tokens encrypted at rest by Supabase
