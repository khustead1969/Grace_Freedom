# Grace & Freedom — Family / Checkout / Scripture Release

## Changes
- Family pricing and all three plans now link to `/membership.html`; Family button is clickable and launches verified-member Stripe checkout when configured.
- Checkout requires an authenticated Supabase user; Checkout Session binds Supabase user UUID to client_reference_id and metadata and uses exact configured Stripe Price IDs.
- Webhook verifies Stripe signature, checkout payment status, price and matching confirmed Supabase user; SQL RPC atomically deduplicates event IDs and assigns the entitlement. Subscription updated/deleted events synchronize status. Subscription metadata is applied server-side.
- `/guidance.html` provides a daily rotating Scripture/reflection, short action, prayer/intention based on Catholic/Christian/Faith-Light choice, and PRIVATE reminder preferences with RLS.
- Reminder EMAILS ARE NOT SCHEDULED or sent. This is preferences and on-site guidance only. Do not claim reminders are live. No household invites or family-sharing rights are implemented; Family is a paid tier with private individual member records only.

## Required deployment steps
1. **Back up** your GitHub repo and Supabase first. Upload extracted ZIP contents to root of `khustead1969/Grace_Freedom` on the `main` branch. Verify Render service is configured for that repository, Dockerfile `./Dockerfile`, and your HTTPS domain `https://grace-freedom.onrender.com`.
2. In Supabase SQL Editor, confirm existing `supabase/001_member_security.sql` ran, then REVIEW and execute `supabase/002_membership_guidance.sql`. It adds an atomic Stripe fulfillment function, event deduplication, and member guidance preferences with RLS.
3. In Render set the variables in `env.example` using REAL values. Use TEST Stripe keys/prices initially. Never upload actual secrets to GitHub. Set Supabase URL redirects to `https://grace-freedom.onrender.com/login.html`.
4. Stripe Dashboard: configure webhook endpoint `https://grace-freedom.onrender.com/api/stripe-webhook`; events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy webhook signing secret to Render. Do not enable live payments before TEST mode and authorization/RLS audit.
5. Verify signup, email confirmation, login; then with Stripe TEST mode purchase each of Reset/Plus/Family. Confirm `member_entitlements` only updates on verified webhook; cancellation removes premium access. Replay a webhook (must not duplicate). Use two accounts to test isolation; verify unverified user cannot checkout; unauthenticated /api/private/checkout returns 401.
6. After all tests pass, configure LIVE Stripe prices and keys, validate renewal/failure/cancellation, privacy/terms/refund/customer-service information, webhook event alerts, backups, concurrency and incident readiness. Stripe checkout is intentionally unavailable when any prerequisite is missing.

## Limitations / safety notes
- Does not provide household invites/sharing, automated email reminders, account billing portal, or active paid-feature gating for every frontend page. Existing old calculator uses localStorage and remains a DEMO, not private member storage. Protect premium functionality by server API checks, not hyperlinks.
- The webhook fulfillment assumes *asynchronous payment methods are disabled*; checkout requests cards only. On failure or timeout Stripe retries 5xx. Expired sessions grant nothing. Payment confirmation may arrive after redirect.
- Subscription renewal access derives from Stripe subscription status and period end on subscription events; for launch add `invoice.payment_failed`, `invoice.paid`, refund/dispute reconciliation, Stripe status polling, and portal. The one-time Reset does not expire automatically at day 30 yet, so DO NOT promise time-limited access until that is implemented.
- IMPORTANT: the current `apply_member_payment_event` SQL updates one entitlement row per user. Buying overlapping Plus/Family or Reset can replace an existing paid tier. Avoid multiple overlapping subscriptions until you implement a full membership ledger and Stripe Billing Portal. This release needs additional hardening before actual paid launch.
