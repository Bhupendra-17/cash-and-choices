package services

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

var ErrNewsletterEditionExists = errors.New("this week's newsletter draft already exists")
var ErrNewsletterEditionNotFound = errors.New("this week's newsletter draft was not found")

type NewsletterContent struct {
	Subject       string `json:"subject"`
	Preheader     string `json:"preheader"`
	MarketSummary string `json:"marketSummary"`
	LessonTitle   string `json:"lessonTitle"`
	LessonBody    string `json:"lessonBody"`
	MarketSources string `json:"marketSources"`
	Footer        string `json:"footer"`
}

type NewsletterEdition struct {
	ID        string    `json:"id"`
	WeekStart string    `json:"weekStart"`
	Status    string    `json:"status"`
	NewsletterContent
	CreatedAt   time.Time  `json:"createdAt"`
	ValidatedAt *time.Time `json:"validatedAt,omitempty"`
}

type NewsletterSubscription struct {
	Email        string     `json:"email"`
	Subscribed   bool       `json:"subscribed"`
	Source       string     `json:"source"`
	ConsentedAt  *time.Time `json:"consentedAt,omitempty"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type NewsletterService struct {
	db         *sql.DB
	admins     map[string]struct{}
	mu         sync.RWMutex
	subs       map[string]NewsletterSubscription
	editions   map[string]NewsletterEdition
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
		db:       database,
		admins:   admins,
		subs:     make(map[string]NewsletterSubscription),
		editions: make(map[string]NewsletterEdition),
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
			INSERT INTO newsletter_subscriptions (email, is_subscribed, source, consented_at, updated_at)
			VALUES ($1, TRUE, 'account-login', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT (email) DO NOTHING`, email)
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
			Email:       email,
			Subscribed:  true,
			Source:      "account-login",
			ConsentedAt: &now,
			UpdatedAt:   now,
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
			INSERT INTO newsletter_subscriptions (email, is_subscribed, source, consented_at, updated_at)
			VALUES ($1, $2, $3, CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
			ON CONFLICT (email) DO NOTHING`, email, subscribed, source)
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
			Email:      email,
			Subscribed: subscribed,
			Source:     source,
			UpdatedAt:  now,
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
			INSERT INTO newsletter_subscriptions (email, is_subscribed, source, consented_at, updated_at)
			VALUES ($1, $2, $3, CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP)
			ON CONFLICT (email) DO UPDATE SET
				is_subscribed = EXCLUDED.is_subscribed,
				source = EXCLUDED.source,
				consented_at = CASE WHEN EXCLUDED.is_subscribed THEN CURRENT_TIMESTAMP ELSE newsletter_subscriptions.consented_at END,
				updated_at = CURRENT_TIMESTAMP`, email, subscribed, source)
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
			       market_sources, footer, created_at, validated_at
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
				(id, week_start, status, subject, preheader, market_summary, lesson_title, lesson_body, market_sources, footer)
			VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (week_start) DO NOTHING
			RETURNING id`, id, week, content.Subject, content.Preheader, content.MarketSummary,
			content.LessonTitle, content.LessonBody, content.MarketSources, content.Footer).Scan(&edition.ID)
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
				lesson_body = $7, market_sources = $8, footer = $9, validated_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND week_start = $2
			  AND status = 'draft'
			RETURNING id, week_start, status, subject, preheader, market_summary, lesson_title, lesson_body,
			          market_sources, footer, created_at, validated_at`,
			id, week, content.Subject, content.Preheader, content.MarketSummary, content.LessonTitle,
			content.LessonBody, content.MarketSources, content.Footer))
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
	err := row.Scan(
		&edition.ID, &week, &edition.Status, &edition.Subject, &edition.Preheader,
		&edition.MarketSummary, &edition.LessonTitle, &edition.LessonBody,
		&edition.MarketSources, &edition.Footer, &edition.CreatedAt, &edition.ValidatedAt,
	)
	if err != nil {
		return NewsletterEdition{}, err
	}
	edition.WeekStart = week.Format("2006-01-02")
	return edition, nil
}
