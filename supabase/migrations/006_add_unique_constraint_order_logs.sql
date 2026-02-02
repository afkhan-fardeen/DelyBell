-- Add unique constraint to prevent duplicate orders
-- This ensures one order per shop can only have one log entry
-- When syncing manually, it will update the existing record instead of creating a duplicate

-- First, remove any duplicate entries (keep the most recent one)
DELETE FROM order_logs
WHERE id NOT IN (
  SELECT DISTINCT ON (shop, shopify_order_id) id
  FROM order_logs
  ORDER BY shop, shopify_order_id, created_at DESC
);

-- Add unique constraint
ALTER TABLE order_logs
ADD CONSTRAINT unique_shop_order UNIQUE (shop, shopify_order_id);

-- Create index for faster lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_order_logs_shop_order ON order_logs(shop, shopify_order_id);
