# Cash&Choices — Financial Literacy Platform

Cash&Choices helps people learn financial concepts, explore financial products,
understand costs and trade-offs, and compare factual information. It is an
educational platform—not a product recommender, adviser, broker, or ranking
service.

## Product principles

- Product examples and comparisons are for general educational purposes only.
- The app does not score, rank, endorse, or recommend financial products or
  provide personalized investment advice.
- Comparisons explain features, risks, fees, liquidity, tax considerations, and
  other trade-offs without declaring a winner.
- Financial decisions should be made independently, based on current official
  product documents and, where appropriate, advice from a qualified
  professional.
- The product's educational positioning does not by itself establish compliance
  with SEBI rules or other applicable laws. Obtain qualified regulatory and
  legal review before launch.

## Repository structure

```text
cash-choices/
├── client/   # React, TanStack Start, Tailwind CSS frontend
└── server/   # Go REST API, services, models, and database integration
```

## Local development

Requirements: Go 1.22+ and Node.js with npm.

Run the backend:

```sh
cd server
go run .
```

Run the frontend in a second terminal:

```sh
cd client
npm install
npm run dev
```

Vite proxies `/api/*` requests to the Go backend during local development. Use
the port printed by the Vite dev server.

Useful client commands:

```sh
npm run lint
npm run build
```

Run backend tests from `server/`:

```sh
go test ./...
```

## API overview

- `GET /api/health`: backend health check.
- `GET /api/funds/search?q={query}`: search mutual-fund schemes.
- `GET /api/funds/detail?code={schemeCode}`: retrieve scheme details and
  available NAV history.
- `POST /api/funds/explain`: request an AI-generated educational explanation.
- `POST /api/calculators/tax`: calculate an estimated investment-withdrawal tax
  result.
- `GET /api/user/learning-profile`: load the signed-in user's about text,
  interests, and saved learning-option IDs.
- `PUT /api/user/learning-profile`: save the signed-in user's learning profile.
- `DELETE /api/auth/me`: permanently delete the signed-in account and
  account-linked data; requires the confirmation value `DELETE`.
- `GET /api/newsletter/subscription`: retrieve the signed-in user's newsletter
  preference.
- `PUT /api/newsletter/subscription`: update the signed-in user's subscription
  preference.
- `GET /api/newsletter/admin/current`: retrieve this week's admin-only draft and
  subscriber count.
- `POST /api/newsletter/admin/draft`: create this week's AI-assisted preview
  from admin-provided market notes, source URLs, and a learning topic.
- `POST /api/newsletter/admin/validate`: save the reviewed edition. This does
  not send email.
- `POST /api/newsletter/admin/send`: manually send a reviewed edition to active
  subscribers; requires a separate confirmation and an allowlisted admin.
- `GET /api/newsletter/unsubscribe?token=...`: show the subscriber unsubscribe
  confirmation page; `POST` to the same URL processes the unsubscribe.

## Sign-in session storage

The backend issues signed HS256 bearer tokens with a 30-day lifetime. The
client stores them in local storage and removes them on expiry or logout. The
backend validates the signature and expiry without a session-table lookup, then
loads the account from `users` so deleted accounts cannot continue to access
their data. `user_tokens` is dropped by the database migration.

Set `JWT_SECRET` to a unique random value of at least 32 characters in every
deployed environment. Generate one with:

```sh
openssl rand -base64 48
```

Keep it stable across instances and deployments; changing it signs out all
users. Local non-production runs use a development-only fallback if the
variable is absent.

Stateless tokens are not individually revocable. Logout clears the current
browser's token, but a copied token remains valid until its 30-day expiry.
Deleting the account invalidates it because the account lookup then fails.
Changing a password does not revoke existing stateless tokens.
Google sign-in credentials are checked by the server against Google's
token-verification endpoint and the configured server-side `GOOGLE_CLIENT_ID`.
Email/password credentials are stored as bcrypt hashes; legacy plaintext
passwords are upgraded to bcrypt after a successful login.

## Weekly financial-literacy newsletter

The newsletter uses the “The Money Byte” email format: a money term with an
example and practical checks, three sourced news stories, a short action, and an
educational-purpose footer. An allowlisted admin reviews an edition and
explicitly sends it from the newsletter admin page. There is no automatic
scheduling.

- Configure `NEWSLETTER_ADMIN_EMAILS` on the server as a comma-separated
  allowlist of admin account email addresses. Admin newsletter actions require
  a signed-in email/password session.
- Users can choose whether to subscribe during email/password sign-up and can
  change their preference from their account page. Signing in subscribes an
  account only when no preference exists; a previously saved unsubscribe is
  retained.
- An allowlisted admin enters India-market news notes and source URLs and
  chooses a learning topic. AI creates an editable draft using only the
  supplied material. The admin must verify the facts and wording before
  marking it reviewed.
- Sending is a separate action and only includes currently active newsletter
  subscribers. Each email includes a unique unsubscribe link and supports
  one-click unsubscribe POSTs. Failed deliveries can be retried without
  resending recipients already recorded as delivered.
- Only one edition can be created per UTC week. News is not fetched live and
  delivery is not scheduled.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and
  `SMTP_FROM` (or `SMTP_FROM_EMAIL`) on the server. Port 587 uses STARTTLS; port
  465 uses direct TLS. Configure `PUBLIC_SITE_URL` as the public HTTPS URL used
  for the website and `PUBLIC_API_URL` as the public HTTPS backend URL used by
  unsubscribe links (it may include a trailing `/api`).
- Set `OPENAI_API_KEY` on the server for AI draft generation.
- Persistent newsletter subscription and edition data require `DATABASE_URL`.
  Without it, the server's in-memory mode does not preserve newsletter data
  across restarts.

Test sending with a controlled subscriber list and verify the sender domain's
SPF, DKIM, and DMARC configuration before sending to a larger audience. Obtain
qualified privacy, consent, and regulatory/legal review before production
campaigns.

## Learning profile and account deletion

The profile page stores the user's short about section, selected learning
interests, and saved educational examples with their account in PostgreSQL (or
in the server's in-memory fallback when no database is configured). Deleting an
account removes the learning profile, saved answers, saved items, sessions,
newsletter preference, OTP, and account-linked analytics/fund interaction
records. Account deletion is permanent and must be explicitly confirmed in the
profile settings.
