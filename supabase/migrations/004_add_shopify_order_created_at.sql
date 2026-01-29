-- Migration: Add shopify_order_created_at field to store when the order was placed in Shopify
-- This allows us to show the correct order placement time, not just sync time

-- Add shopify_order_created_at column
ALTER TABLE order_logs 
ADD COLUMN IF NOT EXISTS shopify_order_created_at TIMESTAMP;

-- Create index for faster lookups by order creation date
CREATE INDEX IF NOT EXISTS idx_order_logs_shopify_order_created_at ON order_logs(shopify_order_created_at);
