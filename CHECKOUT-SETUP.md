# Checkout setup — SUSI LABS

Follow these steps **in order**. Payment only works on **Vercel** (or `vercel dev` locally), not on plain `file://` or static `serve` without API routes.

---

## 1. Supabase — orders tables

1. Open **Supabase → SQL Editor**
2. Run the full script in **`supabase/orders.sql`**
3. Confirm tables **`orders`** and **`order_items`** appear in Table Editor

Get your **service role key** (server only — never put in frontend):

- **Project Settings → API → `service_role` `secret`**

---

## 2. Razorpay (already integrated)

Standard Checkout is wired in this repo:

| Step | Implementation |
|------|----------------|
| Create order | `POST /api/create-order` → Razorpay `POST /v1/orders` (via `lib/razorpay.js`) |
| Open modal | `checkout.html` loads `checkout.razorpay.com/v1/checkout.js`; **Pay with card** in `checkout-page.js` |
| Verify signature | `POST /api/verify-payment` → HMAC-SHA256 `order_id\|payment_id` |

1. Sign up at [https://razorpay.com](https://razorpay.com)
2. Complete KYC when ready; use **Test Mode** first
3. **Settings → API Keys** → copy into Vercel env (and local `.env` from `.env.example`):
   - `RAZORPAY_KEY_ID` (starts with `rzp_test_` or `rzp_live_`)
   - `RAZORPAY_KEY_SECRET` — **server only**, never in frontend

Test cards / UPI: [Razorpay test docs](https://razorpay.com/docs/payments/payments/test-card-upi-details/)

---

## 3. Email to admin (Resend)

1. Sign up at [https://resend.com](https://resend.com)
2. Create an API key
3. For quick testing you can send from `onboarding@resend.dev` to your Gmail
4. For production, verify your domain in Resend

Admin inbox: **dcchampavat@gmail.com**

---

## 4. Vercel environment variables

**Project → Settings → Environment Variables** — add for **Production** (and Preview):

| Variable | Value |
|----------|--------|
| `SUSI_SUPABASE_URL` | `https://ajrtuvbgppsrptgvwbsf.supabase.co` |
| `SUSI_SUPABASE_ANON_KEY` | your publishable key (already set) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role secret from Supabase |
| `RAZORPAY_KEY_ID` | Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret |
| `ADMIN_EMAIL` | `dcchampavat@gmail.com` |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | optional — e.g. `SUSI LABS <onboarding@resend.dev>` |
| `UPI_VPA` | optional — defaults to `6356425245@ptaxis` |
| `UPI_PAYEE_NAME` | optional — **must match the name on your Paytm UPI account** (defaults to `SUSI LABS`) |

Then **Redeploy**.

---

## 4b. UPI column (if you already ran orders.sql)

Run `supabase/orders-upi.sql` in Supabase SQL Editor once.

---

## 5. Test the flow

1. Add a product to cart on your **live Vercel URL**
2. Cart → **Continue to checkout**
3. Fill shipping form → **Pay with UPI / card**
4. Complete Razorpay test payment
5. You should land on **checkout-success.html**
6. Check **Supabase → orders** (payment_status = `paid`)
7. Check **dcchampavat@gmail.com** for order email

---

## Pages added

- `checkout.html` — form + Razorpay
- `checkout-success.html` — thank you
- `api/create-order.js` — save order + create Razorpay order
- `api/verify-payment.js` — verify payment + email admin

---

## Local API testing

```bash
npm i -g vercel
vercel dev
```

Open the URL `vercel dev` prints (not `localhost:5500`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Supabase not configured" on products | `SUSI_SUPABASE_*` env vars + redeploy |
| "Checkout API unavailable" | Must use Vercel deploy or `vercel dev` |
| Payment works, no email | Add `RESEND_API_KEY`; check Resend logs |
| Order not in Supabase | Run `orders.sql`; check `SUPABASE_SERVICE_ROLE_KEY` |
