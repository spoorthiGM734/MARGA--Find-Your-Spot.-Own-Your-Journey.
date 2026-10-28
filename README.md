# MARGA – Find Your Spot. Own Your Journey.

Smart parking platform: Node.js + Express + SQLite, plain HTML/CSS/JS frontend. Installable on a phone (PWA).

## Run
1. Install Node.js 18+ (https://nodejs.org)
2. In this folder:  npm install  then  npm start
3. Open http://localhost:3000

The database (db/marga.db) is created and filled with demo data on first run. An older database is backed up automatically
(db/marga.backup-....db) and replaced. To reset: stop the server, delete db/marga.db (and .db-shm / .db-wal), start again.

## Logins
Anyone can sign up with any email (Sign up -> Driver or Operator). Demo accounts:
- Driver:   driver@marga.app   / Driver@123
- Operator: operator@marga.app / Operator@123
- Admin:    admin@marga.app    / Admin@123

## Main features
- Search any place (autocomplete, map click, draggable pin, current location). Real nearby parking from OpenStreetMap for places without MARGA facilities.
- Demo facilities in Delhi, Bengaluru, Mumbai, Hyderabad, Chennai, Pune, Kolkata, plus a large "Orion Mall Parking (Demo)" with 250 slots.
- Vehicle size is found from the brand + model (about 100 models built in) - nobody types measurements. Only slots the vehicle fits are bookable.
- Slot features: EV charging, covered, accessible (permit), height limits. Filters on search and facility pages.
- Operators/admins mark ENTRY and EXIT gates; the layout planner numbers slots by distance from the gates and places accessible / EV slots nearest.
- Booking with double-booking protection, booking fee, QR pass, gate scanner for operators.
- Drive guide (drive.html): mini map, route line, big arrows, voice prompts (English / Hindi / Kannada), to the slot and to the exit.
- Payments: Razorpay (set keys in .env) or a built-in TEST gateway that follows the same order -> payment -> signature -> verify steps. Webhook at /api/payments/webhook.
- Refunds and cancellation rules: 100% if cancelled 60+ min before start, 50% if later, 0% after start / no-show; operator cancel = 100%; unused booking fee refunded at exit.
- Ratings and reviews; drivers can report problems; operators/admins refund fully or partly.
- Rush insights (rush.html): calendar of busy days (festivals, sales, weekends, paydays), hourly graph, weekly heat-map, model accuracy.
  The rush model is a ridge regression trained in-process; the demo history is SAMPLE data, phased out automatically as real bookings grow. Retrains daily.
- Optional smart pricing (surge when busy, discount when quiet) per facility.
- Hindi and Kannada (language switch in the top bar). Translations are drafts - please have a native speaker review them.

## Payments setup (real money)
Put your Razorpay keys in .env (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET) and point the Razorpay webhook to
https://YOUR-DOMAIN/api/payments/webhook (events: payment.captured, order.paid). Set DEMO_PAYMENTS=false and change JWT_SECRET before going live.

## Folders
server.js | db/ (schema, seed) | routes/ | services/ (booking, payments) | utils/ (layout planner, pricing, rush model, vehicles, events, policy) | public/ (pages, css, js, icons, manifest, sw.js)
