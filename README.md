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

## Sign-in session storage

After sign-in, the browser stores the bearer token in local storage with a
30-day expiry. Expired or server-rejected tokens are removed and the user is
returned to the signed-out state; signing out also clears the stored token and
expiry. The current implementation uses local storage rather than cookies.

## Weekly financial-literacy newsletter (preview mode)

The newsletter is currently a manual preview and review workflow. It is not an
automated mailing list campaign.

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
- Newsletter sections include an Indian-market summary, a short financial
  lesson, and a fixed educational-purpose footer.
- Only one edition can be created per UTC week. The admin page can preview and
  validate one edition; it does not send email, fetch live news, or schedule
  future editions.
- Set `OPENAI_API_KEY` on the server for AI draft generation.
- Persistent newsletter subscription and edition data require `DATABASE_URL`.
  Without it, the server's in-memory mode does not preserve newsletter data
  across restarts.

Before enabling email delivery, add a mailing provider, reliable scheduling,
unsubscribe handling in delivered messages, and regulatory/legal review.

## Learning profile and account deletion

The profile page stores the user's short about section, selected learning
interests, and saved educational examples with their account in PostgreSQL (or
in the server's in-memory fallback when no database is configured). Deleting an
account removes the learning profile, saved answers, saved items, sessions,
newsletter preference, OTP, and account-linked analytics/fund interaction
records. Account deletion is permanent and must be explicitly confirmed in the
profile settings.
