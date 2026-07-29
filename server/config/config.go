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

	return &Config{
		Port:           port,
		APIKey:         apiKey,
		GatewayURL:     gatewayURL,
		Model:          model,
		AllowedOrigins: allowedOrigins,
	}
}
