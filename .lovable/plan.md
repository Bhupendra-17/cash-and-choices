# Cash&Choices Product Direction

Cash&Choices is a financial-literacy platform for learning about money terms,
financial products, costs, risks, and trade-offs. The product supports
independent understanding; it must not operate as a personalized financial
product recommender.

## Non-negotiable product constraints

- No personalized product picks, product-fit scores, financial-health scores,
  product rankings, or winner badges.
- Comparisons present factual attributes side by side and explain trade-offs
  without choosing for the user.
- Educational-purpose and non-advice notices must be visible around product
  examples, comparisons, calculators, and AI-generated content.
- Historical performance must not be presented as predictive of future results.
- AI-generated content must be grounded in administrator-provided sources and
  reviewed by a person before publication.
- Do not claim legal or SEBI compliance based only on interface copy or
  disclaimers; obtain qualified regulatory and legal review.

## Current experience

- Homepage positions the service as a financial-literacy platform.
- Product exploration uses educational examples rather than personalized
  recommendations. The interactive Explore page is available at `/explore` and
  presents clickable card-style educational content (what it is, how it works,
  benefits, considerations) without scores or rankings.
- Product comparison focuses on factual attributes, concepts, costs, and
  trade-offs instead of scores or rankings.
- Account sign-up offers an explicit newsletter preference and users can
  manage their preference from their Profile page (`/profile`). The Profile
  stores a short "about" text, interests, saved items, and privacy-first
  settings including account deletion.
- The protected newsletter admin route supports one preview per UTC week,
  admin editing, and review confirmation. Email delivery, live news fetching,
  and automatic scheduling are not enabled.

## Ongoing development priorities

### Learning content and product explanations

- Explain product terminology in plain language and distinguish general
  educational information from product-specific terms.
- Display data provenance and the date of information where available.
- Encourage users to confirm fees, eligibility, risks, and tax details in
  current official product documents.

### Neutral comparisons and calculators

- Show comparable factual fields without assessing which option suits a user.
- Explain why a metric matters without declaring the higher or lower value
  universally preferable.
- For calculators, disclose assumptions and label results as estimates; actual
  outcomes and applicable tax rules may vary.

### Newsletter review workflow

- Keep the weekly newsletter preview restricted to server-allowlisted admin
  accounts.
- Include an India-market overview based on sources supplied by the admin, one
  short financial-literacy lesson, and a fixed educational-purpose footer.
- Require human verification before an edition is marked reviewed.
- Before any sending or scheduling is introduced, define consent and unsubscribe
  flows, retention and privacy requirements, operational controls, and legal
  review.
