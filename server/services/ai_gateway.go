package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"cash-choices-server/config"
	"cash-choices-server/models"
)

type AIService struct {
	cfg    *config.Config
	client *http.Client
}

func NewAIService(cfg *config.Config) *AIService {
	return &AIService{
		cfg:    cfg,
		client: &http.Client{},
	}
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAI format structs
type ChatCompletionRequest struct {
	Model          string         `json:"model"`
	Messages       []ChatMessage  `json:"messages"`
	ResponseFormat map[string]any `json:"response_format,omitempty"`
	Temperature    float64        `json:"temperature,omitempty"`
}

type ChatCompletionResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// Native Gemini format structs
type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []GeminiPart `json:"parts"`
}

type GeminiGenConfig struct {
	Temperature      float64 `json:"temperature,omitempty"`
	ResponseMimeType string  `json:"responseMimeType,omitempty"`
}

type GeminiRequest struct {
	Contents         []GeminiContent `json:"contents"`
	GenerationConfig GeminiGenConfig `json:"generationConfig"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func (s *AIService) CallAI(messages []ChatMessage, temperature float64, jsonFormat bool) (string, error) {
	apiKey := strings.TrimSpace(s.cfg.APIKey)
	if apiKey == "" || apiKey == "your_gemini_api_key_here" || apiKey == "your_openai_api_key_here" {
		log.Printf("ℹ️ [AI ENGINE] GEMINI_API_KEY is not set or placeholder. Using rule-based financial engine.")
		return "", fmt.Errorf("GEMINI_API_KEY is placeholder or not configured")
	}

	// Try Native Gemini API first if using a Gemini Key or Gemini model
	isGeminiKey := strings.HasPrefix(apiKey, "AIzaSy") || strings.HasPrefix(apiKey, "AQ.") || strings.Contains(s.cfg.Model, "gemini")
	if isGeminiKey {
		res, err := s.callNativeGemini(apiKey, messages, temperature, jsonFormat)
		if err == nil && res != "" {
			return res, nil
		}
		log.Printf("⚠️ [AI ENGINE] Native Gemini call failed (%v). Attempting OpenAI-compatible endpoint...", err)
	}

	// Fallback to OpenAI compatible gateway
	res, err := s.callOpenAIFormat(apiKey, messages, temperature, jsonFormat)
	if err != nil {
		log.Printf("⚠️ [AI ENGINE] OpenAI-compatible endpoint failed (%v).", err)
	}
	return res, err
}

func (s *AIService) GenerateFallbackRecommendation(answers map[string]string, candidates []string) *models.AIRecommendation {
	goal := strings.ToLower(answers["goal"])
	horizon := strings.ToLower(answers["horizon"])
	risk := strings.ToLower(answers["risk"])

	headline := "Balanced Financial Growth Strategy"
	summary := "A diversified asset allocation designed for steady long-term compounding while managing downside volatility."

	if strings.Contains(goal, "emergency") || strings.Contains(horizon, "short") || strings.Contains(horizon, "1") {
		headline = "Capital Preservation & Liquidity Strategy"
		summary = "Prioritizes immediate capital safety, instant liquidity, and minimal volatility for short-term financial needs."
	} else if strings.Contains(risk, "wobble") || strings.Contains(risk, "panic") {
		headline = "Conservative Wealth Accumulator"
		summary = "Focuses on steady risk-adjusted returns with low drawdown risk to protect your money against sudden market swings."
	} else if strings.Contains(goal, "grow") || strings.Contains(horizon, "long") || strings.Contains(horizon, "10") {
		headline = "Long-Term High-Growth Compounding Plan"
		summary = "Targeted long-term growth by pairing index and flexi-cap equity funds with tax-advantaged instruments."
	}

	picks := []models.PickItem{
		{
			ProductID: "120716", // UTI Nifty 50 Index
			Fit:       95,
			Why:       "Tracks India's top 50 bluechip companies with ultra-low expense ratio (0.06%).",
			WatchOut:  "Short-term market fluctuations occur; best held for 3+ years.",
		},
		{
			ProductID: "122639", // Parag Parikh Flexi Cap
			Fit:       92,
			Why:       "Flexible allocation across large, mid, and international equities for risk-adjusted returns.",
			WatchOut:  "Has higher international equity exposure subject to currency exchange shifts.",
		},
		{
			ProductID: "ppf",
			Fit:       88,
			Why:       "Guaranteed 7.1% tax-free returns backed by Govt of India with 80C EEE tax savings.",
			WatchOut:  "15-year lock-in period applies with restricted early withdrawal rules.",
		},
	}

	nextSteps := []string{
		"Set up an automated monthly SIP on your salary date.",
		"Maintain 3 to 6 months of living expenses in an instant-access liquid fund.",
		"Review your financial progress annually without overreacting to daily news.",
	}

	return &models.AIRecommendation{
		Headline:  headline,
		Summary:   summary,
		Picks:     picks,
		NextSteps: nextSteps,
	}
}

func (s *AIService) GenerateFallbackExplanation(name, category string, change1y, change3y, drawdown *float64) string {
	c1y := "N/A"
	if change1y != nil {
		c1y = fmt.Sprintf("%.2f%%", *change1y)
	}
	c3y := "N/A"
	if change3y != nil {
		c3y = fmt.Sprintf("%.2f%%", *change3y)
	}
	dd := "0.00%"
	if drawdown != nil {
		dd = fmt.Sprintf("%.2f%%", *drawdown)
	}

	return fmt.Sprintf("%s (%s) has delivered a 1-year return of %s and a 3-year CAGR of %s. It is currently %s from its peak. For a beginner, 1-year returns show recent market momentum, while 3-year returns show compounding consistency. Watch out for sudden short-term drawdowns and ensure your investment horizon aligns with the fund category.", name, category, c1y, c3y, dd)
}

func (s *AIService) callNativeGemini(apiKey string, messages []ChatMessage, temperature float64, jsonFormat bool) (string, error) {
	modelName := s.cfg.Model
	if modelName == "" || strings.HasPrefix(modelName, "gpt") {
		modelName = "gemini-2.0-flash"
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)

	var promptText strings.Builder
	for _, m := range messages {
		promptText.WriteString(fmt.Sprintf("[%s]: %s\n\n", strings.ToUpper(m.Role), m.Content))
	}

	reqBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Role: "user",
				Parts: []GeminiPart{
					{Text: promptText.String()},
				},
			},
		},
		GenerationConfig: GeminiGenConfig{
			Temperature: temperature,
		},
	}

	if jsonFormat {
		reqBody.GenerationConfig.ResponseMimeType = "application/json"
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	resBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("native gemini status %d: %s", resp.StatusCode, string(resBytes))
	}

	var gResp GeminiResponse
	if err := json.Unmarshal(resBytes, &gResp); err != nil {
		return "", err
	}

	if len(gResp.Candidates) == 0 || len(gResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty candidates in native gemini response")
	}

	return gResp.Candidates[0].Content.Parts[0].Text, nil
}

func (s *AIService) callOpenAIFormat(apiKey string, messages []ChatMessage, temperature float64, jsonFormat bool) (string, error) {
	reqBody := ChatCompletionRequest{
		Model:       s.cfg.Model,
		Messages:    messages,
		Temperature: temperature,
	}

	if jsonFormat {
		reqBody.ResponseFormat = map[string]any{"type": "json_object"}
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal AI request: %w", err)
	}

	req, err := http.NewRequest("POST", s.cfg.GatewayURL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create AI request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute AI request: %w", err)
	}
	defer resp.Body.Close()

	resBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read AI response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("AI error status %d: %s", resp.StatusCode, string(resBytes))
	}

	var aiResp ChatCompletionResponse
	if err := json.Unmarshal(resBytes, &aiResp); err != nil {
		return "", fmt.Errorf("failed to parse AI json: %w", err)
	}

	if len(aiResp.Choices) == 0 {
		return "", fmt.Errorf("empty AI choices returned")
	}

	return aiResp.Choices[0].Message.Content, nil
}
