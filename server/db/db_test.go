package db

import (
	"testing"

	"cash-choices-server/config"
)

func TestNeonDBConnection(t *testing.T) {
	cfg := config.LoadConfig()
	if cfg.DatabaseURL == "" {
		t.Skip("DATABASE_URL not set, skipping live NeonDB connection test")
	}

	database, err := InitDB(cfg.DatabaseURL)
	if err != nil {
		t.Fatalf("Failed to connect to NeonDB: %v", err)
	}
	if database == nil {
		t.Fatal("Expected non-null DB connection handle")
	}
	defer database.Close()

	// Verify query execution on NeonDB
	var count int
	err = database.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query users table in NeonDB: %v", err)
	}
	t.Logf("✅ Successfully connected to NeonDB! Current users in database: %d", count)
}
