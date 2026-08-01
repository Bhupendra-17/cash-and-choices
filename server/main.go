package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"cash-choices-server/config"
	"cash-choices-server/db"
	"cash-choices-server/handlers"
	"cash-choices-server/services"
)

// Dynamic CORS Middleware for production & development API calls
func corsMiddleware(allowedOrigins string, next http.Handler) http.Handler {
	origins := strings.Split(allowedOrigins, ",")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqOrigin := r.Header.Get("Origin")
		allowOrigin := "*"

		if allowedOrigins != "*" && reqOrigin != "" {
			for _, o := range origins {
				trimmed := strings.TrimSpace(o)
				if trimmed == "*" || strings.EqualFold(trimmed, reqOrigin) {
					allowOrigin = reqOrigin
					break
				}
			}
		} else if reqOrigin != "" {
			allowOrigin = reqOrigin
		}

		w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	cfg := config.LoadConfig()

	// Initialize NeonDB PostgreSQL database connection
	database, err := db.InitDB(cfg.DatabaseURL)
	if err != nil {
		log.Printf("⚠️ [DB WARNING] Failed to connect to database: %v. Running in-memory mode.", err)
	}
	if database != nil {
		defer database.Close()
	}

	mfService := services.NewMFService()
	aiService := services.NewAIService(cfg)
	calcService := services.NewCalculatorService()
	emailService := services.NewEmailService(cfg)
	authService := services.NewAuthService(database, emailService)
	analyticsService := services.NewAnalyticsService(database)
	featuredService := services.NewFeaturedFundsService(database, mfService)

	apiHandler := handlers.NewAPIHandler(mfService, aiService, calcService, authService, analyticsService, featuredService)

	mux := http.NewServeMux()

	// Register Routes
	mux.HandleFunc("GET /api/health", apiHandler.HealthCheck)
	mux.HandleFunc("GET /api/funds/search", apiHandler.SearchFunds)
	mux.HandleFunc("GET /api/funds/detail", apiHandler.GetFundDetail)
	mux.HandleFunc("GET /api/funds/featured", apiHandler.GetFeaturedFunds)
	mux.HandleFunc("POST /api/funds/interact", apiHandler.RecordFundInteraction)
	mux.HandleFunc("POST /api/funds/explain", apiHandler.ExplainFund)
	mux.HandleFunc("POST /api/recommend", apiHandler.ExplainRecommendations)
	mux.HandleFunc("POST /api/calculators/tax", apiHandler.CalculateTax)

	// Analytics & Event Tracking Routes
	mux.HandleFunc("POST /api/analytics/event", apiHandler.LogAnalyticsEvent)
	mux.HandleFunc("GET /api/analytics/events", apiHandler.GetAnalyticsEvents)

	// Auth & Profile Routes
	mux.HandleFunc("POST /api/auth/signup", apiHandler.SignUp)
	mux.HandleFunc("POST /api/auth/login", apiHandler.Login)
	mux.HandleFunc("POST /api/auth/google", apiHandler.GoogleAuth)
	mux.HandleFunc("POST /api/auth/request-otp", apiHandler.RequestOTP)
	mux.HandleFunc("POST /api/auth/reset-password", apiHandler.ResetPassword)
	mux.HandleFunc("GET /api/auth/me", apiHandler.GetMe)
	mux.HandleFunc("POST /api/user/recommendations", apiHandler.SaveRecommendation)
	mux.HandleFunc("POST /api/user/answers", apiHandler.UpdateSavedAnswers)

	handler := corsMiddleware(cfg.AllowedOrigins, mux)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 Cash&Choices Go Backend running on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server stopped with error: %v", err)
	}
}
