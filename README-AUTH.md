# Grace & Freedom: Supabase login setup

1. Unzip this package and upload **all extracted files** into the GitHub repository root, replacing prior versions. Keep the Dockerfile, server.js and other files. Do not upload the ZIP itself.
2. In Supabase: Authentication > Providers > Email, enable email/password. Enable email confirmation.
3. Authentication > URL Configuration: Site URL `https://grace-and-freedom1.onrender.com`; Redirect URLs include `https://grace-and-freedom1.onrender.com/login.html`.
4. In Supabase Project Settings > API / API Keys, copy your **Project URL** and **publishable (sb_publishable_) key**.
5. In Render > Grace & Freedom service > Environment, add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. NEVER put a Supabase secret/service-role key in browser code.
6. Deploy the GitHub commit. Open `/login.html`, create a **test** account, verify email, sign in and try password recovery. The public homepage links to member sign-in.
7. If the login page says Supabase is not configured, confirm environment variables are saved to the correct Render service and redeploy. If sign-up errors, inspect Supabase Authentication logs and URL configuration.

## Important security and production limitations

This ZIP implements real **Supabase Authentication** (sign-up, email confirmation through Supabase, sign-in, password reset, sign-out), but **does not implement private financial record storage, row-level-security policies, protected access to app.html, or paid membership authorization**. The current debt planner is still a browser-local demonstration; do not collect real customer financial data yet. Protect all private APIs server-side by verifying the signed-in user, then add RLS-protected per-user tables and Stripe webhook-based entitlements before a paid launch. The AI coach and checkout endpoints in this starter are not protected by membership checks yet. Email delivery depends on your Supabase project's email settings and rate limits; use production SMTP when launching.

The sign-in page loads Supabase's browser JS library from a CDN and therefore requires internet access. No npm install is required for this implementation.
