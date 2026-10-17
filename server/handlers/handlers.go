package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"cash-choices-server/models"
	"cash-choices-server/services"
)

type APIHandler struct {
	mfService         *services.MFService
	aiService         *services.AIService
	calcService       *services.CalculatorService
	authService       *services.AuthService
	analyticsService  *services.AnalyticsService
	featuredService   *services.FeaturedFundsService
	newsletterService *services.NewsletterService
	emailService      *services.EmailService
}

const newsletterFooter = "Cash&Choices is a financial literacy platform. This email is for general educational purposes only. It is not investment advice, a personalized recommendation, or a solicitation to buy or sell securities. Consider a SEBI-registered investment adviser for advice tailored to your circumstances."

func NewAPIHandler(
	mf *services.MFService,
	ai *services.AIService,
	calc *services.CalculatorService,
	auth *services.AuthService,
	analytics *services.AnalyticsService,
	featured *services.FeaturedFundsService,
	newsletter *services.NewsletterService,
	email *services.EmailService,
) *APIHandler {
	return &APIHandler{
		mfService:         mf,
		aiService:         ai,
		calcService:       calc,
		authService:       auth,
		analyticsService:  analytics,
		featuredService:   featured,
		newsletterService: newsletter,
		emailService:      email,
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
	if err != nil || strings.TrimSpace(text) == "" {
		text = h.aiService.GenerateFallbackExplanation(req.Name, req.Category, req.Change1y, req.Change3y, req.DrawdownFromHigh)
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
	var rec models.AIRecommendation
	if err != nil || json.Unmarshal([]byte(respStr), &rec) != nil || len(rec.Picks) == 0 {
		fallback := h.aiService.GenerateFallbackRecommendation(req.Answers, req.CandidateIds)
		rec = *fallback
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
	if err := h.newsletterService.SubscribeOnSignup(resp.User.Email, req.NewsletterOptIn); err != nil {
		respondError(w, http.StatusServiceUnavailable, "account created, but newsletter preferences could not be saved; please sign in and try again")
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
	if err := h.newsletterService.EnsureSubscribed(resp.User.Email); err != nil {
		respondError(w, http.StatusServiceUnavailable, "signed in, but newsletter preferences could not be loaded; please try again")
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

// POST /api/auth/google
func (h *APIHandler) GoogleAuth(w http.ResponseWriter, r *http.Request) {
	var req models.GoogleAuthRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	resp, err := h.authService.GoogleAuth(req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.newsletterService.SetIfMissing(resp.User.Email, req.NewsletterOptIn, "google-account"); err != nil {
		respondError(w, http.StatusServiceUnavailable, "signed in, but newsletter preferences could not be loaded; please try again")
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

func (h *APIHandler) NewsletterSubscription(w http.ResponseWriter, r *http.Request) {
	user, err := h.authService.GetUserByToken(r.Header.Get("Authorization"))
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if r.Method == http.MethodGet {
		subscription, err := h.newsletterService.GetSubscription(user.Email)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, subscription)
		return
	}

	var req struct {
		Subscribed bool `json:"subscribed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}
	subscription, err := h.newsletterService.SetSubscription(user.Email, req.Subscribed)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, subscription)
}

func (h *APIHandler) NewsletterAdminCurrent(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireNewsletterAdmin(w, r); !ok {
		return
	}
	edition, err := h.newsletterService.CurrentEdition(time.Now())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	subscribers, err := h.newsletterService.SubscriberCount()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	deliveries := services.NewsletterSendResult{}
	if edition != nil {
		deliveries, err = h.newsletterService.DeliveryCounts(edition.ID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"edition": edition, "subscriberCount": subscribers, "delivery": deliveries,
	})
}

func (h *APIHandler) NewsletterAdminCreateDraft(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireNewsletterAdmin(w, r); !ok {
		return
	}

	var req struct {
		MarketSources string `json:"marketSources"`
		LessonTopic   string `json:"lessonTopic"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}
	req.MarketSources = strings.TrimSpace(req.MarketSources)
	req.LessonTopic = strings.TrimSpace(req.LessonTopic)
	if len(req.MarketSources) < 20 || len(req.MarketSources) > 8000 {
		respondError(w, http.StatusBadRequest, "provide 20 to 8000 characters of current market news notes and source links")
		return
	}
	if len(req.LessonTopic) < 3 || len(req.LessonTopic) > 180 {
		respondError(w, http.StatusBadRequest, "lesson topic must be between 3 and 180 characters")
		return
	}
	if edition, err := h.newsletterService.CurrentEdition(time.Now()); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	} else if edition != nil {
		respondError(w, http.StatusConflict, "a newsletter edition already exists for this week")
		return
	}

	messages := []services.ChatMessage{
		{
			Role: "system",
			Content: `You are an Indian financial-literacy newsletter editor. Draft a concise weekly educational email in plain language.
Use only the market facts and source notes provided. Do not invent events, numbers, dates, sources, or claims. Include exactly three stories, with their source URLs taken verbatim from the notes. If there are not three verifiable stories and a supporting official URL for the learning term, explain that the notes need more detail in the relevant content rather than inventing anything.
Explain a general money term, not what the reader should buy, sell, hold, or choose. Never personalize, rank, endorse products, predict returns, or give investment/tax/legal advice. Avoid urgency and hype. The weekly action must be general and non-directive.
Return only JSON using this structure: subject (<=90 chars), preheader (<=130 chars), term {name, category, definition, whenCharged, example, howToAvoid (array of 1-5 short strings), officialUrl}, stories (array of exactly 3 objects with category, title, summary, whyItMatters, sourceName, sourceUrl), actionOfTheWeek. URLs must be HTTPS links present in the source notes.`,
		},
		{
			Role:    "user",
			Content: fmt.Sprintf("Verified India market news notes and source URLs:\n%s\n\nEducational lesson topic for this edition:\n%s", req.MarketSources, req.LessonTopic),
		},
	}
	response, err := h.aiService.CallAI(messages, 0.3, true)
	if err != nil {
		respondError(w, http.StatusBadGateway, "AI newsletter draft generation failed; check the AI service configuration and try again")
		return
	}
	var content services.NewsletterContent
	if err := json.Unmarshal([]byte(response), &content); err != nil {
		respondError(w, http.StatusBadGateway, "AI returned an invalid newsletter draft; try again")
		return
	}
	content.MarketSources = req.MarketSources
	content.Footer = newsletterFooter
	content.MarketSummary = ""
	content.LessonTitle = content.Term.Name
	content.LessonBody = content.Term.Definition
	if err := validateNewsletterContent(content); err != nil {
		respondError(w, http.StatusBadGateway, err.Error())
		return
	}

	edition, err := h.newsletterService.CreateEdition(time.Now(), content)
	if err == services.ErrNewsletterEditionExists {
		respondError(w, http.StatusConflict, err.Error())
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, edition)
}

func (h *APIHandler) NewsletterAdminValidate(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireNewsletterAdmin(w, r); !ok {
		return
	}

	var req struct {
		ID              string `json:"id"`
		ReviewConfirmed bool   `json:"reviewConfirmed"`
		services.NewsletterContent
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}
	if strings.TrimSpace(req.ID) == "" {
		respondError(w, http.StatusBadRequest, "newsletter edition id is required")
		return
	}
	if !req.ReviewConfirmed {
		respondError(w, http.StatusBadRequest, "confirm that the market summary and learning text were reviewed before validation")
		return
	}
	req.NewsletterContent.Subject = strings.TrimSpace(req.NewsletterContent.Subject)
	req.NewsletterContent.Preheader = strings.TrimSpace(req.NewsletterContent.Preheader)
	req.NewsletterContent.MarketSummary = strings.TrimSpace(req.NewsletterContent.MarketSummary)
	req.NewsletterContent.LessonTitle = strings.TrimSpace(req.NewsletterContent.LessonTitle)
	req.NewsletterContent.LessonBody = strings.TrimSpace(req.NewsletterContent.LessonBody)
	req.NewsletterContent.MarketSources = strings.TrimSpace(req.NewsletterContent.MarketSources)
	req.NewsletterContent.Footer = strings.TrimSpace(req.NewsletterContent.Footer)
	req.NewsletterContent.Term.Name = strings.TrimSpace(req.NewsletterContent.Term.Name)
	req.NewsletterContent.Term.Category = strings.TrimSpace(req.NewsletterContent.Term.Category)
	req.NewsletterContent.Term.Definition = strings.TrimSpace(req.NewsletterContent.Term.Definition)
	req.NewsletterContent.Term.WhenCharged = strings.TrimSpace(req.NewsletterContent.Term.WhenCharged)
	req.NewsletterContent.Term.Example = strings.TrimSpace(req.NewsletterContent.Term.Example)
	req.NewsletterContent.Term.OfficialURL = strings.TrimSpace(req.NewsletterContent.Term.OfficialURL)
	req.NewsletterContent.ActionOfTheWeek = strings.TrimSpace(req.NewsletterContent.ActionOfTheWeek)
	for i := range req.NewsletterContent.Term.HowToAvoid {
		req.NewsletterContent.Term.HowToAvoid[i] = strings.TrimSpace(req.NewsletterContent.Term.HowToAvoid[i])
	}
	for i := range req.NewsletterContent.Stories {
		story := &req.NewsletterContent.Stories[i]
		story.Category = strings.TrimSpace(story.Category)
		story.Title = strings.TrimSpace(story.Title)
		story.Summary = strings.TrimSpace(story.Summary)
		story.WhyItMatters = strings.TrimSpace(story.WhyItMatters)
		story.SourceName = strings.TrimSpace(story.SourceName)
		story.SourceURL = strings.TrimSpace(story.SourceURL)
	}
	req.NewsletterContent.LessonTitle = req.NewsletterContent.Term.Name
	req.NewsletterContent.LessonBody = req.NewsletterContent.Term.Definition
	if err := validateNewsletterContent(req.NewsletterContent); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	edition, err := h.newsletterService.ValidateEdition(time.Now(), req.ID, req.NewsletterContent)
	if err == services.ErrNewsletterEditionNotFound {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, edition)
}

func (h *APIHandler) requireNewsletterAdmin(w http.ResponseWriter, r *http.Request) (*models.UserProfile, bool) {
	authHeader := r.Header.Get("Authorization")
	token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if strings.HasPrefix(token, "token_g_") {
		respondError(w, http.StatusForbidden, "newsletter admin actions require email and password sign-in")
		return nil, false
	}
	user, err := h.authService.GetUserByToken(authHeader)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return nil, false
	}
	if !h.newsletterService.IsAdmin(user.Email) {
		respondError(w, http.StatusForbidden, "newsletter admin access is not enabled for this account")
		return nil, false
	}
	return user, true
}

func validateNewsletterContent(content services.NewsletterContent) error {
	if len(content.Subject) == 0 || len(content.Subject) > 90 {
		return fmt.Errorf("subject must be between 1 and 90 characters")
	}
	if len(content.Preheader) == 0 || len(content.Preheader) > 130 {
		return fmt.Errorf("preheader must be between 1 and 130 characters")
	}
	if len(content.Term.Name) == 0 || len(content.Term.Name) > 100 ||
		len(content.Term.Category) == 0 || len(content.Term.Category) > 80 {
		return fmt.Errorf("money term name and category are required")
	}
	if len(content.Term.Definition) == 0 || len(content.Term.Definition) > 1200 {
		return fmt.Errorf("money term definition must be between 1 and 1200 characters")
	}
	if len(content.Term.WhenCharged) == 0 || len(content.Term.WhenCharged) > 700 ||
		len(content.Term.Example) == 0 || len(content.Term.Example) > 700 {
		return fmt.Errorf("money term charge details and example are required (up to 700 characters each)")
	}
	if len(content.Term.HowToAvoid) < 1 || len(content.Term.HowToAvoid) > 5 {
		return fmt.Errorf("provide 1 to 5 money term tips")
	}
	for _, tip := range content.Term.HowToAvoid {
		if len(tip) == 0 || len(tip) > 240 {
			return fmt.Errorf("each money term tip must be between 1 and 240 characters")
		}
	}
	if !validHTTPSURL(content.Term.OfficialURL) {
		return fmt.Errorf("money term official link must be a valid HTTPS URL")
	}
	if len(content.Stories) != 3 {
		return fmt.Errorf("include exactly three sourced news stories")
	}
	for _, story := range content.Stories {
		if len(story.Category) == 0 || len(story.Category) > 60 ||
			len(story.Title) == 0 || len(story.Title) > 160 ||
			len(story.Summary) == 0 || len(story.Summary) > 800 ||
			len(story.WhyItMatters) == 0 || len(story.WhyItMatters) > 500 ||
			len(story.SourceName) == 0 || len(story.SourceName) > 120 {
			return fmt.Errorf("each news story must include a category, title, summary, impact, and source")
		}
		if !validHTTPSURL(story.SourceURL) {
			return fmt.Errorf("each news story source must be a valid HTTPS URL")
		}
	}
	if len(content.ActionOfTheWeek) == 0 || len(content.ActionOfTheWeek) > 500 {
		return fmt.Errorf("the 60-second money check must be between 1 and 500 characters")
	}
	if len(content.MarketSources) < 20 || len(content.MarketSources) > 8000 {
		return fmt.Errorf("market sources must be between 20 and 8000 characters")
	}
	if len(content.Footer) == 0 || len(content.Footer) > 600 {
		return fmt.Errorf("footer must be between 1 and 600 characters")
	}
	if content.Footer != newsletterFooter {
		return fmt.Errorf("the educational-purpose footer disclaimer cannot be changed")
	}
	return nil
}

func validHTTPSURL(value string) bool {
	parsed, err := url.ParseRequestURI(value)
	return err == nil && parsed.Scheme == "https" && parsed.Host != "" && parsed.User == nil
}

func (h *APIHandler) NewsletterAdminSend(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.requireNewsletterAdmin(w, r); !ok {
		return
	}
	if h.emailService == nil || !h.emailService.IsSMTPConfigured() {
		respondError(w, http.StatusServiceUnavailable, "newsletter email is unavailable; configure SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD")
		return
	}
	var req struct {
		ID            string `json:"id"`
		SendConfirmed bool   `json:"sendConfirmed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}
	if !req.SendConfirmed {
		respondError(w, http.StatusBadRequest, "confirm that the reviewed edition should be sent to active subscribers")
		return
	}
	if strings.TrimSpace(req.ID) == "" {
		respondError(w, http.StatusBadRequest, "newsletter edition id is required")
		return
	}
	now := time.Now()
	current, err := h.newsletterService.CurrentEdition(now)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if current == nil || current.ID != req.ID {
		respondError(w, http.StatusNotFound, "this week's newsletter edition was not found")
		return
	}
	if err := validateNewsletterContent(current.NewsletterContent); err != nil {
		respondError(w, http.StatusConflict, "the reviewed edition is incomplete; edit and review a complete Money Byte edition before sending")
		return
	}
	siteURL := h.emailService.PublicSiteURL()
	if !validHTTPSURL(siteURL) {
		respondError(w, http.StatusServiceUnavailable, "PUBLIC_SITE_URL must be configured as an HTTPS URL before sending")
		return
	}
	apiURL := h.emailService.PublicAPIURL()
	if !validHTTPSURL(apiURL) {
		respondError(w, http.StatusServiceUnavailable, "PUBLIC_API_URL must be configured as an HTTPS URL before sending")
		return
	}
	unsubscribePath := "/api/newsletter/unsubscribe"
	if strings.HasSuffix(apiURL, "/api") {
		unsubscribePath = "/newsletter/unsubscribe"
	}
	recipients, err := h.newsletterService.ActiveSubscribers()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(recipients) == 0 {
		respondError(w, http.StatusConflict, "there are no active newsletter subscribers to send to")
		return
	}
	edition, err := h.newsletterService.BeginSend(now, req.ID)
	if errors.Is(err, services.ErrNewsletterEditionNotSendable) {
		respondError(w, http.StatusConflict, "only a reviewed edition can be sent, and it cannot already be sending or sent")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	result := services.NewsletterSendResult{}
	for _, recipient := range recipients {
		alreadySent, err := h.newsletterService.DeliverySent(edition.ID, recipient.Email)
		if err != nil {
			result.Failed++
			continue
		}
		if alreadySent {
			result.Sent++
			continue
		}
		unsubscribeURL := apiURL + unsubscribePath + "?token=" + url.QueryEscape(recipient.UnsubscribeToken)
		htmlBody, textBody, err := services.RenderMoneyByteEmail(edition, siteURL, unsubscribeURL)
		if err == nil {
			err = h.emailService.SendNewsletterEmail(recipient.Email, edition.Subject, unsubscribeURL, htmlBody, textBody)
		}
		status, detail := "sent", ""
		if err != nil {
			status = "failed"
			detail = err.Error()
			result.Failed++
		} else {
			result.Sent++
		}
		if err := h.newsletterService.RecordDelivery(edition.ID, recipient.Email, status, detail); err != nil {
			result.Failed++
		}
	}
	if err := h.newsletterService.FinishSend(now, edition.ID, result); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	responseStatus := http.StatusOK
	deliveryStatus := "sent"
	if result.Failed > 0 {
		responseStatus = http.StatusMultiStatus
		deliveryStatus = "send_failed"
	}
	respondJSON(w, responseStatus, map[string]any{
		"status":  deliveryStatus,
		"sent":    result.Sent,
		"failed":  result.Failed,
		"message": fmt.Sprintf("Delivered to %d subscribers; %d deliveries failed.", result.Sent, result.Failed),
	})
}

func (h *APIHandler) NewsletterUnsubscribe(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if r.Method == http.MethodGet {
		if token == "" {
			respondError(w, http.StatusBadRequest, "unsubscribe link is missing its token")
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = fmt.Fprintf(w, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Unsubscribe · Cash&Choices</title><body style="font-family:Arial,sans-serif;max-width:560px;margin:4rem auto;padding:1rem;color:#29202d"><h1>Unsubscribe from The Money Byte</h1><p>Confirm below to stop receiving the weekly financial-literacy newsletter.</p><form method="post" action="/api/newsletter/unsubscribe?token=%s"><button style="padding:.8rem 1.2rem;border:0;border-radius:8px;background:#b445d2;color:white;font-weight:bold">Unsubscribe</button></form></body></html>`, url.QueryEscape(token))
		return
	}
	updated, err := h.newsletterService.Unsubscribe(token)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "could not update newsletter preferences; please try again")
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	if updated {
		_, _ = fmt.Fprint(w, `<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsubscribed · Cash&Choices</title><body style="font-family:Arial,sans-serif;max-width:560px;margin:4rem auto;padding:1rem;color:#29202d"><h1>You’re unsubscribed</h1><p>You will no longer receive The Money Byte newsletter.</p></body></html>`)
		return
	}
	_, _ = fmt.Fprint(w, `<!doctype html><html lang="en"><meta charset="utf-8"><title>Already unsubscribed · Cash&Choices</title><body style="font-family:Arial,sans-serif;max-width:560px;margin:4rem auto;padding:1rem;color:#29202d"><h1>Already unsubscribed</h1><p>This link is invalid or the subscription is already inactive.</p></body></html>`)
}

// POST /api/auth/request-otp
func (h *APIHandler) RequestOTP(w http.ResponseWriter, r *http.Request) {
	var req models.OTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	otp, err := h.authService.RequestOTP(req.Email)
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

// GET /api/user/learning-profile
func (h *APIHandler) GetLearningProfile(w http.ResponseWriter, r *http.Request) {
	profile, err := h.authService.GetLearningProfile(r.Header.Get("Authorization"))
	if err != nil {
		if errors.Is(err, services.ErrInvalidAuthToken) {
			respondError(w, http.StatusUnauthorized, err.Error())
		} else {
			respondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	respondJSON(w, http.StatusOK, profile)
}

// PUT /api/user/learning-profile
func (h *APIHandler) SaveLearningProfile(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 16*1024)
	var profile models.LearningProfile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		respondError(w, http.StatusBadRequest, "invalid learning profile payload")
		return
	}
	if err := h.authService.SaveLearningProfile(r.Header.Get("Authorization"), profile); err != nil {
		status := http.StatusInternalServerError
		switch {
		case errors.Is(err, services.ErrInvalidAuthToken):
			status = http.StatusUnauthorized
		case errors.Is(err, services.ErrInvalidLearningProfile):
			status = http.StatusBadRequest
		}
		respondError(w, status, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, profile)
}

// DELETE /api/auth/me
func (h *APIHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Confirmation string `json:"confirmation"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}
	if req.Confirmation != "DELETE" {
		respondError(w, http.StatusBadRequest, `type "DELETE" to confirm account deletion`)
		return
	}
	user, err := h.authService.GetUserByToken(r.Header.Get("Authorization"))
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if err := h.authService.DeleteAccount(r.Header.Get("Authorization")); err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, services.ErrInvalidAuthToken) {
			status = http.StatusUnauthorized
		}
		respondError(w, status, err.Error())
		return
	}
	if h.newsletterService != nil && !h.authService.UsesDatabase() {
		if err := h.newsletterService.DeleteSubscription(user.Email); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "Account and associated data deleted."})
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

// POST /api/user/answers
func (h *APIHandler) UpdateSavedAnswers(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	var answers []models.QuestionAnswer
	if err := json.NewDecoder(r.Body).Decode(&answers); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	user, err := h.authService.UpdateSavedAnswers(authHeader, answers)
	if err != nil {
		respondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, user)
}

// GET /api/funds/featured?category={cat}&limit={l}
func (h *APIHandler) GetFeaturedFunds(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	funds, err := h.featuredService.ListFeaturedFunds(category, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, funds)
}

// POST /api/analytics/event
func (h *APIHandler) LogAnalyticsEvent(w http.ResponseWriter, r *http.Request) {
	var req models.LogEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	// Try extracting user email from auth header if present
	userEmail := ""
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		if user, err := h.authService.GetUserByToken(authHeader); err == nil && user != nil {
			userEmail = user.Email
		}
	}

	if err := h.analyticsService.LogEvent(userEmail, req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "logged"})
}

// GET /api/analytics/events
func (h *APIHandler) GetAnalyticsEvents(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	userEmail := ""
	if authHeader != "" {
		if user, err := h.authService.GetUserByToken(authHeader); err == nil && user != nil {
			userEmail = user.Email
		}
	}

	events, err := h.analyticsService.GetUserEvents(userEmail, 50)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, events)
}

// POST /api/funds/interact
func (h *APIHandler) RecordFundInteraction(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	userEmail := "anonymous"
	if authHeader != "" {
		if user, err := h.authService.GetUserByToken(authHeader); err == nil && user != nil {
			userEmail = user.Email
		}
	}

	var req models.RecordInteractionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid json payload")
		return
	}

	if err := h.analyticsService.RecordInteraction(userEmail, req); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "recorded"})
}
