-- Migration: Add shopify_order_number, total_price, and currency fields
-- This separates Shopify order ID (for API calls) from order number (for display)

-- Add shopify_order_number column (display number like 1022)
ALTER TABLE order_logs 
ADD COLUMN IF NOT EXISTS shopify_order_number INTEGER;

-- Add total_price column (order total from Shopify)
ALTER TABLE order_logs 
ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2);

-- Add currency column (order currency from Shopify)
ALTER TABLE order_logs 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

-- Create index for faster lookups by order number
CREATE INDEX IF NOT EXISTS idx_order_logs_shopify_order_number ON order_logs(shopify_order_number);

-- Update existing records: Extract order_number from shopify_order_id if it's actually a number
-- Note: This assumes existing shopify_order_id values are order_numbers (which is the current bug)
-- After this migration, new orders will have correct IDs
UPDATE order_logs 
SET shopify_order_number = shopify_order_id::INTEGER
WHERE shopify_order_id < 1000000; -- Order numbers are typically < 1M, IDs are > 1B

-- Comment: shopify_order_id should be BIGINT for long IDs (10643266011430)
-- shopify_order_number should be INT for display numbers (1022)
-- They are now properly separated
