-- Production Database Schema for Cash&Choices Backend

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'email',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    email VARCHAR(255) PRIMARY KEY,
    is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
    source VARCHAR(64) NOT NULL DEFAULT 'account',
    consented_at TIMESTAMPTZ,
    unsubscribe_token VARCHAR(64) UNIQUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter_editions (
    id VARCHAR(64) PRIMARY KEY,
    week_start DATE NOT NULL UNIQUE,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    subject VARCHAR(160) NOT NULL,
    preheader VARCHAR(180) NOT NULL,
    market_summary TEXT NOT NULL,
    lesson_title VARCHAR(180) NOT NULL,
    lesson_body TEXT NOT NULL,
    market_sources TEXT NOT NULL,
    footer TEXT NOT NULL,
    content_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS newsletter_deliveries (
    edition_id VARCHAR(64) NOT NULL REFERENCES newsletter_editions(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL,
    error TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (edition_id, email)
);

CREATE TABLE IF NOT EXISTS user_answers (
    email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL,
    question_text TEXT NOT NULL,
    answer_value VARCHAR(128) NOT NULL,
    answer_label VARCHAR(255) NOT NULL,
    PRIMARY KEY (email, question_id)
);

CREATE TABLE IF NOT EXISTS saved_recommendations (
    id VARCHAR(64) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    headline TEXT NOT NULL,
    summary TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    picks_json TEXT NOT NULL,
    next_steps_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otps (
    email VARCHAR(255) PRIMARY KEY,
    otp VARCHAR(16) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS featured_funds (
    scheme_code INT PRIMARY KEY,
    scheme_name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    fund_house VARCHAR(255) NOT NULL,
    latest_nav NUMERIC(12, 4) NOT NULL DEFAULT 0.0,
    nav_date VARCHAR(32) NOT NULL DEFAULT '',
    change_1m NUMERIC(6, 2) DEFAULT 0.0,
    change_6m NUMERIC(6, 2) DEFAULT 0.0,
    change_1y NUMERIC(6, 2) DEFAULT 0.0,
    change_3y NUMERIC(6, 2) DEFAULT 0.0,
    drawdown NUMERIC(6, 2) DEFAULT 0.0,
    is_featured BOOLEAN NOT NULL DEFAULT TRUE,
    popularity_score INT NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_analytics_events (
    id VARCHAR(64) PRIMARY KEY,
    user_email VARCHAR(255),
    event_type VARCHAR(64) NOT NULL,
    event_data TEXT NOT NULL DEFAULT '{}',
    session_id VARCHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_fund_interactions (
    id VARCHAR(64) PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    scheme_code INT NOT NULL,
    interaction_type VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_email_type ON user_analytics_events(user_email, event_type);
CREATE INDEX IF NOT EXISTS idx_featured_funds_cat ON featured_funds(category, popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_fund_interactions_user ON user_fund_interactions(user_email, scheme_code);
