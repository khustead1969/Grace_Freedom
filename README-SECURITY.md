# Grace & Freedom — protected financial records

## Deploy
1. Back up Supabase and inspect `supabase/001_member_security.sql`; run it once in the Supabase SQL Editor. It creates member tables and RLS policies.
2. Upload the **contents** of this ZIP to your PRIVATE GitHub repository root, preserving Dockerfile, server.js, secure-api.js, private-member.js and my-finances.html.
3. In Render: Docker runtime, Dockerfile `./Dockerfile`, branch `main`; set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. Only if/when webhook settlement is developed, set `SUPABASE_SERVICE_ROLE_KEY` and Stripe keys. Never commit secrets.
4. Supabase Authentication: enable email verification; Site URL `https://grace-and-freedom1.onrender.com`, add `/login.html` redirect.
5. Deploy and visit `/login.html`, then `/my-finances.html`. Verify adding and deleting debts across two separate test users.
6. Test unauthed `GET /api/private/debts` returns 401. Test user A token cannot read user B's debt even if trying direct Supabase REST queries. See `tests/TEST-PLAN.md`.

## Scope and limitations
- Private debt storage uses validated Supabase JWT and database RLS policies; the new `/my-finances.html` is the secure records interface.
- **Existing `/app.html` calculator continues to store its own demo values in browser localStorage.** Do not enter sensitive personal data in the old prototype. It is not synchronized with private debts.
- `GET /app.html` still serves public HTML; link alone is not access enforcement. Protected financial records are enforced by server and database.
- Premium AI endpoint `/api/private/coach` checks a server-queried membership record. Public `/api/coach` disabled.
- Stripe checkout endpoint is DISABLED until verified checkout-session user linking, verified webhook event idempotency, payment/subscription lifecycle synchronization, and full refunds/cancellations are built.
- Stripe webhook only verifies signed events; **it does not activate memberships.** Entitlements cannot be edited by ordinary users.
- Supabase email verification, provider SMTP limits, and service keys require configuration; this is not a certified production security audit.
- Consider MFA, encryption/secrets rotation, backups, robust rate limiting, structured monitoring and consent/privacy notices before launch.
