-- Enhance sync tracking with additional fields for safe mode switching
-- Add auto_sync_enabled_at to shops table to track when auto sync was enabled
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS auto_sync_enabled_at TIMESTAMP WITH TIME ZONE;

-- Add sync tracking fields to order_logs
ALTER TABLE order_logs
ADD COLUMN IF NOT EXISTS last_sync_attempt_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE order_logs
ADD COLUMN IF NOT EXISTS sync_error_message TEXT;

-- Create indexes for efficient querying
-- Note: We can't use subqueries in index predicates, so filtering by auto_sync_enabled_at
-- will be handled in application code by joining with shops table
CREATE INDEX IF NOT EXISTS idx_order_logs_shop_created_at ON order_logs(shop, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shops_auto_sync_enabled_at ON shops(shop, auto_sync_enabled_at) WHERE auto_sync_enabled_at IS NOT NULL;

-- Ensure default sync_mode is manual (already set in 005, but ensure it's correct)
UPDATE shops SET sync_mode = 'manual' WHERE sync_mode IS NULL;
ALTER TABLE shops ALTER COLUMN sync_mode SET DEFAULT 'manual';
