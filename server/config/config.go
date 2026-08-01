package config

import (
	"bufio"
	"os"
	"strings"
)

type Config struct {
	Port           string
	APIKey         string
	GatewayURL     string
	Model          string
	AllowedOrigins string
	DatabaseURL    string
	SMTPHost       string
	SMTPPort       string
	SMTPUsername   string
	SMTPPassword   string
	SMTPFrom       string
	GoogleClientID string
}

func loadEnvFile(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
}

func LoadConfig() *Config {
	loadEnvFile(".env")
	loadEnvFile("../.env")
	loadEnvFile("server/.env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	}

	model := os.Getenv("AI_MODEL")
	gatewayURL := os.Getenv("GATEWAY_URL")

	isGemini := os.Getenv("GEMINI_API_KEY") != "" ||
		strings.HasPrefix(apiKey, "AIzaSy") ||
		strings.HasPrefix(apiKey, "AQ.") ||
		strings.Contains(gatewayURL, "googleapis")

	if isGemini {
		if gatewayURL == "" {
			gatewayURL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
		}
		if model == "" {
			model = "gemini-2.0-flash"
		}
	} else {
		if gatewayURL == "" {
			gatewayURL = "https://api.openai.com/v1/chat/completions"
		}
		if model == "" {
			model = "gpt-4o-mini"
		}
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = os.Getenv("POSTGRES_URL")
	}

	smtpPort := os.Getenv("SMTP_PORT")
	if smtpPort == "" {
		smtpPort = "587"
	}

	smtpFrom := os.Getenv("SMTP_FROM")
	if smtpFrom == "" {
		smtpFrom = os.Getenv("SMTP_FROM_EMAIL")
	}

	return &Config{
		Port:           port,
		APIKey:         apiKey,
		GatewayURL:     gatewayURL,
		Model:          model,
		AllowedOrigins: allowedOrigins,
		DatabaseURL:    dbURL,
		SMTPHost:       os.Getenv("SMTP_HOST"),
		SMTPPort:       smtpPort,
		SMTPUsername:   os.Getenv("SMTP_USERNAME"),
		SMTPPassword:   os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:       smtpFrom,
		GoogleClientID: os.Getenv("GOOGLE_CLIENT_ID"),
	}
}
