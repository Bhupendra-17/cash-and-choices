package db

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "github.com/lib/pq"
)

func InitDB(connStr string) (*sql.DB, error) {
	connStr = strings.TrimSpace(connStr)
	if connStr == "" {
		log.Println("ℹ️ [DB LOG] DATABASE_URL is not set. Auth service running in memory mode.")
		return nil, nil
	}

	database, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	database.SetMaxOpenConns(25)
	database.SetMaxIdleConns(5)

	if err := database.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("⚡ [DB LOG] Successfully connected to NeonDB PostgreSQL database!")

	// Run auto-migrations
	if err := migrateSchemas(database); err != nil {
		return nil, fmt.Errorf("database auto-migration failed: %w", err)
	}

	return database, nil
}

func migrateSchemas(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(64) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		email VARCHAR(255) UNIQUE NOT NULL,
		password TEXT NOT NULL,
		provider VARCHAR(32) NOT NULL DEFAULT 'email',
		created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS user_tokens (
		token VARCHAR(128) PRIMARY KEY,
		email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
		created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
	`

	_, err := db.Exec(schema)
	if err != nil {
		return err
	}

	log.Println("✅ [DB LOG] Database tables auto-migrated successfully.")
	return nil
}
