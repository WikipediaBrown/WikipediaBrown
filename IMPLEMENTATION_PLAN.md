# Complete site migration and advisory booking

## Agreed scope
- Convert existing Jekyll site to SvelteKit with shadcn-svelte UI; use maintained components instead of bespoke interaction code.
- Preserve the custom three-layer starfield, shooting stars, satellites, reduced motion and mobile scrolling behavior.
- Preserve homepage content, contact, all five posts and their /blog/:slug/ routes, feed, sitemap, SEO and terminal 404.
- Replace every office-hours reference with booking access.
- Google personal account: Apps Script runtime, private Sheets records, Calendar availability/events, Stripe Checkout.
- No Calendly subscription. Keys stay server-side. No live rollout or invented business settings.

## Execution order and acceptance
1. Inventory existing files and documented APIs; retain source baseline in git.
2. Set up SvelteKit static build and shadcn CLI; theme actual generated components.
3. Migrate routes/content and wrap star renderer in lifecycle-aware persistent component.
4. Build shared booking components and Apps Script HTML-service bundle using google.script.run; public site links to hosted tool. Embedded hosting is not assumed.
5. Implement server-authoritative config, slots, locked reservations, Stripe checkout and reconciliation, Calendar invitations, notifications, reminders, cancellation/rescheduling/refunds, owner-only Sheet actions and operational history.
6. Test build/types, concurrency/state transitions/retries and browser flows. Deploy integrations only with user account credentials/configuration. Capture unexecuted live checks explicitly.
7. Supply review branch/PR, deployment instructions and rollback.

## Decisions and prerequisites
- Confirmed by owner: $500 USD / 60 minutes; Pacific time; Mon–Sat noon–6 p.m.; no refunds; paid sessions can be rescheduled to available times; private Google Sheet with booking actions. Remaining account settings: calendar/Sheet IDs, owner address, Stripe key, Google authorization and deployment URL.
- Stripe restricted key; Google owner authorization; Apps Script deployment URL. Never commit secrets.
- GitHub Pages policy limits transaction-focused sites. Do not change hosting/DNS or enable commerce on Pages without resolving applicability. Keep booking hosted externally and configurable; a link does not establish policy compliance.
- Apps Script has no documented incoming header access for Stripe signed webhook verification. Poll authoritative Checkout Sessions for pending payments and reconcile refunds; document that this diverges from Stripe's recommended webhook fulfillment and requires deployed verification before launch. Never trust redirects or unsigned incoming payment data.
- Public Apps Script execute-as-owner and Sheet owner-only menu must be tested with signed-out visitor. No public RPC exposes owner operations.

## Done means
Complete source migration and lifecycle implementation; passed available automated checks; explicit deployment acceptance checklist for real Google/Stripe accounts; no false claim that a live integration was tested without credentials.

## Component replacements
- Mobile menu → shadcn Sheet (focus/dismissal/scroll lock from Bits UI).
- About/Now/post-list panels → Card.
- Navigation actions and code-copy controls → Button.
- Booking picker → Calendar, Select; intake → Input, Textarea, Label, Checkbox.
- Booking state → Alert and Badge; advisory FAQ → Accordion.
- Separator retained as a generated Select dependency. Unused Table family removed.
- No extra component dependency was added without a concrete reduction in maintained behavior.
- Original star drawing retained; lifecycle initialization/cleanup adapted for persistent Svelte layout.
- Obsolete mobile-nav, terminal-control and code-window CSS removed from migrated stylesheet.

## Verification status
See VALIDATION.md for commands, results, and live-account checks that cannot be run without credentials. Legacy /docs remains solely to avoid changing the live deployment before an approved cutover; remove it when changing the production build source.
