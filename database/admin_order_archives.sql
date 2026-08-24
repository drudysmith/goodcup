create table if not exists public.admin_order_archives (
  order_key text primary key,
  archived_at timestamptz not null default now(),
  archived_by text,
  constraint admin_order_archives_key_length check (char_length(order_key) between 1 and 255)
);

alter table public.admin_order_archives enable row level security;

revoke all on table public.admin_order_archives from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_order_archives to service_role;
