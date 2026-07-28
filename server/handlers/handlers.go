package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"cash-choices-server/models"
	"cash-choices-server/services"
)

type APIHandler struct {
	mfService   *services.MFService
	aiService   *services.AIService
	calcService *services.CalculatorService
	authService *services.AuthService
}

func NewAPIHandler(mf *services.MFService, ai *services.AIService, calc *services.CalculatorService, auth *services.AuthService) *APIHandler {
	return &APIHandler{
		mfService:   mf,
		aiService:   ai,
		calcService: calc,
		authService: auth,
	}
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// GET /api/health
func (h *APIHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "cash-choices-backend",
	})
}

// GET /api/funds/search?q={query}
func (h *APIHandler) SearchFunds(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 2 {
		respondJSON(w, http.StatusOK, []models.SchemeListItem{})
		return
	}

	results, err := h.mfService.SearchFunds(q)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, results)
}

// GET /api/funds/detail?code={schemeCode}
func (h *APIHandler) GetFundDetail(w http.ResponseWriter, r *http.Request) {
	codeStr := r.URL.Query().Get("code")
	code, err := strconv.Atoi(codeStr)
	if err != nil || code <= 0 {
		respondError(w, http.StatusBadRequest, "invalid scheme code parameter")
		return
	}

	detail, err := h.mfService.GetFundDetail(code)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, detail)
}

// POST /api/funds/explain
func (h *APIHandler) ExplainFund(w http.ResponseWriter, r *http.Request) {
	var req models.FundExplainRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	change1yStr := "n/a"
	if req.Change1y != nil {
		change1yStr = fmt.Sprintf("%.2f%%", *req.Change1y)
	}

	change3yStr := "n/a"
	if req.Change3y != nil {
		change3yStr = fmt.Sprintf("%.2f%%", *req.Change3y)
	}

	drawdownStr := "n/a"
	if req.DrawdownFromHigh != nil {
		drawdownStr = fmt.Sprintf("%.2f%%", *req.DrawdownFromHigh)
	}

	prompt := fmt.Sprintf(`Fund: %s
Category: %s
1-year return: %s
3-year return: %s
Currently %s from its 52-week high.

Explain what these numbers mean for a normal saver, and what a beginner should watch out for.`, req.Name, req.Category, change1yStr, change3yStr, drawdownStr)

	messages := []services.ChatMessage{
		{
			Role:    "system",
			Content: "You are Cash&Choices, a friendly Indian personal finance educator. Explain performance in plain English for a beginner. Avoid jargon, do not give buy/sell advice, keep it under 120 words. Frame numbers with context (what's normal for the category, what the drawdown means for a saver).",
		},
		{
			Role:    "user",
			Content: prompt,
		},
	}

	text, err := h.aiService.CallAI(messages, 0.4, false)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, models.FundExplainResponse{Text: text})
}

// POST /api/recommend
func (h *APIHandler) ExplainRecommendations(w http.ResponseWriter, r *http.Request) {
	var req models.RecommendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	answersJSON, _ := json.MarshalIndent(req.Answers, "", "  ")

	system := `You are Cash&Choices, a zero-affiliate personal finance guide for Indian users.
Reply in clear, friendly, jargon-free English. Never give a firm buy/sell instruction; frame everything as an educational fit.
Return STRICT JSON matching the requested schema — no markdown, no commentary outside JSON.`

	userPrompt := fmt.Sprintf(`User's questionnaire answers:
%s

Shortlisted candidates: %v

Produce JSON:
{
  "headline": "one line (<=90 chars) summarising the user's profile",
  "summary": "2-3 sentences on what the user should focus on right now",
  "picks": [
    { "productId": "<id from list>", "fit": 0-100, "why": "1-2 sentences on why it fits THIS user", "watchOut": "1 sentence on the biggest risk/hidden cost" }
  ],
  "nextSteps": ["3 short, actionable steps"]
}
Only reference productIds from candidate list. Sort picks by best fit first.`, string(answersJSON), req.CandidateIds)

	messages := []services.ChatMessage{
		{Role: "system", Content: system},
		{Role: "user", Content: userPrompt},
	}

	respStr, err := h.aiService.CallAI(messages, 0.4, true)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var rec models.AIRecommendation
	if err := json.Unmarshal([]byte(respStr), &rec); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to parse AI recommendation json: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, rec)
}

// POST /api/calculators/tax
func (h *APIHandler) CalculateTax(w http.ResponseWriter, r *http.Request) {
	var req models.TaxCalcRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	result := h.calcService.ComputeTax(req)
	respondJSON(w, http.StatusOK, result)
}

// POST /api/auth/signup
func (h *APIHandler) SignUp(w http.ResponseWriter, r *http.Request) {
	var req models.SignUpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	resp, err := h.authService.SignUp(req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

// POST /api/auth/login
func (h *APIHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	resp, err := h.authService.Login(req)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

// POST /api/auth/google
func (h *APIHandler) GoogleAuth(w http.ResponseWriter, r *http.Request) {
	var req models.GoogleAuthRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	resp, err := h.authService.GoogleLogin(req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

// POST /api/auth/request-otp
func (h *APIHandler) RequestOTP(w http.ResponseWriter, r *http.Request) {
	var req models.OTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	otp, err := h.authService.RequestOTP(req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Returns OTP in response for testing/demo purposes
	respondJSON(w, http.StatusOK, map[string]string{
		"message": "OTP sent to your email address",
		"otp":     otp,
	})
}

// POST /api/auth/reset-password
func (h *APIHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req models.OTPVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	if err := h.authService.ResetPassword(req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Password updated successfully. You can now log in.",
	})
}

// GET /api/auth/me
func (h *APIHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	user, err := h.authService.GetUserByToken(authHeader)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, user)
}

// POST /api/user/recommendations
func (h *APIHandler) SaveRecommendation(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	var req models.SaveRecommendationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	rec, err := h.authService.SaveRecommendation(authHeader, req)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, rec)
}

