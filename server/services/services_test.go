package services

import (
	"testing"

	"cash-choices-server/models"
)

func TestAnalyticsService(t *testing.T) {
	svc := NewAnalyticsService(nil)

	err := svc.LogEvent("test@cashchoices.in", models.LogEventRequest{
		EventType: "fund_view",
		EventData: map[string]interface{}{"schemeCode": 120716},
		SessionID: "sess_123",
	})
	if err != nil {
		t.Fatalf("LogEvent failed: %v", err)
	}

	events, err := svc.GetUserEvents("test@cashchoices.in", 10)
	if err != nil {
		t.Fatalf("GetUserEvents failed: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].EventType != "fund_view" {
		t.Errorf("expected eventType 'fund_view', got '%s'", events[0].EventType)
	}
}

func TestFeaturedFundsService(t *testing.T) {
	mfSvc := NewMFService()
	svc := NewFeaturedFundsService(nil, mfSvc)

	funds, err := svc.ListFeaturedFunds("", 10)
	if err != nil {
		t.Fatalf("ListFeaturedFunds failed: %v", err)
	}
	if len(funds) == 0 {
		t.Fatalf("expected seeded featured funds, got 0")
	}

	// Verify top fund properties
	topFund := funds[0]
	if topFund.SchemeCode == 0 || topFund.SchemeName == "" {
		t.Errorf("invalid fund struct: %+v", topFund)
	}
}
