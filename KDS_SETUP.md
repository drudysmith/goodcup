# Goodcup KDS beta setup

The KDS is a protected, phone-first order board at `/kds`. It uses the existing Goodcup admin login and displays only successfully paid iPad kiosk orders.

## One-time Supabase setup

Run `database/kds_orders.sql` in the Supabase SQL editor for the environment being tested. The table has Row Level Security enabled and grants no browser access to `anon` or `authenticated`; the website's server-side service role performs all reads and writes.

## Shared ingestion secret

Generate one strong random secret outside source control. Configure the exact same value in:

- Netlify as `KDS_INGEST_SECRET`.
- The local website `.env.local` as `KDS_INGEST_SECRET` when testing locally.
- The kiosk Node backend `.env` as `KDS_INGEST_SECRET`.

Do not put this secret in the Swift app, a public `NEXT_PUBLIC_` variable, source control, screenshots, or logs.

Set the kiosk backend's `KDS_REGISTRATION_URL` to:

- Local testing: `http://localhost:3000/api/kds/register`
- Deployed site: `https://goodcup.me/api/kds/register`

If the iPad uses a different Mac than the website development server, use that Mac's reachable local-network hostname instead of `localhost`.

## Stripe webhook events

The existing signed webhook at `/api/stripeWebhook` must receive these additional snapshot events from the live Stripe account used by the kiosk:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

Keep the live endpoint's `STRIPE_WEBHOOK_SECRET` configured in Netlify. The KDS only exposes an order after `payment_intent.succeeded` matches both its order ID and PaymentIntent ID.

## Local verification

1. Start the website with `npm run dev` from the website repository.
2. Start the kiosk backend with `npm start` from its `backend` directory.
3. Open `http://localhost:3000/kds` on a phone-sized browser and sign in with an existing Goodcup admin account.
4. When ready for an authorized real-world check, complete a live kiosk payment.
5. Confirm that the order appears with the correct products and quantities.
6. Tap `New`, `Making`, `Ready`, and `Done` and confirm that each state persists after refresh.

The kiosk refuses to begin a new payment if the order snapshot cannot first be registered. If registration fails after Stripe creates the PaymentIntent, the backend attempts to cancel that unregistered intent.
