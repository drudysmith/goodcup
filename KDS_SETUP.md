# Goodcup KDS beta setup

The KDS is a protected, phone-first order board at `/kds`. It uses the existing Goodcup admin login and displays only successfully paid iPad kiosk orders.

## Production Supabase

The `create_kds_orders` migration was applied to the active production `goodcup` project on 2026-09-18. The table has Row Level Security enabled and grants no browser access to `anon` or `authenticated`; the website's server-side service role performs all reads and writes.

`database/kds_orders.sql` remains the repository copy of that schema.

## Order handoff

The kiosk backend writes its already-validated product names, Stripe Product/Price IDs, quantities, subtotal, and discount into the live card-present PaymentIntent metadata. The signed Stripe `payment_intent.succeeded` webhook validates that snapshot and writes the paid order to Supabase. The iPad and kiosk backend require no Supabase or Netlify secret.

## Stripe webhook events

The existing signed webhook at `/api/stripeWebhook` receives this snapshot event from the live Stripe account used by the kiosk:

- `payment_intent.succeeded`

Keep the live endpoint's `STRIPE_WEBHOOK_SECRET` configured in Netlify. The KDS only exposes an order after `payment_intent.succeeded` matches both its order ID and PaymentIntent ID.

## Local verification

1. Deploy the website webhook code through the normal GitHub-to-Netlify production flow.
2. Start the kiosk backend with `npm start` from its `backend` directory.
3. Open `https://goodcup.me/kds` on a phone-sized browser and sign in with an existing Goodcup admin account.
4. When ready for an authorized real-world check, complete a live kiosk payment.
5. Confirm that the order appears with the correct products and quantities.
6. Tap `New`, `Making`, `Ready`, and `Done` and confirm that each state persists after refresh.

Stripe payment remains authoritative. A temporary KDS/database problem must not prevent the kiosk from creating and completing an otherwise valid payment; Stripe retries failed webhook deliveries separately.
