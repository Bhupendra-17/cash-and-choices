package services

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

var ErrNewsletterEditionExists = errors.New("this week's newsletter draft already exists")
var ErrNewsletterEditionNotFound = errors.New("this week's newsletter draft was not found")
var ErrNewsletterEditionNotSendable = errors.New("newsletter edition must be reviewed before sending")

type MoneyTerm struct {
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Definition  string   `json:"definition"`
	WhenCharged string   `json:"whenCharged"`
	Example     string   `json:"example"`
	HowToAvoid  []string `json:"howToAvoid"`
	OfficialURL string   `json:"officialUrl"`
}

type NewsletterStory struct {
	Category     string `json:"category"`
	Title        string `json:"title"`
	Summary      string `json:"summary"`
	WhyItMatters string `json:"whyItMatters"`
	SourceName   string `json:"sourceName"`
	SourceURL    string `json:"sourceUrl"`
}

type NewsletterContent struct {
	Subject         string            `json:"subject"`
	Preheader       string            `json:"preheader"`
	Term            MoneyTerm         `json:"term"`
	Stories         []NewsletterStory `json:"stories"`
	ActionOfTheWeek string            `json:"actionOfTheWeek"`
	MarketSummary   string            `json:"marketSummary"`
	LessonTitle     string            `json:"lessonTitle"`
	LessonBody      string            `json:"lessonBody"`
	MarketSources   string            `json:"marketSources"`
	Footer          string            `json:"footer"`
}

type NewsletterEdition struct {
	ID        string `json:"id"`
	WeekStart string `json:"weekStart"`
	Status    string `json:"status"`
	NewsletterContent
	CreatedAt   time.Time  `json:"createdAt"`
	ValidatedAt *time.Time `json:"validatedAt,omitempty"`
}

type NewsletterSubscription struct {
	Email            string     `json:"email"`
	Subscribed       bool       `json:"subscribed"`
	Source           string     `json:"source"`
	ConsentedAt      *time.Time `json:"consentedAt,omitempty"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	UnsubscribeToken string     `json:"-"`
}

type NewsletterRecipient struct {
	Email            string
	UnsubscribeToken string
}

type NewsletterSendResult struct {
	Sent   int `json:"sent"`
	Failed int `json:"failed"`
}

type NewsletterService struct {
	db         *sql.DB
	admins     map[string]struct{}
	mu         sync.RWMutex
	subs       map[string]NewsletterSubscription
	editions   map[string]NewsletterEdition
	deliveries map[string]map[string]string
}

func NewNewsletterService(database *sql.DB, adminEmails string) *NewsletterService {
	admins := make(map[string]struct{})
	for _, email := range strings.Split(adminEmails, ",") {
		email = strings.ToLower(strings.TrimSpace(email))
		if email != "" {
			admins[email] = struct{}{}
		}
	}

	return &NewsletterService{
		db:         database,
		admins:     admins,
		subs:       make(map[string]NewsletterSubscription),
		editions:   make(map[string]NewsletterEdition),
		deliveries: make(map[string]map[string]string),
	}
}

func (s *NewsletterService) IsAdmin(email string) bool {
	_, ok := s.admins[strings.ToLower(strings.TrimSpace(email))]
	return ok
}

func (s *NewsletterService) SubscribeOnSignup(email string, subscribed bool) error {
	return s.setSubscription(email, subscribed, "signup")
}

func (s *NewsletterService) EnsureSubscribed(email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return fmt.Errorf("email is required")
	}
	if s.db != nil {
		_, err := s.db.Exec(`
			INSERT INTO newsletter_subscriptions (email, is_subscribed, source, consented_at, unsubscribe_token, updated_at)
			VALUES ($1, TRUE, 'account-login', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP)
			ON CONFLICT (email) DO NOTHING`, email, generateRandomToken())
		if err != nil {
			return fmt.Errorf("failed to create newsletter subscription: %w", err)
		}
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.subs[email]; !exists {
		now := time.Now().UTC()
		s.subs[email] = NewsletterSubscription{
			Email:            email,
			Subscribed:       true,
			Source:           "account-login",
			ConsentedAt:      &now,
			UpdatedAt:        now,
			UnsubscribeToken: generateRandomToken(),
		}
	}
	return nil
}

func (s *NewsletterService) SetIfMissing(email string, subscribed bool, source string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return fmt.Errorf("email is required")
	}
	if s.db != nil {
		_, err := s.db.Exec(`
			INSERT INTO newsletter_subscriptions (email, is_subscribed, source, consented_at, unsubscribe_token, updated_at)
			VALUES ($1, $2, $3, CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END, $4, CURRENT_TIMESTAMP)
			ON CONFLICT (email) DO NOTHING`, email, subscribed, source, generateRandomToken())
		if err != nil {
			return fmt.Errorf("failed to create newsletter subscription: %w", err)
		}
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.subs[email]; !exists {
		now := time.Now().UTC()
		subscription := NewsletterSubscription{
			Email:            email,
			Subscribed:       subscribed,
			Source:           source,
			UpdatedAt:        now,
			UnsubscribeToken: generateRandomToken(),
		}
		if subscribed {
			subscription.ConsentedAt = &now
		}
		s.subs[email] = subscription
	}
	return nil
}

func (s *NewsletterService) SetSubscription(email string, subscribed bool) (NewsletterSubscription, error) {
	if err := s.setSubscription(email, subscribed, "account"); err != nil {
		return NewsletterSubscription{}, err
	}
	return s.GetSubscription(email)
}

func (s *NewsletterService) setSubscription(email string, subscribed bool, source string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return fmt.Errorf("email is required")
	}
	if s.db != nil {
		_, err := s.db.Exec(`
			INSERT INTO newsletter_subscriptions (email, is_subscribed, source, consented_at, unsubscribe_token, updated_at)
			VALUES ($1, $2, $3, CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END, $4, CURRENT_TIMESTAMP)
			ON CONFLICT (email) DO UPDATE SET
				is_subscribed = EXCLUDED.is_subscribed,
				source = EXCLUDED.source,
				consented_at = CASE WHEN EXCLUDED.is_subscribed THEN CURRENT_TIMESTAMP ELSE newsletter_subscriptions.consented_at END,
				updated_at = CURRENT_TIMESTAMP`, email, subscribed, source, generateRandomToken())
		if err != nil {
			return fmt.Errorf("failed to update newsletter subscription: %w", err)
		}
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	subscription := NewsletterSubscription{
		Email:      email,
		Subscribed: subscribed,
		Source:     source,
		UpdatedAt:  now,
	}
	if existing, ok := s.subs[email]; ok {
		subscription.UnsubscribeToken = existing.UnsubscribeToken
	}
	if subscription.UnsubscribeToken == "" {
		subscription.UnsubscribeToken = generateRandomToken()
	}
	if subscribed {
		subscription.ConsentedAt = &now
	} else if existing, ok := s.subs[email]; ok {
		subscription.ConsentedAt = existing.ConsentedAt
	}
	s.subs[email] = subscription
	return nil
}

func (s *NewsletterService) GetSubscription(email string) (NewsletterSubscription, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if s.db != nil {
		var subscription NewsletterSubscription
		err := s.db.QueryRow(`
			SELECT email, is_subscribed, source, consented_at, updated_at
			FROM newsletter_subscriptions WHERE email = $1`, email).
			Scan(&subscription.Email, &subscription.Subscribed, &subscription.Source, &subscription.ConsentedAt, &subscription.UpdatedAt)
		if err == sql.ErrNoRows {
			return NewsletterSubscription{Email: email, Subscribed: false}, nil
		}
		if err != nil {
			return NewsletterSubscription{}, fmt.Errorf("failed to read newsletter subscription: %w", err)
		}
		return subscription, nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	if subscription, ok := s.subs[email]; ok {
		return subscription, nil
	}
	return NewsletterSubscription{Email: email, Subscribed: false}, nil
}

func (s *NewsletterService) DeleteSubscription(email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if s.db != nil {
		if _, err := s.db.Exec("DELETE FROM newsletter_subscriptions WHERE email = $1", email); err != nil {
			return fmt.Errorf("failed to delete newsletter subscription: %w", err)
		}
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.subs, email)
	for _, deliveries := range s.deliveries {
		delete(deliveries, email)
	}
	return nil
}

func (s *NewsletterService) SubscriberCount() (int, error) {
	if s.db != nil {
		var count int
		if err := s.db.QueryRow("SELECT COUNT(*) FROM newsletter_subscriptions WHERE is_subscribed = TRUE").Scan(&count); err != nil {
			return 0, fmt.Errorf("failed to count newsletter subscribers: %w", err)
		}
		return count, nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	count := 0
	for _, subscription := range s.subs {
		if subscription.Subscribed {
			count++
		}
	}
	return count, nil
}

func (s *NewsletterService) ActiveSubscribers() ([]NewsletterRecipient, error) {
	if s.db != nil {
		rows, err := s.db.Query(`
			SELECT email, COALESCE(unsubscribe_token, '')
			FROM newsletter_subscriptions
			WHERE is_subscribed = TRUE
			ORDER BY email`)
		if err != nil {
			return nil, fmt.Errorf("failed to read newsletter recipients: %w", err)
		}
		var recipients []NewsletterRecipient
		for rows.Next() {
			var recipient NewsletterRecipient
			if err := rows.Scan(&recipient.Email, &recipient.UnsubscribeToken); err != nil {
				rows.Close()
				return nil, fmt.Errorf("failed to read newsletter recipient: %w", err)
			}
			if recipient.UnsubscribeToken == "" {
				recipient.UnsubscribeToken = generateRandomToken()
				if _, err := s.db.Exec(`
					UPDATE newsletter_subscriptions SET unsubscribe_token = $2
					WHERE email = $1 AND is_subscribed = TRUE
					  AND (unsubscribe_token IS NULL OR unsubscribe_token = '')`,
					recipient.Email, recipient.UnsubscribeToken); err != nil {
					rows.Close()
					return nil, fmt.Errorf("failed to create unsubscribe link: %w", err)
				}
				if err := s.db.QueryRow(
					"SELECT unsubscribe_token FROM newsletter_subscriptions WHERE email = $1",
					recipient.Email,
				).Scan(&recipient.UnsubscribeToken); err != nil {
					rows.Close()
					return nil, fmt.Errorf("failed to load unsubscribe link: %w", err)
				}
			}
			recipients = append(recipients, recipient)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, fmt.Errorf("failed to read newsletter recipients: %w", err)
		}
		if err := rows.Close(); err != nil {
			return nil, fmt.Errorf("failed to close newsletter recipient list: %w", err)
		}
		return recipients, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	var recipients []NewsletterRecipient
	for email, subscription := range s.subs {
		if !subscription.Subscribed {
			continue
		}
		if subscription.UnsubscribeToken == "" {
			subscription.UnsubscribeToken = generateRandomToken()
			s.subs[email] = subscription
		}
		recipients = append(recipients, NewsletterRecipient{
			Email: email, UnsubscribeToken: subscription.UnsubscribeToken,
		})
	}
	return recipients, nil
}

func (s *NewsletterService) Unsubscribe(token string) (bool, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return false, nil
	}
	if s.db != nil {
		result, err := s.db.Exec(`
			UPDATE newsletter_subscriptions
			SET is_subscribed = FALSE, source = 'unsubscribe-link', updated_at = CURRENT_TIMESTAMP
			WHERE unsubscribe_token = $1 AND is_subscribed = TRUE`, token)
		if err != nil {
			return false, fmt.Errorf("failed to update newsletter subscription: %w", err)
		}
		count, err := result.RowsAffected()
		return count > 0, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	for email, subscription := range s.subs {
		if subscription.UnsubscribeToken == token && subscription.Subscribed {
			subscription.Subscribed = false
			subscription.Source = "unsubscribe-link"
			subscription.UpdatedAt = time.Now().UTC()
			s.subs[email] = subscription
			return true, nil
		}
	}
	return false, nil
}

func (s *NewsletterService) BeginSend(now time.Time, id string) (NewsletterEdition, error) {
	week := newsletterWeekStart(now)
	if s.db != nil {
		edition, err := scanNewsletterEdition(s.db.QueryRow(`
			UPDATE newsletter_editions SET status = 'sending'
			WHERE id = $1 AND week_start = $2 AND status IN ('validated', 'send_failed')
			RETURNING id, week_start, status, subject, preheader, market_summary, lesson_title, lesson_body,
			          market_sources, footer, content_json, created_at, validated_at`,
			id, week))
		if err == sql.ErrNoRows {
			return NewsletterEdition{}, ErrNewsletterEditionNotSendable
		}
		if err != nil {
			return NewsletterEdition{}, fmt.Errorf("failed to start newsletter send: %w", err)
		}
		return edition, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	key := week.Format("2006-01-02")
	edition, ok := s.editions[key]
	if !ok || edition.ID != id || (edition.Status != "validated" && edition.Status != "send_failed") {
		return NewsletterEdition{}, ErrNewsletterEditionNotSendable
	}
	edition.Status = "sending"
	s.editions[key] = edition
	return edition, nil
}

func (s *NewsletterService) DeliverySent(editionID, email string) (bool, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if s.db != nil {
		var status string
		err := s.db.QueryRow(
			"SELECT status FROM newsletter_deliveries WHERE edition_id = $1 AND email = $2",
			editionID, email,
		).Scan(&status)
		if err == sql.ErrNoRows {
			return false, nil
		}
		if err != nil {
			return false, fmt.Errorf("failed to check newsletter delivery: %w", err)
		}
		return status == "sent", nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.deliveries[editionID][email] == "sent", nil
}

func (s *NewsletterService) RecordDelivery(editionID, email, status, deliveryError string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	if s.db != nil {
		_, err := s.db.Exec(`
			INSERT INTO newsletter_deliveries (edition_id, email, status, error, updated_at)
			VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
			ON CONFLICT (edition_id, email) DO UPDATE SET
				status = EXCLUDED.status, error = EXCLUDED.error, updated_at = CURRENT_TIMESTAMP
			WHERE newsletter_deliveries.status <> 'sent'`,
			editionID, email, status, deliveryError)
		if err != nil {
			return fmt.Errorf("failed to record newsletter delivery: %w", err)
		}
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.deliveries[editionID] == nil {
		s.deliveries[editionID] = make(map[string]string)
	}
	if s.deliveries[editionID][email] != "sent" {
		s.deliveries[editionID][email] = status
	}
	return nil
}

func (s *NewsletterService) FinishSend(now time.Time, id string, result NewsletterSendResult) error {
	status := "sent"
	if result.Failed > 0 {
		status = "send_failed"
	}
	week := newsletterWeekStart(now)
	if s.db != nil {
		res, err := s.db.Exec(`
			UPDATE newsletter_editions SET status = $3
			WHERE id = $1 AND week_start = $2 AND status = 'sending'`, id, week, status)
		if err != nil {
			return fmt.Errorf("failed to complete newsletter send: %w", err)
		}
		count, err := res.RowsAffected()
		if err != nil || count != 1 {
			if err != nil {
				return fmt.Errorf("failed to confirm newsletter send status: %w", err)
			}
			return ErrNewsletterEditionNotFound
		}
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	key := week.Format("2006-01-02")
	edition, ok := s.editions[key]
	if !ok || edition.ID != id || edition.Status != "sending" {
		return ErrNewsletterEditionNotFound
	}
	edition.Status = status
	s.editions[key] = edition
	return nil
}

func (s *NewsletterService) DeliveryCounts(editionID string) (NewsletterSendResult, error) {
	if s.db != nil {
		var result NewsletterSendResult
		err := s.db.QueryRow(`
			SELECT COUNT(*) FILTER (WHERE status = 'sent'),
			       COUNT(*) FILTER (WHERE status <> 'sent')
			FROM newsletter_deliveries WHERE edition_id = $1`, editionID).
			Scan(&result.Sent, &result.Failed)
		if err != nil {
			return NewsletterSendResult{}, fmt.Errorf("failed to read newsletter delivery status: %w", err)
		}
		return result, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	var result NewsletterSendResult
	for _, status := range s.deliveries[editionID] {
		if status == "sent" {
			result.Sent++
		} else {
			result.Failed++
		}
	}
	return result, nil
}

func newsletterWeekStart(now time.Time) time.Time {
	now = now.UTC()
	weekday := (int(now.Weekday()) + 6) % 7
	monday := now.AddDate(0, 0, -weekday)
	return time.Date(monday.Year(), monday.Month(), monday.Day(), 0, 0, 0, 0, time.UTC)
}

func (s *NewsletterService) CurrentEdition(now time.Time) (*NewsletterEdition, error) {
	week := newsletterWeekStart(now)
	if s.db != nil {
		edition, err := scanNewsletterEdition(s.db.QueryRow(`
			SELECT id, week_start, status, subject, preheader, market_summary, lesson_title, lesson_body,
			       market_sources, footer, content_json, created_at, validated_at
			FROM newsletter_editions WHERE week_start = $1`, week))
		if err == sql.ErrNoRows {
			return nil, nil
		}
		if err != nil {
			return nil, fmt.Errorf("failed to read this week's newsletter draft: %w", err)
		}
		return &edition, nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	edition, ok := s.editions[week.Format("2006-01-02")]
	if !ok {
		return nil, nil
	}
	return &edition, nil
}

func (s *NewsletterService) CreateEdition(now time.Time, content NewsletterContent) (NewsletterEdition, error) {
	week := newsletterWeekStart(now)
	contentJSON, err := json.Marshal(content)
	if err != nil {
		return NewsletterEdition{}, fmt.Errorf("failed to encode newsletter content: %w", err)
	}
	id := fmt.Sprintf("newsletter_%s_%s", week.Format("20060102"), generateRandomToken()[:10])
	edition := NewsletterEdition{
		ID:                id,
		WeekStart:         week.Format("2006-01-02"),
		Status:            "draft",
		NewsletterContent: content,
		CreatedAt:         time.Now().UTC(),
	}

	if s.db != nil {
		err := s.db.QueryRow(`
			INSERT INTO newsletter_editions
				(id, week_start, status, subject, preheader, market_summary, lesson_title, lesson_body, market_sources, footer, content_json)
			VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (week_start) DO NOTHING
			RETURNING id`, id, week, content.Subject, content.Preheader, content.MarketSummary,
			content.LessonTitle, content.LessonBody, content.MarketSources, content.Footer, string(contentJSON)).Scan(&edition.ID)
		if err == sql.ErrNoRows {
			return NewsletterEdition{}, ErrNewsletterEditionExists
		}
		if err != nil {
			return NewsletterEdition{}, fmt.Errorf("failed to save newsletter draft: %w", err)
		}
		return edition, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.editions[edition.WeekStart]; exists {
		return NewsletterEdition{}, ErrNewsletterEditionExists
	}
	s.editions[edition.WeekStart] = edition
	return edition, nil
}

func (s *NewsletterService) ValidateEdition(now time.Time, id string, content NewsletterContent) (NewsletterEdition, error) {
	week := newsletterWeekStart(now)
	if s.db != nil {
		edition, err := scanNewsletterEdition(s.db.QueryRow(`
			UPDATE newsletter_editions SET
				status = 'validated', subject = $3, preheader = $4, market_summary = $5, lesson_title = $6,
				lesson_body = $7, market_sources = $8, footer = $9, content_json = $10, validated_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND week_start = $2
			  AND status = 'draft'
			RETURNING id, week_start, status, subject, preheader, market_summary, lesson_title, lesson_body,
			            market_sources, footer, content_json, created_at, validated_at`,
			id, week, content.Subject, content.Preheader, content.MarketSummary, content.LessonTitle,
			content.LessonBody, content.MarketSources, content.Footer, newsletterContentJSON(content)))
		if err == sql.ErrNoRows {
			return NewsletterEdition{}, ErrNewsletterEditionNotFound
		}
		if err != nil {
			return NewsletterEdition{}, fmt.Errorf("failed to validate newsletter draft: %w", err)
		}
		return edition, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	edition, ok := s.editions[week.Format("2006-01-02")]
	if !ok || edition.ID != id || edition.Status != "draft" {
		return NewsletterEdition{}, ErrNewsletterEditionNotFound
	}
	edition.Status = "validated"
	edition.NewsletterContent = content
	validatedAt := time.Now().UTC()
	edition.ValidatedAt = &validatedAt
	s.editions[edition.WeekStart] = edition
	return edition, nil
}

func scanNewsletterEdition(row *sql.Row) (NewsletterEdition, error) {
	var edition NewsletterEdition
	var week time.Time
	var contentJSON string
	err := row.Scan(
		&edition.ID, &week, &edition.Status, &edition.Subject, &edition.Preheader,
		&edition.MarketSummary, &edition.LessonTitle, &edition.LessonBody,
		&edition.MarketSources, &edition.Footer, &contentJSON, &edition.CreatedAt, &edition.ValidatedAt,
	)
	if err != nil {
		return NewsletterEdition{}, err
	}
	edition.WeekStart = week.Format("2006-01-02")
	if contentJSON != "" {
		if err := json.Unmarshal([]byte(contentJSON), &edition.NewsletterContent); err != nil {
			return NewsletterEdition{}, fmt.Errorf("failed to decode newsletter content: %w", err)
		}
	}
	if edition.Term.HowToAvoid == nil {
		edition.Term.HowToAvoid = []string{}
	}
	if edition.Stories == nil {
		edition.Stories = []NewsletterStory{}
	}
	if edition.Term.Name == "" {
		edition.Term.Name = edition.LessonTitle
	}
	if edition.Term.Definition == "" {
		edition.Term.Definition = edition.LessonBody
	}
	return edition, nil
}

func newsletterContentJSON(content NewsletterContent) string {
	encoded, err := json.Marshal(content)
	if err != nil {
		return "{}"
	}
	return string(encoded)
}
