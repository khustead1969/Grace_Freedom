# Grace & Freedom — Next Stage (integration-ready)

This builds on the existing homepage, quiz, debt calculator and reset program. New: `join.html` onboarding, `welcome.html`, optional Stripe Checkout, optional Resend welcome-email API, optional OpenAI coaching endpoint, and Docker Node web server.

## Deploy existing Render Docker Web Service
1. Unzip and upload files **at the repository root** to a **private** GitHub repository.
2. Render > service > Settings > Source: select new repository and `main` branch.
3. Runtime Docker; Dockerfile `./Dockerfile`; Docker context `.`; start command empty.
4. Deploy. Existing website and free planner work with **no API keys**.
5. To enable integration endpoints, add environment variables from `env.example` in Render settings (never commit secrets). Set `PUBLIC_URL` to your exact service URL. Reload/redeploy after changes.

## Services requiring setup
- **Stripe**: Create 3 Price IDs in Stripe: Reset is a one-time $29 price; Plus is $19/month recurring; Family is $29/month recurring. Set `STRIPE_SECRET_KEY` and the three `STRIPE_PRICE_*` vars. Hosted Stripe checkout can then open. **IMPORTANT: successful payment does NOT create a member account, grant access, or send a membership receipt beyond Stripe's own confirmation. Do not publicly sell subscriptions until you add Stripe webhooks, a persistent members database, authentication, and entitlement checking.** Test Stripe with test keys and test Price IDs first. Refund / cancellation workflows are not implemented.
- **Resend**: Verify the sending domain, create an API key, configure `EMAIL_FROM`. The signup sends one welcome email after explicit consent; **it does not build a marketing list or schedule a 5-day campaign**. Add double opt-in, unsubscribe, suppression, and campaign tooling before marketing email.
- **OpenAI**: Set `OPENAI_API_KEY` to turn on `/api/coach`. This endpoint is a minimal integration, not a private paid service. **Do not expose a publicly accessible paid AI feature without user auth, usage limits, privacy controls, and abuse protection.** No account numbers or sensitive credentials should be sent. The existing in-browser guided coaching demo is unchanged.

## Security and functional boundaries
- The debt-planning app continues to use browser-local storage, not secure cloud storage. Do not enter real sensitive financial information in a public demonstration.
- Server endpoints have basic IP limits, but no secure customer authentication or enterprise-grade controls. Financial or regulated advice is not provided.
- `POST /api/subscribe`: optional one-email welcome send. `POST /api/checkout`: hosted Stripe session link. `POST /api/coach`: optional educational AI text. `GET /api/status`: setup-status booleans.
- Do **not** activate live Stripe keys until member authentication, Stripe webhook signature verification, subscription activation/cancellation, customer support, terms, privacy policy and testing are completed.

## Local smoke tests
`node --check server.js` then `node server.js`; open `http://localhost:10000`. With no keys, checkout and email report setup required. Run `curl http://localhost:10000/api/status`.

## Next engineering sprint to commercial launch
1. Add hosted authentication and persistent customer database (Supabase Auth/Postgres or similar).
2. Add Stripe webhooks for payment, subscription updates, cancellations and failed payments; connect paid entitlements to verified accounts.
3. Add explicit marketing-email consent, unsubscribe links, 5-day email sequence, automated 30-day curriculum and delivery tracking.
4. Add authenticated AI coaching, usage quotas, cost caps, moderated prompts and privacy/deletion controls.
5. Test onboarding, mobile layout, accessibility, invoice/refund/cancellation flows, data retention and disaster recovery.

## Render start settings
For Docker, leave the Docker Command field empty; Dockerfile starts node server.js. For Node runtime use Build Command `npm install` and Start Command `npm start`. This demo does not include secure member access or payment activation.
