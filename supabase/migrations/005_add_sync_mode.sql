-- Add sync_mode column to shops table
-- sync_mode: "auto" | "manual" (default: "manual")
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS sync_mode TEXT DEFAULT 'manual' CHECK (sync_mode IN ('auto', 'manual'));

-- Add synced_at column to order_logs table
-- synced_at: timestamp when order was synced to Delybell (null if not synced)
ALTER TABLE order_logs
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;

-- Update status to support "pending_sync"
-- pending_sync: Order saved but not yet synced to Delybell (manual mode)
-- processed: Order successfully synced to Delybell
-- failed: Order sync failed
-- Note: Existing CHECK constraint might need to be updated, but we'll handle it gracefully in code

-- Create index for faster lookups of pending sync orders
CREATE INDEX IF NOT EXISTS idx_order_logs_status_pending_sync ON order_logs(shop, status) WHERE status = 'pending_sync';

-- Create index for synced_at lookups
CREATE INDEX IF NOT EXISTS idx_order_logs_synced_at ON order_logs(synced_at) WHERE synced_at IS NOT NULL;
