package services

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"cash-choices-server/models"
)

const testJWTSecret = "test-secret-test-secret-test-secret-"

func newTestAuthService(t *testing.T) *AuthService {
	t.Helper()
	service, err := NewAuthService(nil, nil, testJWTSecret, "test-google-client")
	if err != nil {
		t.Fatalf("NewAuthService() error = %v", err)
	}
	return service
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func testBearerToken(t *testing.T, service *AuthService, email string) string {
	t.Helper()
	user, exists := service.users[email]
	if !exists {
		t.Fatalf("test user %q does not exist", email)
	}
	token, err := service.issueToken(user.ID)
	if err != nil {
		t.Fatalf("issueToken() error = %v", err)
	}
	return "Bearer " + token
}

func TestDeleteAccountInvalidatesStatelessTokensForDeletedUser(t *testing.T) {
	service := newTestAuthService(t)
	user := &UserInternal{
		ID:        "usr_delete_test",
		Name:      "Test User",
		Email:     "delete@example.com",
		Provider:  "email",
		CreatedAt: time.Now(),
	}
	service.users[user.Email] = user
	service.otps[user.Email] = OTPRecord{OTP: "123456", ExpiresAt: time.Now().Add(time.Minute)}
	token, err := service.issueToken(user.ID)
	if err != nil {
		t.Fatalf("issueToken() error = %v", err)
	}

	if err := service.DeleteAccount("Bearer " + token); err != nil {
		t.Fatalf("DeleteAccount() error = %v", err)
	}
	if _, exists := service.users[user.Email]; exists {
		t.Fatal("deleted user remains in memory")
	}
	if _, exists := service.otps[user.Email]; exists {
		t.Fatal("OTP remains for the deleted user")
	}
	if _, err := service.GetUserByToken("Bearer " + token); !errors.Is(err, ErrInvalidAuthToken) {
		t.Fatalf("GetUserByToken() after deletion error = %v, want ErrInvalidAuthToken", err)
	}
}

func TestDeleteAccountRejectsInvalidSession(t *testing.T) {
	service := newTestAuthService(t)

	if err := service.DeleteAccount("invalid"); !errors.Is(err, ErrInvalidAuthToken) {
		t.Fatalf("DeleteAccount() error = %v, want ErrInvalidAuthToken", err)
	}
	if _, exists := service.users["demo@cashchoices.in"]; !exists {
		t.Fatal("invalid session must not delete another account")
	}
}

func TestLearningProfileCanBeSavedAndIsRemovedWithAccount(t *testing.T) {
	service := newTestAuthService(t)
	token := testBearerToken(t, service, "demo@cashchoices.in")
	profile := models.LearningProfile{
		About:          "Learning about mutual funds",
		Interests:      []string{"mutual_fund", "fd"},
		SavedOptionIDs: []string{"mf-index-nifty50"},
	}
	if err := service.SaveLearningProfile(token, profile); err != nil {
		t.Fatalf("SaveLearningProfile() error = %v", err)
	}

	got, err := service.GetLearningProfile(token)
	if err != nil {
		t.Fatalf("GetLearningProfile() error = %v", err)
	}
	if got.About != profile.About || len(got.Interests) != 2 || len(got.SavedOptionIDs) != 1 {
		t.Fatalf("GetLearningProfile() = %#v, want %#v", got, profile)
	}

	if err := service.DeleteAccount(token); err != nil {
		t.Fatalf("DeleteAccount() error = %v", err)
	}
	if _, err := service.GetLearningProfile(token); !errors.Is(err, ErrInvalidAuthToken) {
		t.Fatalf("GetLearningProfile() after deletion error = %v, want ErrInvalidAuthToken", err)
	}
}

func TestLearningProfileRejectsUnknownInterests(t *testing.T) {
	service := newTestAuthService(t)
	token := testBearerToken(t, service, "demo@cashchoices.in")

	err := service.SaveLearningProfile(token, models.LearningProfile{
		Interests: []string{"personalized-advice"},
	})
	if !errors.Is(err, ErrInvalidLearningProfile) {
		t.Fatalf("SaveLearningProfile() error = %v, want ErrInvalidLearningProfile", err)
	}
}

func TestDecodeLearningProfileListHandlesMalformedStoredJSON(t *testing.T) {
	got, valid := decodeLearningProfileList("true false", "interests")
	if valid || got == nil || len(got) != 0 {
		t.Fatalf("decodeLearningProfileList() = %#v, %v; want empty list and invalid status", got, valid)
	}
}

func TestAuthTokenExpiresAfterThirtyDays(t *testing.T) {
	service := newTestAuthService(t)
	expired := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Issuer:    "cash-choices",
		Subject:   "usr_demo123",
		IssuedAt:  jwt.NewNumericDate(time.Now().Add(-authTokenLifetime - time.Minute)),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Minute)),
	})
	token, err := expired.SignedString(service.jwtSecret)
	if err != nil {
		t.Fatalf("SignedString() error = %v", err)
	}

	if _, err := service.GetUserByToken("Bearer " + token); !errors.Is(err, ErrInvalidAuthToken) {
		t.Fatalf("GetUserByToken() for expired session error = %v, want ErrInvalidAuthToken", err)
	}
}

func TestAuthTokenRejectsTampering(t *testing.T) {
	service := newTestAuthService(t)
	token, err := service.issueToken("usr_demo123")
	if err != nil {
		t.Fatalf("issueToken() error = %v", err)
	}
	parts := strings.Split(token, ".")
	parts[1] = "x" + parts[1][1:]
	tampered := strings.Join(parts, ".")
	if _, err := service.GetUserByToken("Bearer " + tampered); !errors.Is(err, ErrInvalidAuthToken) {
		t.Fatalf("GetUserByToken() for tampered token error = %v, want ErrInvalidAuthToken", err)
	}
}

func TestAuthTokenWorksAcrossServiceInstances(t *testing.T) {
	first := newTestAuthService(t)
	token := testBearerToken(t, first, "demo@cashchoices.in")
	second, err := NewAuthService(nil, nil, testJWTSecret, "test-google-client")
	if err != nil {
		t.Fatalf("NewAuthService() second instance error = %v", err)
	}
	if _, err := second.GetUserByToken(token); err != nil {
		t.Fatalf("GetUserByToken() in second instance error = %v", err)
	}
}

func TestGoogleSignInUsesVerifiedServerIdentity(t *testing.T) {
	service := newTestAuthService(t)
	service.googleHTTPClient = &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodGet || r.URL.Query().Get("id_token") != "google-id-token" {
			t.Errorf("token verification request = %s %s", r.Method, r.URL.String())
		}
		body, err := json.Marshal(map[string]any{
			"aud":            "test-google-client",
			"iss":            "https://accounts.google.com",
			"exp":            time.Now().Add(time.Minute).Unix(),
			"email":          "verified@example.com",
			"email_verified": true,
			"name":           "Verified User",
		})
		if err != nil {
			return nil, err
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(string(body))),
			Header:     make(http.Header),
			Request:    r,
		}, nil
	})}
	email, name, err := service.verifyGoogleIDToken("google-id-token")
	if err != nil {
		t.Fatalf("verifyGoogleIDToken() error = %v", err)
	}
	if email != "verified@example.com" || name != "Verified User" {
		t.Fatalf("verified identity = %q / %q", email, name)
	}
	if _, err := service.GoogleAuth(models.GoogleAuthRequest{Email: "forged@example.com", Name: "Forged"}); err == nil {
		t.Fatal("GoogleAuth() accepted unverified client-supplied identity")
	}
}

func TestVerifyGoogleIDTokenReportsMissingCredential(t *testing.T) {
	service := newTestAuthService(t)

	_, _, err := service.verifyGoogleIDToken(" ")
	if err == nil || err.Error() != "Google sign-in credential is missing" {
		t.Fatalf("verifyGoogleIDToken() error = %v, want missing-credential error", err)
	}
}

func TestVerifyGoogleIDTokenReportsMissingConfiguration(t *testing.T) {
	service := newTestAuthService(t)
	service.googleClientID = ""

	_, _, err := service.verifyGoogleIDToken("google-id-token")
	if err == nil || err.Error() != "Google sign-in is not configured" {
		t.Fatalf("verifyGoogleIDToken() error = %v, want configuration error", err)
	}
}

func TestSignupHashesPasswordAndIssuesStatelessToken(t *testing.T) {
	service := newTestAuthService(t)
	response, err := service.SignUp(models.SignUpRequest{
		Name:     "Test Account",
		Email:    "signup@example.com",
		Password: "strong-password",
	})
	if err != nil {
		t.Fatalf("SignUp() error = %v", err)
	}
	if strings.Count(response.Token, ".") != 2 {
		t.Fatal("auth token should be a signed JWT")
	}
	storedPassword := service.users["signup@example.com"].Password
	if storedPassword == "strong-password" || !strings.HasPrefix(storedPassword, "$2") {
		t.Fatal("password was not stored as a bcrypt hash")
	}
	if _, err := service.GetUserByToken("Bearer " + response.Token); err != nil {
		t.Fatalf("GetUserByToken() for issued token error = %v", err)
	}
}

func TestLoginUpgradesLegacyPlaintextPassword(t *testing.T) {
	service := newTestAuthService(t)
	response, err := service.Login(models.LoginRequest{
		Email:    "demo@cashchoices.in",
		Password: "demo1234",
	})
	if err != nil {
		t.Fatalf("Login() with legacy password error = %v", err)
	}
	if !strings.HasPrefix(service.users["demo@cashchoices.in"].Password, "$2") {
		t.Fatal("successful legacy login did not upgrade the stored password hash")
	}
	if _, err := service.GetUserByToken("Bearer " + response.Token); err != nil {
		t.Fatalf("GetUserByToken() after login error = %v", err)
	}
}
