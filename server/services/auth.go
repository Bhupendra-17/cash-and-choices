package services

import (
	"crypto/rand"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"cash-choices-server/models"
)

var ErrInvalidAuthToken = errors.New("unauthorized or invalid token")
var ErrInvalidLearningProfile = errors.New("invalid learning profile")

const authTokenLifetime = 30 * 24 * time.Hour

type UserInternal struct {
	ID                   string
	Name                 string
	Email                string
	Password             string
	Provider             string
	CreatedAt            time.Time
	SavedAnswers         []models.QuestionAnswer
	SavedRecommendations []models.SavedRecommendation
}

type OTPRecord struct {
	OTP       string
	ExpiresAt time.Time
}

type AuthService struct {
	mu               sync.RWMutex
	db               *sql.DB
	emailService     *EmailService
	jwtSecret        []byte
	googleClientID   string
	googleHTTPClient *http.Client
	googleTokenInfo  string
	users            map[string]*UserInternal // in-memory fallback
	otps             map[string]OTPRecord     // in-memory fallback
	learningProfiles map[string]models.LearningProfile
}

func NewAuthService(database *sql.DB, emailService *EmailService, jwtSecret, googleClientID string) (*AuthService, error) {
	if len(jwtSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must contain at least 32 characters")
	}
	s := &AuthService{
		db:               database,
		emailService:     emailService,
		jwtSecret:        []byte(jwtSecret),
		googleClientID:   strings.TrimSpace(googleClientID),
		googleHTTPClient: &http.Client{Timeout: 5 * time.Second},
		googleTokenInfo:  "https://oauth2.googleapis.com/tokeninfo",
		users:            make(map[string]*UserInternal),
		otps:             make(map[string]OTPRecord),
		learningProfiles: make(map[string]models.LearningProfile),
	}

	// Seed demo account in memory fallback
	demoUser := &UserInternal{
		ID:        "usr_demo123",
		Name:      "Ananya Sharma",
		Email:     "demo@cashchoices.in",
		Password:  "demo1234",
		Provider:  "email",
		CreatedAt: time.Now().AddDate(0, -2, -5),
		SavedAnswers: []models.QuestionAnswer{
			{QuestionID: "goal", QuestionText: "What are you trying to solve today?", AnswerValue: "grow", AnswerLabel: "Grow my money over time"},
			{QuestionID: "horizon", QuestionText: "How long can you leave the money alone?", AnswerValue: "l", AnswerLabel: "5 – 10 years"},
			{QuestionID: "risk", QuestionText: "How would you feel if this dropped 20% in a bad year?", AnswerValue: "wobble", AnswerLabel: "Uncomfortable but okay"},
			{QuestionID: "monthly", QuestionText: "Roughly how much can you put toward this each month?", AnswerValue: "20to50", AnswerLabel: "₹20,000 – ₹50,000"},
			{QuestionID: "priority", QuestionText: "What matters most to you?", AnswerValue: "fees", AnswerLabel: "Lowest possible fees"},
		},
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

	return s, nil
}

func (s *AuthService) issueToken(userID string) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Issuer:    "cash-choices",
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(authTokenLifetime)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}

func (s *AuthService) tokenUserID(tokenHeader string) (string, error) {
	token := strings.TrimSpace(strings.TrimPrefix(tokenHeader, "Bearer "))
	if token == "" {
		return "", ErrInvalidAuthToken
	}
	claims := &jwt.RegisteredClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, ErrInvalidAuthToken
		}
		return s.jwtSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer("cash-choices"), jwt.WithExpirationRequired())
	if err != nil || !parsed.Valid || claims.Subject == "" {
		return "", ErrInvalidAuthToken
	}
	return claims.Subject, nil
}

func (s *AuthService) emailForToken(tokenHeader string) (string, error) {
	userID, err := s.tokenUserID(tokenHeader)
	if err != nil {
		return "", err
	}
	if s.db != nil {
		var email string
		err := s.db.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)
		if err == sql.ErrNoRows {
			return "", ErrInvalidAuthToken
		}
		if err != nil {
			return "", fmt.Errorf("could not load authenticated account: %w", err)
		}
		return email, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	for email, user := range s.users {
		if user.ID == userID {
			return email, nil
		}
	}
	return "", ErrInvalidAuthToken
}

func (s *AuthService) verifyGoogleIDToken(credential string) (string, string, error) {
	if strings.TrimSpace(credential) == "" {
		return "", "", fmt.Errorf("Google sign-in credential is missing")
	}
	if s.googleClientID == "" {
		return "", "", fmt.Errorf("Google sign-in is not configured")
	}
	query := url.Values{"id_token": {credential}}
	request, err := http.NewRequest(
		http.MethodGet,
		s.googleTokenInfo+"?"+query.Encode(),
		nil,
	)
	if err != nil {
		return "", "", fmt.Errorf("could not create Google token verification request: %w", err)
	}
	response, err := s.googleHTTPClient.Do(request)
	if err != nil {
		return "", "", fmt.Errorf("could not verify Google sign-in: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("Google rejected the sign-in credential")
	}
	var claims struct {
		Audience      string          `json:"aud"`
		Issuer        string          `json:"iss"`
		ExpiresAt     json.RawMessage `json:"exp"`
		Email         string          `json:"email"`
		EmailVerified json.RawMessage `json:"email_verified"`
		Name          string          `json:"name"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 16*1024)).Decode(&claims); err != nil {
		return "", "", fmt.Errorf("could not read Google identity claims: %w", err)
	}
	var expiry int64
	err = json.Unmarshal(claims.ExpiresAt, &expiry)
	if err != nil {
		var stringValue string
		if stringErr := json.Unmarshal(claims.ExpiresAt, &stringValue); stringErr == nil {
			expiry, err = strconv.ParseInt(stringValue, 10, 64)
		}
	}
	var emailVerified bool
	if err := json.Unmarshal(claims.EmailVerified, &emailVerified); err != nil {
		var stringValue string
		if stringErr := json.Unmarshal(claims.EmailVerified, &stringValue); stringErr == nil {
			emailVerified = stringValue == "true"
		}
	}
	if err != nil || claims.Audience != s.googleClientID ||
		(claims.Issuer != "accounts.google.com" && claims.Issuer != "https://accounts.google.com") ||
		expiry <= time.Now().Unix() || !emailVerified || claims.Email == "" {
		return "", "", fmt.Errorf("Google sign-in credential is invalid or expired")
	}
	return strings.ToLower(strings.TrimSpace(claims.Email)), strings.TrimSpace(claims.Name), nil
}

func (s *AuthService) UsesDatabase() bool {
	return s.db != nil
}

func generateRandomToken() string {
	bytes := make([]byte, 24)
	rand.Read(bytes)
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
		SavedAnswers:         u.SavedAnswers,
		SavedRecommendations: u.SavedRecommendations,
	}
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("could not secure password: %w", err)
	}
	return string(hash), nil
}

func verifyPassword(stored, supplied string) (bool, bool) {
	if strings.HasPrefix(stored, "$2a$") || strings.HasPrefix(stored, "$2b$") || strings.HasPrefix(stored, "$2y$") {
		return bcrypt.CompareHashAndPassword([]byte(stored), []byte(supplied)) == nil, false
	}
	return subtle.ConstantTimeCompare([]byte(stored), []byte(supplied)) == 1, true
}

func (s *AuthService) SignUp(req models.SignUpRequest) (*models.AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	name := strings.TrimSpace(req.Name)
	if email == "" || req.Password == "" || name == "" {
		return nil, fmt.Errorf("name, email and password are required")
	}
	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	if s.db != nil {
		var exists bool
		err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists)
		if err != nil {
			return nil, fmt.Errorf("database query error: %w", err)
		}
		if exists {
			return nil, fmt.Errorf("account already exists with this email")
		}

		userID := fmt.Sprintf("usr_%s", generateRandomToken()[:10])
		now := time.Now()
		_, err = s.db.Exec("INSERT INTO users (id, name, email, password, provider, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
			userID, name, email, passwordHash, "email", now)
		if err != nil {
			return nil, fmt.Errorf("failed to insert user into database: %w", err)
		}

		token, err := s.issueToken(userID)
		if err != nil {
			return nil, fmt.Errorf("failed to issue authentication token: %w", err)
		}

		userInternal := &UserInternal{
			ID:                   userID,
			Name:                 name,
			Email:                email,
			Password:             passwordHash,
			Provider:             "email",
			CreatedAt:            now,
			SavedAnswers:         []models.QuestionAnswer{},
			SavedRecommendations: []models.SavedRecommendation{},
		}

		return &models.AuthResponse{
			Token: token,
			User:  s.toProfile(userInternal),
		}, nil
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[email]; exists {
		return nil, fmt.Errorf("account already exists with this email")
	}

	u := &UserInternal{
		ID:                   fmt.Sprintf("usr_%s", generateRandomToken()[:10]),
		Name:                 name,
		Email:                email,
		Password:             passwordHash,
		Provider:             "email",
		CreatedAt:            time.Now(),
		SavedAnswers:         []models.QuestionAnswer{},
		SavedRecommendations: []models.SavedRecommendation{},
	}
	s.users[email] = u

	token, err := s.issueToken(u.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to issue authentication token: %w", err)
	}

	return &models.AuthResponse{
		Token: token,
		User:  s.toProfile(u),
	}, nil
}

func (s *AuthService) Login(req models.LoginRequest) (*models.AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || req.Password == "" {
		return nil, fmt.Errorf("email and password are required")
	}

	if s.db != nil {
		var u UserInternal
		err := s.db.QueryRow("SELECT id, name, email, password, provider, created_at FROM users WHERE email = $1", email).Scan(
			&u.ID, &u.Name, &u.Email, &u.Password, &u.Provider, &u.CreatedAt)
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid email or password")
		} else if err != nil {
			return nil, fmt.Errorf("database query error: %w", err)
		}

		passwordMatches, legacyPassword := verifyPassword(u.Password, req.Password)
		if !passwordMatches {
			return nil, fmt.Errorf("invalid email or password")
		}
		if legacyPassword {
			u.Password, err = hashPassword(req.Password)
			if err != nil {
				return nil, err
			}
			if _, err := s.db.Exec("UPDATE users SET password = $1 WHERE email = $2", u.Password, email); err != nil {
				return nil, fmt.Errorf("could not upgrade stored password: %w", err)
			}
		}

		token, err := s.issueToken(u.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to issue authentication token: %w", err)
		}

		fullProfile, err := s.fetchFullUserProfile(email, &u)
		if err != nil {
			return nil, err
		}

		return &models.AuthResponse{
			Token: token,
			User:  *fullProfile,
		}, nil
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	u, exists := s.users[email]
	if !exists {
		return nil, fmt.Errorf("invalid email or password")
	}
	passwordMatches, legacyPassword := verifyPassword(u.Password, req.Password)
	if !passwordMatches {
		return nil, fmt.Errorf("invalid email or password")
	}
	if legacyPassword {
		passwordHash, hashErr := hashPassword(req.Password)
		if hashErr != nil {
			return nil, hashErr
		}
		u.Password = passwordHash
	}

	token, err := s.issueToken(u.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to issue authentication token: %w", err)
	}

	return &models.AuthResponse{
		Token: token,
		User:  s.toProfile(u),
	}, nil
}

func (s *AuthService) GoogleAuth(req models.GoogleAuthRequest) (*models.AuthResponse, error) {
	email, name, err := s.verifyGoogleIDToken(req.Credential)
	if err != nil {
		return nil, err
	}
	if email == "" {
		return nil, fmt.Errorf("Google sign-in did not provide an email")
	}
	if name == "" {
		name = strings.Split(email, "@")[0]
	}

	if s.db != nil {
		userID := fmt.Sprintf("usr_g_%s", generateRandomToken()[:8])
		now := time.Now()

		_, err := s.db.Exec(`
			INSERT INTO users (id, name, email, password, provider, created_at)
			VALUES ($1, $2, $3, '', 'google', $4)
			ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
			userID, name, email, now)
		if err != nil {
			return nil, fmt.Errorf("failed to upsert google user: %w", err)
		}

		var u UserInternal
		err = s.db.QueryRow("SELECT id, name, email, provider, created_at FROM users WHERE email = $1", email).Scan(
			&u.ID, &u.Name, &u.Email, &u.Provider, &u.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch google user: %w", err)
		}

		token, err := s.issueToken(u.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to issue authentication token: %w", err)
		}

		fullProfile, err := s.fetchFullUserProfile(email, &u)
		if err != nil {
			return nil, err
		}

		return &models.AuthResponse{
			Token: token,
			User:  *fullProfile,
		}, nil
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	u, exists := s.users[email]
	if !exists {
		u = &UserInternal{
			ID:                   fmt.Sprintf("usr_g_%s", generateRandomToken()[:8]),
			Name:                 name,
			Email:                email,
			Password:             "",
			Provider:             "google",
			CreatedAt:            time.Now(),
			SavedAnswers:         []models.QuestionAnswer{},
			SavedRecommendations: []models.SavedRecommendation{},
		}
		s.users[email] = u
	}

	token, err := s.issueToken(u.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to issue authentication token: %w", err)
	}

	return &models.AuthResponse{
		Token: token,
		User:  s.toProfile(u),
	}, nil
}

func (s *AuthService) GetAuthenticatedUser(tokenHeader string) (*models.UserProfile, error) {
	userID, err := s.tokenUserID(tokenHeader)
	if err != nil {
		return nil, err
	}

	if s.db != nil {
		var user models.UserProfile
		err := s.db.QueryRow("SELECT id, name, email, provider, created_at FROM users WHERE id = $1", userID).Scan(
			&user.ID, &user.Name, &user.Email, &user.Provider, &user.CreatedAt)
		if err == sql.ErrNoRows {
			return nil, ErrInvalidAuthToken
		} else if err != nil {
			return nil, fmt.Errorf("could not load authenticated user: %w", err)
		}
		return &user, nil
	}

	// Memory fallback
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, user := range s.users {
		if user.ID == userID {
			profile := s.toProfile(user)
			return &profile, nil
		}
	}
	return nil, ErrInvalidAuthToken
}

func (s *AuthService) GetUserByToken(tokenHeader string) (*models.UserProfile, error) {
	user, err := s.GetAuthenticatedUser(tokenHeader)
	if err != nil || s.db == nil {
		return user, err
	}
	internal := &UserInternal{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		Provider:  user.Provider,
		CreatedAt: user.CreatedAt,
	}
	return s.fetchFullUserProfile(user.Email, internal)
}

func (s *AuthService) RequestOTP(emailInput string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(emailInput))
	if email == "" {
		return "", fmt.Errorf("email is required")
	}

	otp := generateOTP()
	expiresAt := time.Now().Add(10 * time.Minute)

	if s.db != nil {
		_, err := s.db.Exec(`
			INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)
			ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at`,
			email, otp, expiresAt)
		if err != nil {
			return "", fmt.Errorf("failed to save OTP: %w", err)
		}

		if s.emailService != nil {
			_ = s.emailService.SendOTPEmail(email, otp)
		} else {
			log.Printf("📧 [OTP SENT] Sent OTP %s to email: %s", otp, email)
		}
		return otp, nil
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	s.otps[email] = OTPRecord{
		OTP:       otp,
		ExpiresAt: expiresAt,
	}

	if s.emailService != nil {
		_ = s.emailService.SendOTPEmail(email, otp)
	} else {
		log.Printf("📧 [OTP SENT] Sent OTP %s to email: %s", otp, email)
	}
	return otp, nil
}

func (s *AuthService) ResetPassword(req models.OTPVerifyRequest) error {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	otp := strings.TrimSpace(req.OTP)
	if email == "" || otp == "" || req.NewPassword == "" {
		return fmt.Errorf("email, OTP, and new password are required")
	}
	passwordHash, err := hashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	if s.db != nil {
		var savedOTP string
		var expiresAt time.Time
		err := s.db.QueryRow("SELECT otp, expires_at FROM otps WHERE email = $1", email).Scan(&savedOTP, &expiresAt)
		if err == sql.ErrNoRows {
			return fmt.Errorf("invalid or expired OTP request")
		} else if err != nil {
			return fmt.Errorf("database query error: %w", err)
		}

		if savedOTP != otp || time.Now().After(expiresAt) {
			return fmt.Errorf("invalid or expired OTP code")
		}

		var exists bool
		_ = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists)
		if exists {
			_, err = s.db.Exec("UPDATE users SET password = $1 WHERE email = $2", passwordHash, email)
			if err != nil {
				return fmt.Errorf("failed to update password: %w", err)
			}
		} else {
			userID := fmt.Sprintf("usr_%s", generateRandomToken()[:10])
			userName := strings.Split(email, "@")[0]
			_, err = s.db.Exec("INSERT INTO users (id, name, email, password, provider, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
				userID, userName, email, passwordHash, "email", time.Now())
			if err != nil {
				return fmt.Errorf("failed to create account: %w", err)
			}
		}

		_, _ = s.db.Exec("DELETE FROM otps WHERE email = $1", email)
		return nil
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	record, exists := s.otps[email]
	if !exists || record.OTP != otp || time.Now().After(record.ExpiresAt) {
		return fmt.Errorf("invalid or expired OTP code")
	}

	user, exists := s.users[email]
	if !exists {
		user = &UserInternal{
			ID:                   fmt.Sprintf("usr_%s", generateRandomToken()[:10]),
			Name:                 strings.Split(email, "@")[0],
			Email:                email,
			Password:             passwordHash,
			Provider:             "email",
			CreatedAt:            time.Now(),
			SavedAnswers:         []models.QuestionAnswer{},
			SavedRecommendations: []models.SavedRecommendation{},
		}
		s.users[email] = user
	} else {
		user.Password = passwordHash
	}

	delete(s.otps, email)
	return nil
}

func (s *AuthService) SaveRecommendation(tokenHeader string, req models.SaveRecommendationRequest) (*models.SavedRecommendation, error) {
	email, err := s.emailForToken(tokenHeader)
	if err != nil {
		return nil, err
	}

	if s.db != nil {
		recID := fmt.Sprintf("rec_%s", generateRandomToken()[:8])
		now := time.Now()

		answersJSON, _ := json.Marshal(req.Answers)
		picksJSON, _ := json.Marshal(req.Picks)
		nextStepsJSON, _ := json.Marshal(req.NextSteps)

		_, err = s.db.Exec(`
			INSERT INTO saved_recommendations (id, user_email, headline, summary, answers_json, picks_json, next_steps_json, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			recID, email, req.Headline, req.Summary, string(answersJSON), string(picksJSON), string(nextStepsJSON), now)
		if err != nil {
			return nil, fmt.Errorf("failed to save recommendation in database: %w", err)
		}

		// Also update user_answers
		s.saveAnswersToDB(email, req.Answers)

		rec := &models.SavedRecommendation{
			ID:        recID,
			Date:      now,
			Headline:  req.Headline,
			Summary:   req.Summary,
			Answers:   req.Answers,
			Picks:     req.Picks,
			NextSteps: req.NextSteps,
		}

		return rec, nil
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

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

	user.SavedRecommendations = append([]models.SavedRecommendation{rec}, user.SavedRecommendations...)
	user.SavedAnswers = req.Answers

	return &rec, nil
}

func (s *AuthService) UpdateSavedAnswers(tokenHeader string, answers []models.QuestionAnswer) (*models.UserProfile, error) {
	email, err := s.emailForToken(tokenHeader)
	if err != nil {
		return nil, err
	}

	if s.db != nil {
		s.saveAnswersToDB(email, answers)
		return s.GetUserByToken(tokenHeader)
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	user, exists := s.users[email]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	user.SavedAnswers = answers
	profile := s.toProfile(user)
	return &profile, nil
}

func (s *AuthService) saveAnswersToDB(email string, answers []models.QuestionAnswer) {
	if s.db == nil {
		return
	}
	tx, err := s.db.Begin()
	if err != nil {
		return
	}
	defer tx.Rollback()

	_, _ = tx.Exec("DELETE FROM user_answers WHERE email = $1", email)
	for _, ans := range answers {
		_, _ = tx.Exec(`
			INSERT INTO user_answers (email, question_id, question_text, answer_value, answer_label)
			VALUES ($1, $2, $3, $4, $5)`,
			email, ans.QuestionID, ans.QuestionText, ans.AnswerValue, ans.AnswerLabel)
	}
	_ = tx.Commit()
}

func (s *AuthService) fetchFullUserProfile(email string, u *UserInternal) (*models.UserProfile, error) {
	// Fetch saved answers
	rows, err := s.db.Query("SELECT question_id, question_text, answer_value, answer_label FROM user_answers WHERE email = $1", email)
	if err == nil {
		defer rows.Close()
		u.SavedAnswers = []models.QuestionAnswer{}
		for rows.Next() {
			var qa models.QuestionAnswer
			if err := rows.Scan(&qa.QuestionID, &qa.QuestionText, &qa.AnswerValue, &qa.AnswerLabel); err == nil {
				u.SavedAnswers = append(u.SavedAnswers, qa)
			}
		}
	}

	// Fetch saved recommendations
	recRows, err := s.db.Query("SELECT id, headline, summary, answers_json, picks_json, next_steps_json, created_at FROM saved_recommendations WHERE user_email = $1 ORDER BY created_at DESC", email)
	if err == nil {
		defer recRows.Close()
		u.SavedRecommendations = []models.SavedRecommendation{}
		for recRows.Next() {
			var r models.SavedRecommendation
			var ansJSON, picksJSON, stepsJSON string
			if err := recRows.Scan(&r.ID, &r.Headline, &r.Summary, &ansJSON, &picksJSON, &stepsJSON, &r.Date); err == nil {
				_ = json.Unmarshal([]byte(ansJSON), &r.Answers)
				_ = json.Unmarshal([]byte(picksJSON), &r.Picks)
				_ = json.Unmarshal([]byte(stepsJSON), &r.NextSteps)
				u.SavedRecommendations = append(u.SavedRecommendations, r)
			}
		}
	}

	profile := s.toProfile(u)
	return &profile, nil
}

func (s *AuthService) DeleteAccount(tokenHeader string) error {
	email, err := s.emailForToken(tokenHeader)
	if err != nil {
		return err
	}

	if s.db != nil {
		tx, err := s.db.Begin()
		if err != nil {
			return fmt.Errorf("could not start account deletion: %w", err)
		}
		defer tx.Rollback()

		var exists bool
		if err := tx.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists); err != nil {
			return fmt.Errorf("could not verify account: %w", err)
		}
		if !exists {
			return ErrInvalidAuthToken
		}

		for _, query := range []string{
			"DELETE FROM newsletter_subscriptions WHERE email = $1",
			"DELETE FROM newsletter_deliveries WHERE email = $1",
			"DELETE FROM user_analytics_events WHERE user_email = $1",
			"DELETE FROM user_fund_interactions WHERE user_email = $1",
			"DELETE FROM otps WHERE email = $1",
			"DELETE FROM users WHERE email = $1",
		} {
			if _, err := tx.Exec(query, email); err != nil {
				return fmt.Errorf("could not remove account data: %w", err)
			}
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("could not complete account deletion: %w", err)
		}
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.users[email]; !exists {
		return ErrInvalidAuthToken
	}

	delete(s.users, email)
	delete(s.learningProfiles, email)
	delete(s.otps, email)
	return nil
}

func decodeLearningProfileList(value, field string) ([]string, bool) {
	var items []string
	if err := json.Unmarshal([]byte(value), &items); err != nil {
		log.Printf("invalid stored learning profile %s; using an empty list: %v", field, err)
		return []string{}, false
	}
	if items == nil {
		return []string{}, true
	}
	return items, true
}

func (s *AuthService) GetLearningProfile(tokenHeader string) (models.LearningProfile, error) {
	user, err := s.GetAuthenticatedUser(tokenHeader)
	if err != nil {
		return models.LearningProfile{}, err
	}
	if s.db != nil {
		var about, interestsJSON, savedOptionsJSON string
		err := s.db.QueryRow(
			"SELECT about, interests_json, saved_option_ids_json FROM user_learning_profiles WHERE email = $1",
			user.Email,
		).Scan(&about, &interestsJSON, &savedOptionsJSON)
		if err == sql.ErrNoRows {
			return models.LearningProfile{Interests: []string{}, SavedOptionIDs: []string{}}, nil
		}
		if err != nil {
			return models.LearningProfile{}, fmt.Errorf("could not load learning profile: %w", err)
		}
		interests, interestsValid := decodeLearningProfileList(interestsJSON, "interests")
		savedOptions, savedOptionsValid := decodeLearningProfileList(savedOptionsJSON, "saved items")
		if !interestsValid || !savedOptionsValid {
			normalizedInterests, err := json.Marshal(interests)
			if err != nil {
				return models.LearningProfile{}, fmt.Errorf("could not repair stored learning interests: %w", err)
			}
			normalizedSavedOptions, err := json.Marshal(savedOptions)
			if err != nil {
				return models.LearningProfile{}, fmt.Errorf("could not repair stored saved learning items: %w", err)
			}
			if _, err := s.db.Exec(`
				UPDATE user_learning_profiles
				SET interests_json = $1, saved_option_ids_json = $2, updated_at = CURRENT_TIMESTAMP
				WHERE email = $3`,
				string(normalizedInterests), string(normalizedSavedOptions), user.Email); err != nil {
				return models.LearningProfile{}, fmt.Errorf("could not repair stored learning profile: %w", err)
			}
		}
		profile := models.LearningProfile{
			About:          about,
			Interests:      interests,
			SavedOptionIDs: savedOptions,
		}
		return profile, nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	profile := s.learningProfiles[user.Email]
	if profile.Interests == nil {
		profile.Interests = []string{}
	}
	if profile.SavedOptionIDs == nil {
		profile.SavedOptionIDs = []string{}
	}
	return profile, nil
}

func (s *AuthService) SaveLearningProfile(tokenHeader string, profile models.LearningProfile) error {
	user, err := s.GetAuthenticatedUser(tokenHeader)
	if err != nil {
		return err
	}
	if len([]rune(profile.About)) > 240 {
		return fmt.Errorf("%w: about section must be 240 characters or fewer", ErrInvalidLearningProfile)
	}
	if len(profile.Interests) > 9 {
		return fmt.Errorf("%w: choose no more than 9 learning interests", ErrInvalidLearningProfile)
	}
	validInterests := map[string]bool{
		"credit_card": true, "mutual_fund": true, "insurance": true,
		"loan": true, "platform": true, "savings": true, "fd": true,
		"gold": true, "retirement": true,
	}
	interestSet := make(map[string]bool, len(profile.Interests))
	for _, interest := range profile.Interests {
		if !validInterests[interest] {
			return fmt.Errorf("%w: invalid learning interest", ErrInvalidLearningProfile)
		}
		if interestSet[interest] {
			return fmt.Errorf("%w: learning interests must be unique", ErrInvalidLearningProfile)
		}
		interestSet[interest] = true
	}
	if len(profile.SavedOptionIDs) > 100 {
		return fmt.Errorf("%w: you can save up to 100 learning options", ErrInvalidLearningProfile)
	}
	optionSet := make(map[string]bool, len(profile.SavedOptionIDs))
	for _, optionID := range profile.SavedOptionIDs {
		if optionID == "" || len(optionID) > 64 {
			return fmt.Errorf("%w: invalid saved learning option", ErrInvalidLearningProfile)
		}
		for _, char := range optionID {
			if !(char >= 'a' && char <= 'z') && !(char >= '0' && char <= '9') && char != '-' && char != '_' {
				return fmt.Errorf("%w: invalid saved learning option", ErrInvalidLearningProfile)
			}
		}
		if optionSet[optionID] {
			return fmt.Errorf("%w: saved learning options must be unique", ErrInvalidLearningProfile)
		}
		optionSet[optionID] = true
	}
	profile.About = strings.TrimSpace(profile.About)
	if profile.Interests == nil {
		profile.Interests = []string{}
	}
	if profile.SavedOptionIDs == nil {
		profile.SavedOptionIDs = []string{}
	}

	if s.db != nil {
		interestsJSON, err := json.Marshal(profile.Interests)
		if err != nil {
			return fmt.Errorf("could not encode learning interests: %w", err)
		}
		savedOptionsJSON, err := json.Marshal(profile.SavedOptionIDs)
		if err != nil {
			return fmt.Errorf("could not encode saved learning items: %w", err)
		}
		_, err = s.db.Exec(`
			INSERT INTO user_learning_profiles (email, about, interests_json, saved_option_ids_json, updated_at)
			VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
			ON CONFLICT (email) DO UPDATE SET
				about = EXCLUDED.about,
				interests_json = EXCLUDED.interests_json,
				saved_option_ids_json = EXCLUDED.saved_option_ids_json,
				updated_at = CURRENT_TIMESTAMP`,
			user.Email, profile.About, string(interestsJSON), string(savedOptionsJSON))
		if err != nil {
			return fmt.Errorf("could not save learning profile: %w", err)
		}
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.learningProfiles[user.Email] = profile
	return nil
}
