package services

import (
	"errors"
	"testing"
	"time"

	"cash-choices-server/models"
)

func TestDeleteAccountRemovesUserAndAllSessions(t *testing.T) {
	service := NewAuthService(nil, nil)
	user := &UserInternal{
		ID:        "usr_delete_test",
		Name:      "Test User",
		Email:     "delete@example.com",
		Provider:  "email",
		CreatedAt: time.Now(),
	}
	service.users[user.Email] = user
	service.tokens["session-one"] = user.Email
	service.tokens["session-two"] = user.Email
	service.otps[user.Email] = OTPRecord{OTP: "123456", ExpiresAt: time.Now().Add(time.Minute)}

	if err := service.DeleteAccount("Bearer session-one"); err != nil {
		t.Fatalf("DeleteAccount() error = %v", err)
	}
	if _, exists := service.users[user.Email]; exists {
		t.Fatal("deleted user remains in memory")
	}
	for _, email := range service.tokens {
		if email == user.Email {
			t.Fatal("a session remains for the deleted user")
		}
	}
	if _, exists := service.otps[user.Email]; exists {
		t.Fatal("OTP remains for the deleted user")
	}
	if err := service.DeleteAccount("Bearer session-two"); !errors.Is(err, ErrInvalidAuthToken) {
		t.Fatalf("DeleteAccount() with a revoked session error = %v, want ErrInvalidAuthToken", err)
	}
}

func TestDeleteAccountRejectsInvalidSession(t *testing.T) {
	service := NewAuthService(nil, nil)

	if err := service.DeleteAccount("Bearer missing"); !errors.Is(err, ErrInvalidAuthToken) {
		t.Fatalf("DeleteAccount() error = %v, want ErrInvalidAuthToken", err)
	}
	if _, exists := service.users["demo@cashchoices.in"]; !exists {
		t.Fatal("invalid session must not delete another account")
	}
}

func TestLearningProfileCanBeSavedAndIsRemovedWithAccount(t *testing.T) {
	service := NewAuthService(nil, nil)
	profile := models.LearningProfile{
		About:          "Learning about mutual funds",
		Interests:      []string{"mutual_fund", "fd"},
		SavedOptionIDs: []string{"mf-index-nifty50"},
	}
	if err := service.SaveLearningProfile("Bearer token_demo_ananya", profile); err != nil {
		t.Fatalf("SaveLearningProfile() error = %v", err)
	}

	got, err := service.GetLearningProfile("Bearer token_demo_ananya")
	if err != nil {
		t.Fatalf("GetLearningProfile() error = %v", err)
	}
	if got.About != profile.About || len(got.Interests) != 2 || len(got.SavedOptionIDs) != 1 {
		t.Fatalf("GetLearningProfile() = %#v, want %#v", got, profile)
	}

	if err := service.DeleteAccount("Bearer token_demo_ananya"); err != nil {
		t.Fatalf("DeleteAccount() error = %v", err)
	}
	if _, err := service.GetLearningProfile("Bearer token_demo_ananya"); !errors.Is(err, ErrInvalidAuthToken) {
		t.Fatalf("GetLearningProfile() after deletion error = %v, want ErrInvalidAuthToken", err)
	}
}

func TestLearningProfileRejectsUnknownInterests(t *testing.T) {
	service := NewAuthService(nil, nil)

	err := service.SaveLearningProfile("Bearer token_demo_ananya", models.LearningProfile{
		Interests: []string{"personalized-advice"},
	})
	if !errors.Is(err, ErrInvalidLearningProfile) {
		t.Fatalf("SaveLearningProfile() error = %v, want ErrInvalidLearningProfile", err)
	}
}

func TestDecodeLearningProfileListHandlesMalformedStoredJSON(t *testing.T) {
	got := decodeLearningProfileList("true false", "interests")
	if got == nil || len(got) != 0 {
		t.Fatalf("decodeLearningProfileList() = %#v, want an empty list", got)
	}
}
