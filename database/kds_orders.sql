create table if not exists public.kds_orders (
  id uuid primary key,
  stripe_payment_intent_id text not null unique,
  source text not null default 'ipad_kiosk',
  payment_status text not null default 'awaiting_payment',
  status text not null default 'new',
  currency text not null,
  subtotal_amount integer not null,
  discount_amount integer not null default 0,
  total_amount integer not null,
  item_count integer not null,
  items jsonb not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  status_updated_at timestamptz not null default now(),
  status_updated_by text,
  constraint kds_orders_source_check check (source = 'ipad_kiosk'),
  constraint kds_orders_payment_status_check check (
    payment_status in ('awaiting_payment', 'paid', 'payment_failed', 'canceled')
  ),
  constraint kds_orders_status_check check (status in ('new', 'making', 'ready', 'done')),
  constraint kds_orders_currency_check check (currency ~ '^[a-z]{3}$'),
  constraint kds_orders_amounts_check check (
    subtotal_amount >= 0
    and discount_amount >= 0
    and total_amount > 0
    and subtotal_amount - discount_amount = total_amount
  ),
  constraint kds_orders_item_count_check check (item_count > 0),
  constraint kds_orders_items_check check (
    jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0
  )
);

create index if not exists kds_orders_active_queue_idx
  on public.kds_orders (payment_status, status, paid_at);

alter table public.kds_orders enable row level security;

revoke all on table public.kds_orders from public, anon, authenticated;
grant select, insert, update on table public.kds_orders to service_role;

comment on table public.kds_orders is
  'Paid iPad kiosk order snapshots and their kitchen-display fulfillment status.';
