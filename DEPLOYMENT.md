# Deployment and operation

This branch builds the migrated personal site and a separate Apps Script HTML-service booking entry point from shared Svelte/shadcn-svelte components. Source is implemented; Google/Stripe account acceptance must still be run. No credentials or production configuration are supplied by this repository.

## Local verification

Node 24: `npm ci`, `npm run check`, `npm test`, `npm run build`.
Browser checks: `npx playwright install chromium`, then `npm run test:browser`.
`npm run dev` serves the website. `npm run dev:booking` serves the booking UI; Google RPC exists only in its deployed HTML-service context. Browser tests inject an explicit Google/Stripe-boundary mock; they do not demonstrate actual payments or Google authorization.
Build outputs: `build/` (site) and `backend/Booking.html` (self-contained Apps Script UI).

## Hosting decision before public cutover

GitHub Pages restricts sites primarily facilitating commercial transactions: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits . A personal portfolio with an external booking link is a different arrangement from hosting the booking business on Pages, but this repository does not claim a policy exception. Resolve applicability before publishing the advisory addition. Existing production Jekyll `/docs` remains untouched until cutover; it is legacy deployment input, not the source to edit going forward. Keeping it avoids breaking the currently configured branch-based deployment while the migration is reviewed. At the approved cutover remove the old `/docs` source and replace its build/deployment configuration in the same change. Do not maintain two sites.

The static build can deploy to an appropriate static host without changing the domain or application code. No DNS, hosting setting, or production deployment is automated here. The checks workflow uploads reviewable build artifacts. If GitHub Pages is selected after resolving policy, switch Pages to GitHub Actions and deploy the static artifact with the official Pages actions; keep `CNAME`, HTTPS and direct route loading. Do not commit a generated build over hand-maintained source.

## Google account setup

1. Create a **private Google Sheet**. Open Extensions → Apps Script to create a bound project. Do not share edit access to the Sheet/script; editors can read Script Properties and change backend code.
2. Build locally. Add `Domain.gs`, `Booking.gs`, `Owner.gs`, and generated `Booking.html` to the bound project; enable manifest editing and use `backend/appsscript.json`. Enable the Advanced Calendar service (v3). Review requested permissions before authorizing with your personal Google account.
3. Optional CLI deployment: use Google's clasp tooling against the **existing bound project**, not a new unrelated script. Keep its project ID in ignored `.clasp.json` with `rootDir: "backend"`; `backend/.claspignore` includes only runtime files. Authenticate locally; never commit `.clasprc.json` or OAuth refresh tokens. See https://github.com/google/clasp .
4. Under Project Settings → Script Properties, set `BOOKING_CONFIG` to the JSON from `backend/config.example.json`, completed as below. Set `STRIPE_API_KEY` separately. Do not put either in a public frontend environment variable.
5. Set your personal owner email, Sheet ID, destination Calendar ID and calendars to check for conflicts. The organizer must have read access to all conflict calendars and write access to the destination calendar.
6. Choose `meetingMode`: `google-meet` requests a fresh conference through Calendar's documented `conferenceData.createRequest` API, or `link` uses your configured `meetingLocation`. For Google Meet, confirmation waits until the event contains a video link. Validate that the destination Calendar supports `hangoutsMeet`; a pending/failed conference remains visible for retry rather than sending an invitation confirmation with a missing link. Reference: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert .
7. Run `setupBooking_` as the owner; authorize the script. It creates Bookings and History, adds the shared five-minute trigger, and generates `BOOKING_SIGNING_KEY`. Keep this signing key stable; rotating it invalidates customer management links.
8. Deploy as Web app, execute as **Me**, public access **Anyone**. Copy its `/exec` URL to `webAppUrl`. Verify anonymous access in an incognito browser. The booking UI is served by Apps Script and uses `google.script.run`; it is not assumed to be a cross-origin JSON API for GitHub Pages.
9. Reload the Sheet to see the AI Advisory menu. `validateBooking_` lists missing configuration. Privileged menu handlers end in `_` and are not remotely callable through `google.script.run`. They additionally require your active Google identity to equal `ownerEmail`.

### Configuration that must be supplied

Confirmed: USD 50000 cents, 60 minutes, Monday–Saturday noon–6 p.m., `America/Los_Angeles` (Pacific time follows PST/PDT), no customer refunds, cancellation retains paid rescheduling credit, private Sheet management.
Still required: account IDs, owner email, deployment URL and meeting configuration verification. The supplied configuration imposes no additional minimum notice, buffer or rescheduling deadline, shows a rolling 90-day availability window, and leaves optional reminder emails off. These are operational settings, not extra cancellation restrictions. The no-refund policy and paid rescheduling credit are prefilled from the owner’s instructions. `weeklyHours` uses weekday numbers (0 Sunday–6 Saturday) and arrays of start/end minutes after midnight. Example syntax only: `{"1":[[600,720]]}` means Monday 10am–noon, not an adopted schedule. The actual Monday–Saturday noon–6 p.m. windows are prefilled.
`enabled` remains false until account tests and policy settings are complete. The backend rejects an incomplete enabled config.
The accepted refund terms and policy text are saved per booking. Cancellation keeps the payment credit; rescheduling a cancelled paid booking creates a new deterministic Calendar event without creating another Checkout Session. After delivering a session, use “Mark selected session completed” to close that session’s credit. An uncompleted paid credit remains reschedulable.

## Stripe

Start in test mode. Use a restricted API key for Checkout Session creation/retrieval/expiration, PaymentIntent read (including expanded Charge), and Refund creation/retrieval. Confirm Stripe's current permission labels and whether inline Checkout price/product data needs additional permissions. Use only the required permissions. Do not grant account-wide write access as a shortcut.
Hosted Checkout is card-only. Card details never enter Sheets or Apps Script. The amount/currency are server-authoritative; the browser cannot choose a price. Checkout creation and refunds use idempotency keys. Holds last 30 minutes and are not released until Stripe reports expiration. A network error leaves the hold blocked for review rather than risking a second purchase.

### Payment confirmation design and limitation

Apps Script's documented incoming request event does not expose arbitrary headers needed for Stripe signature verification. It is not used as a signed webhook endpoint. The UI success redirect never establishes payment. The scheduled job retrieves pending Checkout Sessions from Stripe and verifies paid status, amount, currency and booking IDs before creating an event.
This is a deliberate polling design, **not Stripe's recommended webhook fulfillment architecture**. It trades immediate confirmation for a typical five-minute check interval; Apps Script trigger delays and outages can extend this. Validate with the actual account and decide whether that tradeoff is acceptable before live activation. If signed webhooks are required, add a conventional HTTPS receiver; do not route unsigned payment data into confirmation.
A user can refresh status to request the same authoritative check. Processing also continues if they never return from Checkout. Scheduled work has a 15-second processing budget per invocation; monitor execution time, backlog and daily trigger runtime. Rotate through a persisted cursor to avoid starving later rows. Verify refunds issued directly in Stripe through the periodic charge check; partial refunds require owner review.

## Owner workflow

Open the private Sheet. Bookings shows session time, customer, question, booking/payment status, amount, Calendar link, Checkout link and attention message. System JSON is hidden. Do not edit system-managed cells; the warning protection helps prevent accidents but is not an access control boundary.
Use the AI Advisory menu to refresh/retry, reschedule, cancel without refund, cancel with full refund, or reveal a customer management link. Monetary/cancellation actions require an explicit Sheet confirmation. No such action is exposed by the public RPC. Owner rescheduling validates availability but can override customer rescheduling deadlines.
Keep management links private: they are bearer capabilities. Owner email notifications contain customer context; Sheets and Calendar should not be shared publicly. No card details are stored. Decide and document a customer-data retention period before launch; archive/delete only settled records after the retention period and reconciliation needs are satisfied.

## Required account acceptance checks

- [ ] Owner authorization works; signed-out visitor can load/book without authorizing your Google account.
- [ ] Public callers cannot invoke menu helpers, list bookings, read Sheet records, credentials, or Calendar event details.
- [ ] Real Calendar busy/all-day/recurring events and timezone transitions produce correct availability.
- [ ] Two browser sessions selecting the same slot yield only one reservation.
- [ ] Test card succeeds, declines and requires authentication; Stripe permissions support every intended operation.
- [ ] Close browser after payment: trigger confirms once with invitation and owner/customer email.
- [ ] Expired Checkout cannot purchase a released slot. Test payment racing with expiration.
- [ ] Calendar insert fails after payment: row remains paid and retry reuses deterministic event ID.
- [ ] Notifications and reminders work within the personal-account mail quota.
- [ ] Reschedule and cancellation deadlines match displayed policies; policies survive later config edits.
- [ ] Full/partial/pending/failed refunds are correctly surfaced; retry never creates a second refund.
- [ ] All confirmation/manage links work through the real Apps Script sandbox and Stripe redirect.
- [ ] Customer data retention/privacy wording and business policies are complete.
- [ ] Hosting policy resolved; migrated URLs, feed, sitemap, custom domain and 404 verified after cutover.

## Monitoring and recovery

Use Apps Script Executions for failures/runtime and the Sheet's attention column/History for booking-specific issues. Consumer limits: 100 mail recipients/day, 20,000 URL Fetch calls/day, 90 trigger runtime minutes/day, 6 minutes/execution and 30 simultaneous executions/user. Quotas are shared with your other scripts and may change. See https://developers.google.com/apps-script/guides/services/quotas .
If quota/network errors occur, do not manually release pending paid/unknown reservations. Inspect Stripe first. Retry through the Sheet. If Calendar conflicts after payment, contact the customer and use owner reschedule/full-refund. Do not delete transaction records to hide errors. Background jobs and notifications are retryable; email delivery has an unavoidable send/persist crash window, so a duplicate notification is possible even though calendar/payment operations are idempotent.
To pause new reservations set `enabled:false`; existing bookings must continue to be processed by the background job. Temporarily disable public access only if necessary, preserving owner recovery access.
Rollback website deployment to the prior artifact/commit. Keep the backend and Sheet available to manage existing bookings; do not delete records, revoke keys, or rotate the signing key as part of a frontend rollback.

## Prepared account artifact

The connected Google account's private booking Sheet has already been created with Read me, Bookings, and History. Use that file rather than creating another one. Its account-specific settings are in ignored `.local/booking-config.json` in this workspace; the public example intentionally has empty account identifiers. Open that Sheet's Extensions → Apps Script to create its bound backend, then follow the setup steps above. Existing prepared tabs are compatible with the idempotent setup function.

Set `PUBLIC_BOOKING_URL` in a local `.env` or as a GitHub repository variable when building the website. It is injected at build time and is public; the Stripe key is not. The checks workflow reads the public deployment URL from repository variables.
