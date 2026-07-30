package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"sync"
	"time"

	"cash-choices-server/models"
)

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
	mu     sync.RWMutex
	db     *sql.DB
	users  map[string]*UserInternal // in-memory fallback
	tokens map[string]string        // in-memory fallback
	otps   map[string]OTPRecord     // in-memory fallback
}

func NewAuthService(database *sql.DB) *AuthService {
	s := &AuthService{
		db:     database,
		users:  make(map[string]*UserInternal),
		tokens: make(map[string]string),
		otps:   make(map[string]OTPRecord),
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
	s.tokens["token_demo_ananya"] = demoUser.Email

	return s
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

func (s *AuthService) SignUp(req models.SignUpRequest) (*models.AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	name := strings.TrimSpace(req.Name)
	if email == "" || req.Password == "" || name == "" {
		return nil, fmt.Errorf("name, email and password are required")
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
			userID, name, email, req.Password, "email", now)
		if err != nil {
			return nil, fmt.Errorf("failed to insert user into database: %w", err)
		}

		token := fmt.Sprintf("token_%s", generateRandomToken())
		_, err = s.db.Exec("INSERT INTO user_tokens (token, email, created_at) VALUES ($1, $2, $3)", token, email, now)
		if err != nil {
			return nil, fmt.Errorf("failed to create session token: %w", err)
		}

		userInternal := &UserInternal{
			ID:                   userID,
			Name:                 name,
			Email:                email,
			Password:             req.Password,
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
		Password:             req.Password,
		Provider:             "email",
		CreatedAt:            time.Now(),
		SavedAnswers:         []models.QuestionAnswer{},
		SavedRecommendations: []models.SavedRecommendation{},
	}
	s.users[email] = u

	token := fmt.Sprintf("token_%s", generateRandomToken())
	s.tokens[token] = email

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

		if u.Password != req.Password {
			return nil, fmt.Errorf("invalid email or password")
		}

		token := fmt.Sprintf("token_%s", generateRandomToken())
		_, err = s.db.Exec("INSERT INTO user_tokens (token, email, created_at) VALUES ($1, $2, $3)", token, email, time.Now())
		if err != nil {
			return nil, fmt.Errorf("failed to create session token: %w", err)
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
	if !exists || u.Password != req.Password {
		return nil, fmt.Errorf("invalid email or password")
	}

	token := fmt.Sprintf("token_%s", generateRandomToken())
	s.tokens[token] = email

	return &models.AuthResponse{
		Token: token,
		User:  s.toProfile(u),
	}, nil
}

func (s *AuthService) GoogleAuth(req models.GoogleAuthRequest) (*models.AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	name := strings.TrimSpace(req.Name)
	if email == "" {
		email = "user_" + generateRandomToken()[:8] + "@google.com"
	}
	if name == "" {
		name = "Google User"
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

		token := fmt.Sprintf("token_g_%s", generateRandomToken())
		_, err = s.db.Exec("INSERT INTO user_tokens (token, email, created_at) VALUES ($1, $2, $3)", token, email, time.Now())
		if err != nil {
			return nil, fmt.Errorf("failed to save google session token: %w", err)
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

	token := fmt.Sprintf("token_g_%s", generateRandomToken())
	s.tokens[token] = email

	return &models.AuthResponse{
		Token: token,
		User:  s.toProfile(u),
	}, nil
}

func (s *AuthService) GetUserByToken(tokenHeader string) (*models.UserProfile, error) {
	token := strings.TrimPrefix(tokenHeader, "Bearer ")
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, fmt.Errorf("missing authorization token")
	}

	if s.db != nil {
		var email string
		err := s.db.QueryRow("SELECT email FROM user_tokens WHERE token = $1", token).Scan(&email)
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("unauthorized or invalid token")
		} else if err != nil {
			return nil, fmt.Errorf("database query error: %w", err)
		}

		var u UserInternal
		err = s.db.QueryRow("SELECT id, name, email, provider, created_at FROM users WHERE email = $1", email).Scan(
			&u.ID, &u.Name, &u.Email, &u.Provider, &u.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("user record not found")
		}

		return s.fetchFullUserProfile(email, &u)
	}

	// Memory fallback
	s.mu.RLock()
	defer s.mu.RUnlock()

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

func (s *AuthService) RequestOTP(emailInput string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(emailInput))
	if email == "" {
		return "", fmt.Errorf("email is required")
	}

	otp := generateOTP()
	expiresAt := time.Now().Add(10 * time.Minute)

	if s.db != nil {
		var exists bool
		err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists)
		if err != nil || !exists {
			return "", fmt.Errorf("no account registered with this email")
		}

		_, err = s.db.Exec(`
			INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3)
			ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at`,
			email, otp, expiresAt)
		if err != nil {
			return "", fmt.Errorf("failed to save OTP: %w", err)
		}

		log.Printf("📧 [OTP SENT] Sent OTP %s to email: %s", otp, email)
		return otp, nil
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.users[email]; !exists {
		return "", fmt.Errorf("no account registered with this email")
	}

	s.otps[email] = OTPRecord{
		OTP:       otp,
		ExpiresAt: expiresAt,
	}

	log.Printf("📧 [OTP SENT] Sent OTP %s to email: %s", otp, email)
	return otp, nil
}

func (s *AuthService) ResetPassword(req models.OTPVerifyRequest) error {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	otp := strings.TrimSpace(req.OTP)
	if email == "" || otp == "" || req.NewPassword == "" {
		return fmt.Errorf("email, OTP, and new password are required")
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

		_, err = s.db.Exec("UPDATE users SET password = $1 WHERE email = $2", req.NewPassword, email)
		if err != nil {
			return fmt.Errorf("failed to update password: %w", err)
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
		return fmt.Errorf("user not found")
	}

	user.Password = req.NewPassword
	delete(s.otps, email)
	return nil
}

func (s *AuthService) SaveRecommendation(tokenHeader string, req models.SaveRecommendationRequest) (*models.SavedRecommendation, error) {
	token := strings.TrimPrefix(tokenHeader, "Bearer ")
	token = strings.TrimSpace(token)

	if s.db != nil {
		var email string
		err := s.db.QueryRow("SELECT email FROM user_tokens WHERE token = $1", token).Scan(&email)
		if err != nil {
			return nil, fmt.Errorf("unauthorized or invalid token")
		}

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

	user.SavedRecommendations = append([]models.SavedRecommendation{rec}, user.SavedRecommendations...)
	user.SavedAnswers = req.Answers

	return &rec, nil
}

func (s *AuthService) UpdateSavedAnswers(tokenHeader string, answers []models.QuestionAnswer) (*models.UserProfile, error) {
	token := strings.TrimPrefix(tokenHeader, "Bearer ")
	token = strings.TrimSpace(token)

	if s.db != nil {
		var email string
		err := s.db.QueryRow("SELECT email FROM user_tokens WHERE token = $1", token).Scan(&email)
		if err != nil {
			return nil, fmt.Errorf("unauthorized or invalid token")
		}

		s.saveAnswersToDB(email, answers)
		return s.GetUserByToken(token)
	}

	// Memory fallback
	s.mu.Lock()
	defer s.mu.Unlock()

	email, exists := s.tokens[token]
	if !exists {
		return nil, fmt.Errorf("unauthorized or invalid token")
	}

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
