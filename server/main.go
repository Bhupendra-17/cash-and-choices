package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"cash-choices-server/config"
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

	mfService := services.NewMFService()
	aiService := services.NewAIService(cfg)
	calcService := services.NewCalculatorService()
	authService := services.NewAuthService()

	apiHandler := handlers.NewAPIHandler(mfService, aiService, calcService, authService)

	mux := http.NewServeMux()

	// Register Routes
	mux.HandleFunc("GET /api/health", apiHandler.HealthCheck)
	mux.HandleFunc("GET /api/funds/search", apiHandler.SearchFunds)
	mux.HandleFunc("GET /api/funds/detail", apiHandler.GetFundDetail)
	mux.HandleFunc("POST /api/funds/explain", apiHandler.ExplainFund)
	mux.HandleFunc("POST /api/recommend", apiHandler.ExplainRecommendations)
	mux.HandleFunc("POST /api/calculators/tax", apiHandler.CalculateTax)

	// Auth & Profile Routes
	mux.HandleFunc("POST /api/auth/signup", apiHandler.SignUp)
	mux.HandleFunc("POST /api/auth/login", apiHandler.Login)
	mux.HandleFunc("POST /api/auth/google", apiHandler.GoogleAuth)
	mux.HandleFunc("POST /api/auth/request-otp", apiHandler.RequestOTP)
	mux.HandleFunc("POST /api/auth/reset-password", apiHandler.ResetPassword)
	mux.HandleFunc("GET /api/auth/me", apiHandler.GetMe)
	mux.HandleFunc("POST /api/user/recommendations", apiHandler.SaveRecommendation)

	handler := corsMiddleware(cfg.AllowedOrigins, mux)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 Cash&Choices Go Backend running on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server stopped with error: %v", err)
	}
}
