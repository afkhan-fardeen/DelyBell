-- Migration: Add customer_name and phone fields to order_logs
-- These fields are needed for the operations admin dashboard

-- Add customer_name column
ALTER TABLE order_logs 
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add phone column
ALTER TABLE order_logs 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for faster lookups by phone
CREATE INDEX IF NOT EXISTS idx_order_logs_phone ON order_logs(phone);
