package models

import "time"

type FeaturedFund struct {
	SchemeCode      int       `json:"schemeCode"`
	SchemeName      string    `json:"schemeName"`
	Category        string    `json:"category"`
	FundHouse       string    `json:"fundHouse"`
	LatestNAV       float64   `json:"latestNav"`
	NAVDate         string    `json:"navDate"`
	Change1M        float64   `json:"change1m"`
	Change6M        float64   `json:"change6m"`
	Change1Y        float64   `json:"change1y"`
	Change3Y        float64   `json:"change3y"`
	Drawdown        float64   `json:"drawdown"`
	IsFeatured      bool      `json:"isFeatured"`
	PopularityScore int       `json:"popularityScore"`
	Tags            []string  `json:"tags"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type AnalyticsEvent struct {
	ID        string    `json:"id"`
	UserEmail string    `json:"userEmail,omitempty"`
	EventType string    `json:"eventType"`
	EventData string    `json:"eventData"`
	SessionID string    `json:"sessionId,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type LogEventRequest struct {
	EventType string                 `json:"eventType"`
	EventData map[string]interface{} `json:"eventData"`
	SessionID string                 `json:"sessionId,omitempty"`
}

type UserFundInteraction struct {
	ID              string    `json:"id"`
	UserEmail       string    `json:"userEmail"`
	SchemeCode      int       `json:"schemeCode"`
	InteractionType string    `json:"interactionType"` // "view", "click", "bookmark"
	CreatedAt       time.Time `json:"createdAt"`
}

type RecordInteractionRequest struct {
	SchemeCode      int    `json:"schemeCode"`
	InteractionType string `json:"interactionType"` // "view", "click", "bookmark"
}
