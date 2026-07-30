-- name: GetUserByEmail :one
SELECT id, name, email, password, provider, created_at FROM users WHERE email = $1;

-- name: CreateUser :exec
INSERT INTO users (id, name, email, password, provider, created_at) VALUES ($1, $2, $3, $4, $5, $6);

-- name: UpsertFeaturedFund :exec
INSERT INTO featured_funds (
    scheme_code, scheme_name, category, fund_house, latest_nav, nav_date,
    change_1m, change_6m, change_1y, change_3y, drawdown, is_featured, popularity_score, tags, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
ON CONFLICT (scheme_code) DO UPDATE SET
    scheme_name = EXCLUDED.scheme_name,
    category = EXCLUDED.category,
    fund_house = EXCLUDED.fund_house,
    latest_nav = EXCLUDED.latest_nav,
    nav_date = EXCLUDED.nav_date,
    change_1m = EXCLUDED.change_1m,
    change_6m = EXCLUDED.change_6m,
    change_1y = EXCLUDED.change_1y,
    change_3y = EXCLUDED.change_3y,
    drawdown = EXCLUDED.drawdown,
    is_featured = EXCLUDED.is_featured,
    popularity_score = EXCLUDED.popularity_score,
    tags = EXCLUDED.tags,
    updated_at = EXCLUDED.updated_at;

-- name: ListFeaturedFunds :many
SELECT * FROM featured_funds ORDER BY is_featured DESC, popularity_score DESC, change_1y DESC LIMIT $1;

-- name: LogAnalyticsEvent :exec
INSERT INTO user_analytics_events (id, user_email, event_type, event_data, session_id, created_at)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: RecordUserFundInteraction :exec
INSERT INTO user_fund_interactions (id, user_email, scheme_code, interaction_type, created_at)
VALUES ($1, $2, $3, $4, $5);

-- name: GetUserFundInteractions :many
SELECT * FROM user_fund_interactions WHERE user_email = $1 ORDER BY created_at DESC LIMIT $2;
