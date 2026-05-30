-- Run in Supabase → SQL Editor (after orders.sql)
alter table orders add column if not exists payment_method text not null default 'razorpay';
