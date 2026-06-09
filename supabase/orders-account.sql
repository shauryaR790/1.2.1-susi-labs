-- Run in Supabase → SQL Editor (after orders.sql)
-- Adds customer accounts, fulfillment tracking, and RLS for My Orders.

alter table orders
    add column if not exists user_id uuid references auth.users(id) on delete set null,
    add column if not exists fulfillment_status text not null default 'awaiting_payment',
    add column if not exists tracking_number text,
    add column if not exists courier text default 'Delhivery',
    add column if not exists shipped_at timestamptz,
    add column if not exists estimated_delivery date;

create index if not exists orders_user_id_idx on orders(user_id);
create index if not exists orders_customer_email_idx on orders(lower(customer_email));

-- Backfill paid orders created before this migration
update orders
set fulfillment_status = 'confirmed'
where payment_status = 'paid'
  and fulfillment_status = 'awaiting_payment';

-- Authenticated users can read their own orders (by user_id or matching email)
create policy "Users read own orders"
    on orders for select
    to authenticated
    using (
        user_id = auth.uid()
        or lower(customer_email) = lower(auth.jwt()->>'email')
    );

create policy "Users read own order items"
    on order_items for select
    to authenticated
    using (
        exists (
            select 1 from orders
            where orders.id = order_items.order_id
              and (
                  orders.user_id = auth.uid()
                  or lower(orders.customer_email) = lower(auth.jwt()->>'email')
              )
        )
    );

-- Supabase Dashboard → Authentication → Providers → Email:
-- Enable email provider. For faster signup, you may disable "Confirm email" during testing.
