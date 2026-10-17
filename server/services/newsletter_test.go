package services

import (
	"errors"
	"strings"
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
		Subject:   "This week's learning",
		Preheader: "A short financial literacy update",
		Term: MoneyTerm{
			Name:        "Annual fee",
			Category:    "Banking & Cards",
			Definition:  "A yearly fee that may apply to a financial service.",
			WhenCharged: "It is typically charged at renewal.",
			Example:     "A ₹500 yearly fee costs ₹500 before applicable taxes.",
			HowToAvoid:  []string{"Review the official fee schedule."},
			OfficialURL: "https://www.rbi.org.in/",
		},
		Stories: []NewsletterStory{
			{Category: "Banking", Title: "Banking update", Summary: "A verified change.", WhyItMatters: "Some account holders may be affected.", SourceName: "RBI", SourceURL: "https://www.rbi.org.in/"},
			{Category: "Everyday Money", Title: "Payment update", Summary: "A sourced payment update.", WhyItMatters: "It explains how the change applies.", SourceName: "NPCI", SourceURL: "https://www.npci.org.in/"},
			{Category: "Global", Title: "Global update", Summary: "A verified global development.", WhyItMatters: "It may affect the wider economy.", SourceName: "IMF", SourceURL: "https://www.imf.org/"},
		},
		ActionOfTheWeek: "Check one recent financial statement for fees.",
		MarketSources:   "Verified market sources and news notes.",
		Footer:          "Educational information only.",
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
	sending, err := service.BeginSend(now, edition.ID)
	if err != nil || sending.Status != "sending" {
		t.Fatalf("BeginSend() = %q, %v; want sending, nil", sending.Status, err)
	}
	if err := service.RecordDelivery(edition.ID, "reader@example.com", "sent", ""); err != nil {
		t.Fatalf("RecordDelivery() error = %v", err)
	}
	if err := service.FinishSend(now, edition.ID, NewsletterSendResult{Sent: 1}); err != nil {
		t.Fatalf("FinishSend() error = %v", err)
	}
	if _, err := service.BeginSend(now, edition.ID); !errors.Is(err, ErrNewsletterEditionNotSendable) {
		t.Fatalf("BeginSend() after delivery error = %v, want ErrNewsletterEditionNotSendable", err)
	}
	deliveries, err := service.DeliveryCounts(edition.ID)
	if err != nil || deliveries.Sent != 1 || deliveries.Failed != 0 {
		t.Fatalf("DeliveryCounts() = %#v, %v; want one sent and none failed", deliveries, err)
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

func TestActiveSubscribersHaveWorkingUnsubscribeTokens(t *testing.T) {
	service := NewNewsletterService(nil, "")
	if err := service.SubscribeOnSignup("reader@example.com", true); err != nil {
		t.Fatalf("SubscribeOnSignup() error = %v", err)
	}
	recipients, err := service.ActiveSubscribers()
	if err != nil {
		t.Fatalf("ActiveSubscribers() error = %v", err)
	}
	if len(recipients) != 1 || recipients[0].UnsubscribeToken == "" {
		t.Fatalf("ActiveSubscribers() = %#v, want one recipient with unsubscribe token", recipients)
	}
	updated, err := service.Unsubscribe(recipients[0].UnsubscribeToken)
	if err != nil || !updated {
		t.Fatalf("Unsubscribe() = %v, %v; want true, nil", updated, err)
	}
	count, err := service.SubscriberCount()
	if err != nil || count != 0 {
		t.Fatalf("SubscriberCount() = %d, %v; want 0, nil", count, err)
	}
}

func TestDeletingSubscriptionRemovesDeliveryEmail(t *testing.T) {
	service := NewNewsletterService(nil, "")
	if err := service.RecordDelivery("edition-1", "reader@example.com", "sent", ""); err != nil {
		t.Fatalf("RecordDelivery() error = %v", err)
	}
	if err := service.DeleteSubscription("reader@example.com"); err != nil {
		t.Fatalf("DeleteSubscription() error = %v", err)
	}
	counts, err := service.DeliveryCounts("edition-1")
	if err != nil || counts != (NewsletterSendResult{}) {
		t.Fatalf("DeliveryCounts() = %#v, %v; want empty counts", counts, err)
	}
}

func TestRenderMoneyByteEmailContainsSectionsAndEscapesContent(t *testing.T) {
	edition := NewsletterEdition{
		WeekStart: "2026-10-12",
		NewsletterContent: NewsletterContent{
			Subject:   "Money Byte",
			Preheader: "This week's edition",
			Term: MoneyTerm{
				Name:        "Fees & costs",
				Category:    "Banking",
				Definition:  "<script>alert(1)</script>",
				WhenCharged: "At renewal.",
				Example:     "A sample.",
				HowToAvoid:  []string{"Read terms."},
				OfficialURL: "https://www.rbi.org.in/",
			},
			Stories: []NewsletterStory{
				{Category: "Banking", Title: "Story one", Summary: "A summary.", WhyItMatters: "A reason.", SourceName: "RBI", SourceURL: "https://www.rbi.org.in/"},
				{Category: "Payments", Title: "Story two", Summary: "A summary.", WhyItMatters: "A reason.", SourceName: "NPCI", SourceURL: "https://www.npci.org.in/"},
				{Category: "Global", Title: "Story three", Summary: "A summary.", WhyItMatters: "A reason.", SourceName: "IMF", SourceURL: "https://www.imf.org/"},
			},
			ActionOfTheWeek: "Check a statement.",
			Footer:          "Educational purposes only.",
		},
	}
	html, plain, err := RenderMoneyByteEmail(
		edition,
		"https://cashchoices.example",
		"https://cashchoices.example/api/newsletter/unsubscribe?token=opaque",
	)
	if err != nil {
		t.Fatalf("RenderMoneyByteEmail() error = %v", err)
	}
	if !strings.Contains(html, "THIS WEEK IN MONEY") ||
		!strings.Contains(html, "Unsubscribe") ||
		strings.Contains(html, "<script>alert(1)</script>") ||
		!strings.Contains(html, "&lt;script&gt;") ||
		!strings.Contains(plain, "Story three") {
		t.Fatal("rendered email is missing required sections, text version, or HTML escaping")
	}
}
