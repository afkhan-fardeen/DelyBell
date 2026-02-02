-- Add financial_status column to order_logs to properly track payment status
ALTER TABLE order_logs
ADD COLUMN IF NOT EXISTS financial_status TEXT;

-- Create index for filtering by payment status
CREATE INDEX IF NOT EXISTS idx_order_logs_financial_status ON order_logs(financial_status) WHERE financial_status IS NOT NULL;
