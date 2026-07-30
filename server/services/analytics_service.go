package services

import "database/sql"

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"cash-choices-server/models"
)

type AnalyticsService struct {
	mu           sync.RWMutex
	db           *sql.DB
	memoryEvents []models.AnalyticsEvent
	memoryClicks []models.UserFundInteraction
}

func NewAnalyticsService(database *sql.DB) *AnalyticsService {
	return &AnalyticsService{
		db:           database,
		memoryEvents: make([]models.AnalyticsEvent, 0),
		memoryClicks: make([]models.UserFundInteraction, 0),
	}
}

func generateID(prefix string) string {
	bytes := make([]byte, 12)
	rand.Read(bytes)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(bytes))
}

func (s *AnalyticsService) LogEvent(userEmail string, req models.LogEventRequest) error {
	if req.EventType == "" {
		return fmt.Errorf("eventType is required")
	}

	eventID := generateID("evt")
	now := time.Now()
	dataBytes, _ := json.Marshal(req.EventData)
	dataStr := string(dataBytes)

	if s.db != nil {
		_, err := s.db.Exec(`
			INSERT INTO user_analytics_events (id, user_email, event_type, event_data, session_id, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			eventID, userEmail, req.EventType, dataStr, req.SessionID, now)
		if err != nil {
			log.Printf("⚠️ [ANALYTICS] Failed to save event to DB: %v", err)
			return fmt.Errorf("failed to save analytics event: %w", err)
		}
		log.Printf("📊 [ANALYTICS] Logged event: %s | User: %s", req.EventType, userEmail)
		return nil
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	evt := models.AnalyticsEvent{
		ID:        eventID,
		UserEmail: userEmail,
		EventType: req.EventType,
		EventData: dataStr,
		SessionID: req.SessionID,
		CreatedAt: now,
	}

	s.memoryEvents = append([]models.AnalyticsEvent{evt}, s.memoryEvents...)
	if len(s.memoryEvents) > 500 {
		s.memoryEvents = s.memoryEvents[:500]
	}

	log.Printf("📊 [ANALYTICS MEM] Logged event: %s | User: %s", req.EventType, userEmail)
	return nil
}

func (s *AnalyticsService) RecordInteraction(userEmail string, req models.RecordInteractionRequest) error {
	if req.SchemeCode == 0 || req.InteractionType == "" {
		return fmt.Errorf("schemeCode and interactionType are required")
	}

	id := generateID("intr")
	now := time.Now()

	if s.db != nil {
		_, err := s.db.Exec(`
			INSERT INTO user_fund_interactions (id, user_email, scheme_code, interaction_type, created_at)
			VALUES ($1, $2, $3, $4, $5)`,
			id, userEmail, req.SchemeCode, req.InteractionType, now)
		if err != nil {
			log.Printf("⚠️ [ANALYTICS] Failed to save interaction: %v", err)
			return fmt.Errorf("failed to save fund interaction: %w", err)
		}

		// Also boost popularity score of fund in featured_funds cache
		_, _ = s.db.Exec(`UPDATE featured_funds SET popularity_score = popularity_score + 1 WHERE scheme_code = $1`, req.SchemeCode)
		return nil
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	intr := models.UserFundInteraction{
		ID:              id,
		UserEmail:       userEmail,
		SchemeCode:      req.SchemeCode,
		InteractionType: req.InteractionType,
		CreatedAt:       now,
	}

	s.memoryClicks = append([]models.UserFundInteraction{intr}, s.memoryClicks...)
	return nil
}

func (s *AnalyticsService) GetUserEvents(userEmail string, limit int) ([]models.AnalyticsEvent, error) {
	if limit <= 0 {
		limit = 50
	}

	if s.db != nil {
		rows, err := s.db.Query(`
			SELECT id, user_email, event_type, event_data, session_id, created_at
			FROM user_analytics_events
			WHERE user_email = $1 OR $1 = ''
			ORDER BY created_at DESC LIMIT $2`, userEmail, limit)
		if err != nil {
			return nil, fmt.Errorf("db query error: %w", err)
		}
		defer rows.Close()

		events := make([]models.AnalyticsEvent, 0)
		for rows.Next() {
			var e models.AnalyticsEvent
			var email sql.NullString
			if err := rows.Scan(&e.ID, &email, &e.EventType, &e.EventData, &e.SessionID, &e.CreatedAt); err == nil {
				if email.Valid {
					e.UserEmail = email.String
				}
				events = append(events, e)
			}
		}
		return events, nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	filtered := make([]models.AnalyticsEvent, 0)
	for _, e := range s.memoryEvents {
		if userEmail == "" || e.UserEmail == userEmail {
			filtered = append(filtered, e)
			if len(filtered) >= limit {
				break
			}
		}
	}
	return filtered, nil
}
