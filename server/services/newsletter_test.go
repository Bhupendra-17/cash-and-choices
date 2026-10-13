package services

import (
	"errors"
	"testing"
	"time"
)

func TestNewsletterSubscriptionDefaultsAndOptOut(t *testing.T) {
	service := NewNewsletterService(nil, "")

	if err := service.SubscribeOnSignup("Reader@Example.com", false); err != nil {
		t.Fatalf("SubscribeOnSignup() error = %v", err)
	}
	if err := service.EnsureSubscribed("reader@example.com"); err != nil {
		t.Fatalf("EnsureSubscribed() error = %v", err)
	}

	subscription, err := service.GetSubscription("reader@example.com")
	if err != nil {
		t.Fatalf("GetSubscription() error = %v", err)
	}
	if subscription.Subscribed {
		t.Fatal("an explicit sign-up opt-out should not be overwritten on login")
	}

	if err := service.EnsureSubscribed("new@example.com"); err != nil {
		t.Fatalf("EnsureSubscribed() for a new account error = %v", err)
	}
	subscription, err = service.GetSubscription("new@example.com")
	if err != nil {
		t.Fatalf("GetSubscription() error = %v", err)
	}
	if !subscription.Subscribed {
		t.Fatal("a new login should subscribe by default")
	}
}

func TestNewsletterEditionIsLimitedToOnePerWeek(t *testing.T) {
	service := NewNewsletterService(nil, "admin@example.com")
	now := time.Date(2026, time.October, 13, 12, 0, 0, 0, time.UTC)
	content := NewsletterContent{
		Subject:       "This week's learning",
		Preheader:     "A short financial literacy update",
		MarketSummary: "A summary based on the supplied sources.",
		LessonTitle:   "Understanding expense ratios",
		LessonBody:    "An expense ratio is an annual fund operating cost expressed as a percentage.",
		MarketSources: "Verified market sources and news notes.",
		Footer:        "Educational information only.",
	}

	edition, err := service.CreateEdition(now, content)
	if err != nil {
		t.Fatalf("CreateEdition() error = %v", err)
	}
	if edition.WeekStart != "2026-10-12" {
		t.Fatalf("week start = %q, want Monday 2026-10-12", edition.WeekStart)
	}
	if _, err := service.CreateEdition(now.Add(24*time.Hour), content); !errors.Is(err, ErrNewsletterEditionExists) {
		t.Fatalf("second CreateEdition() error = %v, want ErrNewsletterEditionExists", err)
	}

	current, err := service.CurrentEdition(now)
	if err != nil {
		t.Fatalf("CurrentEdition() error = %v", err)
	}
	if current == nil || current.ID != edition.ID {
		t.Fatalf("CurrentEdition() = %#v, want edition %q", current, edition.ID)
	}

	validated, err := service.ValidateEdition(now, edition.ID, content)
	if err != nil {
		t.Fatalf("ValidateEdition() error = %v", err)
	}
	if validated.Status != "validated" || validated.ValidatedAt == nil {
		t.Fatalf("validated edition status/time = %q/%v", validated.Status, validated.ValidatedAt)
	}
	if _, err := service.ValidateEdition(now, edition.ID, content); !errors.Is(err, ErrNewsletterEditionNotFound) {
		t.Fatalf("second ValidateEdition() error = %v, want ErrNewsletterEditionNotFound", err)
	}
}

func TestNewsletterAdminAllowlistIsCaseInsensitive(t *testing.T) {
	service := NewNewsletterService(nil, "Admin@Example.com, editor@example.com")
	if !service.IsAdmin("ADMIN@example.com") {
		t.Fatal("configured admin email should match regardless of case")
	}
	if service.IsAdmin("intruder@example.com") {
		t.Fatal("unlisted email must not be an admin")
	}
}
