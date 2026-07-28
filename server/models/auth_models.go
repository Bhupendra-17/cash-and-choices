package models

import "time"

type SignUpRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type GoogleAuthRequest struct {
	Credential string `json:"credential"` // Google ID token or token payload
	Email      string `json:"email"`
	Name       string `json:"name"`
}

type OTPRequest struct {
	Email string `json:"email"`
}

type OTPVerifyRequest struct {
	Email       string `json:"email"`
	OTP         string `json:"otp"`
	NewPassword string `json:"newPassword"`
}

type QuestionAnswer struct {
	QuestionID   string `json:"questionId"`
	QuestionText string `json:"questionText"`
	AnswerValue  string `json:"answerValue"`
	AnswerLabel  string `json:"answerLabel"`
}

type SavedRecommendation struct {
	ID        string           `json:"id"`
	Date      time.Time        `json:"date"`
	Headline  string           `json:"headline"`
	Summary   string           `json:"summary"`
	Answers   []QuestionAnswer `json:"answers"`
	Picks     []PickItem       `json:"picks"`
	NextSteps []string         `json:"nextSteps"`
}

type SaveRecommendationRequest struct {
	Headline  string           `json:"headline"`
	Summary   string           `json:"summary"`
	Answers   []QuestionAnswer `json:"answers"`
	Picks     []PickItem       `json:"picks"`
	NextSteps []string         `json:"nextSteps"`
}

type UserProfile struct {
	ID                   string                `json:"id"`
	Name                 string                `json:"name"`
	Email                string                `json:"email"`
	Provider             string                `json:"provider"` // "email" or "google"
	CreatedAt            time.Time             `json:"createdAt"`
	SavedRecommendations []SavedRecommendation `json:"savedRecommendations"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  UserProfile `json:"user"`
}
