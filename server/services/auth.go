package services

import "crypto/rand"
import "encoding/hex"
import "fmt"
import "math/big"
import "strings"
import "sync"
import "time"

import "cash-choices-server/models"

type UserInternal struct {
	ID                   string
	Name                 string
	Email                string
	Password             string // Plaintext/simple for prototype
	Provider             string
	CreatedAt            time.Time
	SavedRecommendations []models.SavedRecommendation
}

type OTPRecord struct {
	OTP       string
	ExpiresAt time.Time
}

type AuthService struct {
	mu     sync.RWMutex
	users  map[string]*UserInternal // keyed by email (lowercase)
	tokens map[string]string        // token -> email
	otps   map[string]OTPRecord     // email (lowercase) -> OTPRecord
}

func NewAuthService() *AuthService {
	s := &AuthService{
		users:  make(map[string]*UserInternal),
		tokens: make(map[string]string),
		otps:   make(map[string]OTPRecord),
	}

	// Seed demo account
	demoUser := &UserInternal{
		ID:        "usr_demo123",
		Name:      "Ananya Sharma",
		Email:     "demo@cashchoices.in",
		Password:  "demo1234",
		Provider:  "email",
		CreatedAt: time.Now().AddDate(0, -2, -5),
		SavedRecommendations: []models.SavedRecommendation{
			{
				ID:        "rec_demo_01",
				Date:      time.Now().AddDate(0, 0, -3),
				Headline:  "Balanced Long-Term Wealth Accumulator",
				Summary:   "Targeting 5-10 year growth with moderate risk tolerance and lowest fee priority.",
				NextSteps: []string{"Set up automated SIP", "Review emergency fund", "Check tax-saving options"},
				Answers: []models.QuestionAnswer{
					{QuestionID: "goal", QuestionText: "What are you trying to solve today?", AnswerValue: "grow", AnswerLabel: "Grow my money over time"},
					{QuestionID: "horizon", QuestionText: "How long can you leave the money alone?", AnswerValue: "l", AnswerLabel: "5 – 10 years"},
					{QuestionID: "risk", QuestionText: "How would you feel if this dropped 20% in a bad year?", AnswerValue: "wobble", AnswerLabel: "Uncomfortable but okay"},
					{QuestionID: "monthly", QuestionText: "Roughly how much can you put toward this each month?", AnswerValue: "20to50", AnswerLabel: "₹20,000 – ₹50,000"},
					{QuestionID: "priority", QuestionText: "What matters most to you?", AnswerValue: "fees", AnswerLabel: "Lowest possible fees"},
				},
				Picks: []models.PickItem{
					{ProductID: "nifty50_index", Fit: 95, Why: "Lowest expense ratio (0.06%) tracking India's top 50 companies.", WatchOut: "Subject to market volatility in short periods."},
					{ProductID: "ppf", Fit: 88, Why: "Guaranteed tax-free compounding under 80C EEE status.", WatchOut: "15-year lock-in period applies."},
				},
			},
		},
	}
	s.users[demoUser.Email] = demoUser
	s.tokens["token_demo_ananya"] = demoUser.Email

	return s
}

func generateRandomToken() string {
	bytes := make([]byte, 16)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func generateOTP() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(900000))
	return fmt.Sprintf("%06d", n.Int64()+100000)
}

func (s *AuthService) toProfile(u *UserInternal) models.UserProfile {
	return models.UserProfile{
		ID:                   u.ID,
		Name:                 u.Name,
		Email:                u.Email,
		Provider:             u.Provider,
		CreatedAt:            u.CreatedAt,
		SavedRecommendations: u.SavedRecommendations,
	}
}

func (s *AuthService) SignUp(req models.SignUpRequest) (*models.AuthResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}
	if req.Password == "" || len(req.Password) < 6 {
		return nil, fmt.Errorf("password must be at least 6 characters")
	}

	if _, exists := s.users[email]; exists {
		return nil, fmt.Errorf("user with email %s already exists", email)
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.Split(email, "@")[0]
	}

	user := &UserInternal{
		ID:                   fmt.Sprintf("usr_%s", generateRandomToken()[:8]),
		Name:                 name,
		Email:                email,
		Password:             req.Password,
		Provider:             "email",
		CreatedAt:            time.Now(),
		SavedRecommendations: []models.SavedRecommendation{},
	}

	s.users[email] = user

	token := fmt.Sprintf("token_%s", generateRandomToken())
	s.tokens[token] = email

	profile := s.toProfile(user)
	return &models.AuthResponse{
		Token: token,
		User:  profile,
	}, nil
}

func (s *AuthService) Login(req models.LoginRequest) (*models.AuthResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	email := strings.ToLower(strings.TrimSpace(req.Email))
	user, exists := s.users[email]
	if !exists {
		return nil, fmt.Errorf("invalid email or password")
	}

	if user.Password != req.Password {
		return nil, fmt.Errorf("invalid email or password")
	}

	token := fmt.Sprintf("token_%s", generateRandomToken())
	s.tokens[token] = email

	profile := s.toProfile(user)
	return &models.AuthResponse{
		Token: token,
		User:  profile,
	}, nil
}

func (s *AuthService) GoogleLogin(req models.GoogleAuthRequest) (*models.AuthResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		// Mock default for demo Google click
		email = "google.user@cashchoices.in"
	}

	user, exists := s.users[email]
	if !exists {
		name := req.Name
		if name == "" {
			name = "Google User"
		}
		user = &UserInternal{
			ID:                   fmt.Sprintf("usr_g_%s", generateRandomToken()[:8]),
			Name:                 name,
			Email:                email,
			Password:             "",
			Provider:             "google",
			CreatedAt:            time.Now(),
			SavedRecommendations: []models.SavedRecommendation{},
		}
		s.users[email] = user
	}

	token := fmt.Sprintf("token_%s", generateRandomToken())
	s.tokens[token] = email

	profile := s.toProfile(user)
	return &models.AuthResponse{
		Token: token,
		User:  profile,
	}, nil
}

func (s *AuthService) RequestOTP(req models.OTPRequest) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return "", fmt.Errorf("email is required")
	}

	if _, exists := s.users[email]; !exists {
		return "", fmt.Errorf("no account found with email %s", email)
	}

	otp := generateOTP()
	s.otps[email] = OTPRecord{
		OTP:       otp,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}

	return otp, nil
}

func (s *AuthService) ResetPassword(req models.OTPVerifyRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	email := strings.ToLower(strings.TrimSpace(req.Email))
	record, exists := s.otps[email]
	if !exists {
		return fmt.Errorf("no OTP requested for this email")
	}

	if time.Now().After(record.ExpiresAt) {
		delete(s.otps, email)
		return fmt.Errorf("OTP has expired. Please request a new one")
	}

	if strings.TrimSpace(req.OTP) != record.OTP {
		return fmt.Errorf("invalid OTP code entered")
	}

	if len(req.NewPassword) < 6 {
		return fmt.Errorf("new password must be at least 6 characters")
	}

	user, userExists := s.users[email]
	if !userExists {
		return fmt.Errorf("user not found")
	}

	user.Password = req.NewPassword
	delete(s.otps, email)
	return nil
}

func (s *AuthService) GetUserByToken(token string) (*models.UserProfile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	token = strings.TrimPrefix(token, "Bearer ")
	token = strings.TrimSpace(token)

	email, exists := s.tokens[token]
	if !exists {
		return nil, fmt.Errorf("unauthorized or invalid token")
	}

	user, exists := s.users[email]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	profile := s.toProfile(user)
	return &profile, nil
}

func (s *AuthService) SaveRecommendation(token string, req models.SaveRecommendationRequest) (*models.SavedRecommendation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	token = strings.TrimPrefix(token, "Bearer ")
	token = strings.TrimSpace(token)

	email, exists := s.tokens[token]
	if !exists {
		return nil, fmt.Errorf("unauthorized or invalid token")
	}

	user, exists := s.users[email]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	rec := models.SavedRecommendation{
		ID:        fmt.Sprintf("rec_%s", generateRandomToken()[:8]),
		Date:      time.Now(),
		Headline:  req.Headline,
		Summary:   req.Summary,
		Answers:   req.Answers,
		Picks:     req.Picks,
		NextSteps: req.NextSteps,
	}

	// Prepend to top
	user.SavedRecommendations = append([]models.SavedRecommendation{rec}, user.SavedRecommendations...)

	return &rec, nil
}
