package config

import (
	"bufio"
	"os"
	"strings"
)

type Config struct {
	Port           string
	OpenAIAPIKey   string
	GatewayURL     string
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

	key := os.Getenv("OPENAI_API_KEY")

	gatewayURL := os.Getenv("GATEWAY_URL")
	if gatewayURL == "" {
		gatewayURL = "https://api.openai.com/v1/chat/completions"
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "*"
	}

	return &Config{
		Port:           port,
		OpenAIAPIKey:   key,
		GatewayURL:     gatewayURL,
		AllowedOrigins: allowedOrigins,
	}
}
