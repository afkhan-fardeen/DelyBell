-- Create problem_reports table for storing merchant-reported issues
CREATE TABLE IF NOT EXISTS problem_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop TEXT NOT NULL,
  shopify_order_id BIGINT,
  shopify_order_number TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_problem_reports_shop ON problem_reports(shop);
CREATE INDEX IF NOT EXISTS idx_problem_reports_status ON problem_reports(status);
CREATE INDEX IF NOT EXISTS idx_problem_reports_reported_at ON problem_reports(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_problem_reports_shop_order ON problem_reports(shop, shopify_order_id) WHERE shopify_order_id IS NOT NULL;

-- Add foreign key constraint (optional, for referential integrity)
-- Note: This assumes order_logs table exists with shop and shopify_order_id columns
-- ALTER TABLE problem_reports
-- ADD CONSTRAINT fk_problem_reports_order
-- FOREIGN KEY (shop, shopify_order_id)
-- REFERENCES order_logs(shop, shopify_order_id)
-- ON DELETE SET NULL;
