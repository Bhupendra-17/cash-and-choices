package config

import "testing"

func TestLoadConfigReplacesRetiredGeminiModel(t *testing.T) {
	t.Setenv("GEMINI_API_KEY", "AIzaSy-test")
	t.Setenv("AI_MODEL", "gemini-2.0-flash")
	t.Setenv("GATEWAY_URL", "https://example.com")

	if got := LoadConfig().Model; got != "gemini-3.6-flash" {
		t.Fatalf("LoadConfig().Model = %q, want gemini-3.6-flash", got)
	}
}
