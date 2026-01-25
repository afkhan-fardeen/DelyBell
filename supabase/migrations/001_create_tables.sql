-- Create shops table for storing Shopify OAuth sessions
create table shops (
  shop text primary key,
  access_token text not null,
  scopes text,
  installed_at timestamp default now()
);

-- Create order_logs table for tracking order processing
create table order_logs (
  id uuid default gen_random_uuid() primary key,
  shop text not null,
  shopify_order_id bigint not null,
  delybell_order_id text,
  status text,
  error_message text,
  created_at timestamp default now()
);

-- Create index for faster lookups
create index idx_order_logs_shop on order_logs(shop);
create index idx_order_logs_shopify_order_id on order_logs(shopify_order_id);
create index idx_order_logs_status on order_logs(status);
