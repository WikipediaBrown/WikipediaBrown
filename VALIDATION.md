# Validation and delivery status

## Passed locally

- `npm run check`: both website and separately hosted booking Svelte/TypeScript projects; zero errors/warnings.
- `npm test`: 22 backend tests pass (scheduling, Pacific DST/all-day events, reservation conflicts, idempotent checkout, policy consent, mismatched payment rejection, confirmation without redirect, Calendar recovery, expiration/payment races, refund idempotency, paid credit rebooking, pending Google Meet, formula-safe spreadsheet values, private owner function surface).
- `npm run build`: prerendered SvelteKit site and self-contained Apps Script HTML bundle build successfully.
- `npm run test:browser`: 13 desktop/mobile checks pass; one desktop-only skip of the mobile-nav-specific test. Covers homepage/navigation/canvas, five posts and preserved routes, copy controls, feed/sitemap, terminal 404, reduced motion, booking intake/consent/Checkout URL, and cancellation then paid rebooking. Google RPC is explicitly mocked in browser tests, not live.
- Desktop/mobile screenshots inspected. Corrected Tailwind shared-component scanning so generated controls have their documented dimensions.
- `git diff --check`: clean.

## Google Sheet prepared through connected account

A private native spreadsheet was created in the account's ChatGPT folder with Read me, Bookings, and History tabs. Verified timezone America/Los_Angeles, column headers, no-refund/paid-rescheduling instructions, frozen headers, system-column hiding configuration, attention formatting, and owner-only sharing metadata through connector readback. No fake bookings were inserted. Visual fit was checked through API formatting/width metadata; no authenticated Google browser render was available.

The actual Sheet ID and owner email are kept in ignored local deployment configuration, not committed to the public repository. The Sheet is a real prepared artifact; Apps Script menu/actions are not installed until the bound script is uploaded and authorized.

## Required live checks — not claimed as passed

No Stripe account/key, Apps Script deployment or Google Calendar authorization has been supplied. Therefore real Google/Stripe payment, invitation, Meet, trigger, public-access and owner-menu behavior remains unexecuted. DEPLOYMENT.md supplies the complete account acceptance checklist. The booking app stays disabled and the public link stays unconfigured until setup is complete. Payment confirmation is a polling design rather than Stripe's recommended signed-webhook integration; account acceptance must explicitly verify that tradeoff.

Production Jekyll /docs and its existing deployment have not been changed. The migration is reviewable on a branch; the remaining production cutover must change the source/build and retire legacy /docs together after hosting applicability and account setup are resolved.
