package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"cash-choices-server/config"
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

func (s *AIService) CallAI(messages []ChatMessage, temperature float64, jsonFormat bool) (string, error) {
	if s.cfg.OpenAIAPIKey == "" {
		return "", fmt.Errorf("OPENAI_API_KEY is not configured on server")
	}

	reqBody := ChatCompletionRequest{
		Model:       "gpt-4o-mini",
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
	req.Header.Set("Authorization", "Bearer "+s.cfg.OpenAIAPIKey)

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
		return "", fmt.Errorf("AI gateway error status %d: %s", resp.StatusCode, string(resBytes))
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
