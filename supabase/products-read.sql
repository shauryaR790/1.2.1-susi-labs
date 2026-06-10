-- Run in Supabase SQL Editor if logged-in users cannot see products.
-- Safe to run even if a public read policy already exists.

alter table products enable row level security;

drop policy if exists "Public read products" on products;

create policy "Public read products"
    on products for select
    to anon, authenticated
    using (coalesce(is_active, true) = true);
