# Required tests before accepting financial data
1. Create verified users A and B; sign in separately (different browser profiles).
2. A creates a debt via `/my-finances.html`; A sees it after reload, B does not.
3. With B's token call `GET /api/private/debts`; verify no rows from A. With no token expect 401.
4. With Supabase REST and B's token filter A's known debt UUID: verify no results. Try update/delete A's debt with B JWT; verify unchanged.
5. Try inserting user_id=A while authenticated as B: RLS rejects.
6. Try writing to `member_entitlements` with a client JWT: permission denied.
7. `POST /api/private/coach` for free account: 403. `POST /api/coach`: 403.
8. Sign out and retry authenticated endpoints: 401; password reset and email confirmation flow works.
9. Tamper with Stripe webhook signature and verify 400; no entitlement changes should occur for any event (activation not implemented).
10. Inspect logs for leaked access tokens or financial data and conduct a professional security review before production launch.
