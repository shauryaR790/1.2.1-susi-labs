-- Run in Supabase → SQL Editor
-- Orders are written by Vercel API (service role), not from the browser.

create table if not exists orders (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    payment_status text not null default 'pending',
    razorpay_order_id text,
    razorpay_payment_id text,
    amount_paise integer not null,
    currency text not null default 'INR',
    customer_name text not null,
    customer_phone text not null,
    customer_email text not null,
    address_line1 text not null,
    address_line2 text,
    city text not null,
    state text not null,
    pin_code text not null,
    notes text
);

create table if not exists order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references orders(id) on delete cascade,
    product_id text not null,
    product_name text not null,
    unit_price text not null,
    unit_price_paise integer not null,
    qty integer not null default 1 check (qty > 0)
);

create index if not exists order_items_order_id_idx on order_items(order_id);
create index if not exists orders_created_at_idx on orders(created_at desc);
create index if not exists orders_razorpay_order_id_idx on orders(razorpay_order_id);

alter table orders enable row level security;
alter table order_items enable row level security;

-- No anon policies — only service role (API) can read/write.
