package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"cash-choices-server/models"
)

type FeaturedFundsService struct {
	mu         sync.RWMutex
	db         *sql.DB
	mfService  *MFService
	fundsCache map[int]*models.FeaturedFund
}

func NewFeaturedFundsService(database *sql.DB, mfService *MFService) *FeaturedFundsService {
	s := &FeaturedFundsService{
		db:         database,
		mfService:  mfService,
		fundsCache: make(map[int]*models.FeaturedFund),
	}

	// Initial seed of curated top funds
	s.SeedCuratedFunds()

	return s
}

func (s *FeaturedFundsService) SeedCuratedFunds() {
	curated := []models.FeaturedFund{
		{
			SchemeCode:      120716, // UTI Nifty 50 Index Fund
			SchemeName:      "UTI Nifty 50 Index Fund - Direct Plan - Growth",
			Category:        "Index Fund / Equity",
			FundHouse:       "UTI Mutual Fund",
			LatestNAV:       165.45,
			NAVDate:         "2026-07-28",
			Change1M:        1.85,
			Change6M:        8.40,
			Change1Y:        18.50,
			Change3Y:        46.20,
			Drawdown:        -2.10,
			IsFeatured:      true,
			PopularityScore: 95,
			Tags:            []string{"nifty50", "low_fee", "large_cap", "passive"},
			UpdatedAt:       time.Now(),
		},
		{
			SchemeCode:      122639, // Parag Parikh Flexi Cap
			SchemeName:      "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
			Category:        "Flexi Cap Fund / Equity",
			FundHouse:       "PPFAS Mutual Fund",
			LatestNAV:       78.90,
			NAVDate:         "2026-07-28",
			Change1M:        2.40,
			Change6M:        11.20,
			Change1Y:        24.80,
			Change3Y:        62.40,
			Drawdown:        -3.50,
			IsFeatured:      true,
			PopularityScore: 98,
			Tags:            []string{"flexi_cap", "global_exposure", "consistent"},
			UpdatedAt:       time.Now(),
		},
		{
			SchemeCode:      119598, // Mirae Asset Large Cap
			SchemeName:      "Mirae Asset Large Cap Fund - Direct Plan - Growth",
			Category:        "Large Cap Fund / Equity",
			FundHouse:       "Mirae Asset Mutual Fund",
			LatestNAV:       105.12,
			NAVDate:         "2026-07-28",
			Change1M:        1.45,
			Change6M:        7.80,
			Change1Y:        16.90,
			Change3Y:        41.50,
			Drawdown:        -1.80,
			IsFeatured:      true,
			PopularityScore: 89,
			Tags:            []string{"large_cap", "bluechip", "stable"},
			UpdatedAt:       time.Now(),
		},
		{
			SchemeCode:      125497, // SBI Small Cap
			SchemeName:      "SBI Small Cap Fund - Direct Plan - Growth",
			Category:        "Small Cap Fund / Equity",
			FundHouse:       "SBI Mutual Fund",
			LatestNAV:       154.30,
			NAVDate:         "2026-07-28",
			Change1M:        3.10,
			Change6M:        14.60,
			Change1Y:        31.20,
			Change3Y:        78.90,
			Drawdown:        -6.40,
			IsFeatured:      true,
			PopularityScore: 92,
			Tags:            []string{"small_cap", "high_growth", "high_risk"},
			UpdatedAt:       time.Now(),
		},
		{
			SchemeCode:      120503, // ICICI Prudential Liquid Fund
			SchemeName:      "ICICI Prudential Liquid Fund - Direct Plan - Growth",
			Category:        "Liquid Fund / Debt",
			FundHouse:       "ICICI Prudential Mutual Fund",
			LatestNAV:       348.60,
			NAVDate:         "2026-07-28",
			Change1M:        0.58,
			Change6M:        3.45,
			Change1Y:        7.15,
			Change3Y:        21.80,
			Drawdown:        0.00,
			IsFeatured:      true,
			PopularityScore: 85,
			Tags:            []string{"emergency_fund", "low_risk", "liquid"},
			UpdatedAt:       time.Now(),
		},
		{
			SchemeCode:      120505, // Axis Long Term Equity (ELSS)
			SchemeName:      "Axis Long Term Equity Fund - Direct Plan - Growth",
			Category:        "ELSS Tax Saver / Equity",
			FundHouse:       "Axis Mutual Fund",
			LatestNAV:       92.40,
			NAVDate:         "2026-07-28",
			Change1M:        1.20,
			Change6M:        6.50,
			Change1Y:        14.20,
			Change3Y:        35.80,
			Drawdown:        -2.90,
			IsFeatured:      true,
			PopularityScore: 88,
			Tags:            []string{"elss", "tax_saver", "80c"},
			UpdatedAt:       time.Now(),
		},
	}

	for _, f := range curated {
		fund := f
		s.UpsertFund(&fund)
	}
}

func (s *FeaturedFundsService) UpsertFund(f *models.FeaturedFund) {
	tagsJSON, _ := json.Marshal(f.Tags)

	if s.db != nil {
		_, err := s.db.Exec(`
			INSERT INTO featured_funds (
				scheme_code, scheme_name, category, fund_house, latest_nav, nav_date,
				change_1m, change_6m, change_1y, change_3y, drawdown, is_featured, popularity_score, tags, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
			ON CONFLICT (scheme_code) DO UPDATE SET
				scheme_name = EXCLUDED.scheme_name,
				category = EXCLUDED.category,
				fund_house = EXCLUDED.fund_house,
				latest_nav = EXCLUDED.latest_nav,
				nav_date = EXCLUDED.nav_date,
				change_1m = EXCLUDED.change_1m,
				change_6m = EXCLUDED.change_6m,
				change_1y = EXCLUDED.change_1y,
				change_3y = EXCLUDED.change_3y,
				drawdown = EXCLUDED.drawdown,
				is_featured = EXCLUDED.is_featured,
				popularity_score = EXCLUDED.popularity_score,
				tags = EXCLUDED.tags,
				updated_at = EXCLUDED.updated_at`,
			f.SchemeCode, f.SchemeName, f.Category, f.FundHouse, f.LatestNAV, f.NAVDate,
			f.Change1M, f.Change6M, f.Change1Y, f.Change3Y, f.Drawdown, f.IsFeatured, f.PopularityScore, string(tagsJSON), time.Now())
		if err != nil {
			log.Printf("⚠️ [FEATURED FUNDS DB] Failed to upsert fund %d: %v", f.SchemeCode, err)
		}
	}

	// Memory cache fallback
	s.mu.Lock()
	defer s.mu.Unlock()
	s.fundsCache[f.SchemeCode] = f
}

func (s *FeaturedFundsService) ListFeaturedFunds(category string, limit int) ([]models.FeaturedFund, error) {
	if limit <= 0 {
		limit = 20
	}

	if s.db != nil {
		query := `
			SELECT scheme_code, scheme_name, category, fund_house, latest_nav, nav_date,
			       change_1m, change_6m, change_1y, change_3y, drawdown, is_featured, popularity_score, tags, updated_at
			FROM featured_funds
			WHERE ($1 = '' OR LOWER(category) LIKE '%' || LOWER($1) || '%')
			ORDER BY is_featured DESC, popularity_score DESC, change_1y DESC
			LIMIT $2`
		rows, err := s.db.Query(query, category, limit)
		if err != nil {
			return nil, fmt.Errorf("failed to query featured funds: %w", err)
		}
		defer rows.Close()

		funds := make([]models.FeaturedFund, 0)
		for rows.Next() {
			var f models.FeaturedFund
			var tagsStr string
			err := rows.Scan(
				&f.SchemeCode, &f.SchemeName, &f.Category, &f.FundHouse, &f.LatestNAV, &f.NAVDate,
				&f.Change1M, &f.Change6M, &f.Change1Y, &f.Change3Y, &f.Drawdown, &f.IsFeatured, &f.PopularityScore, &tagsStr, &f.UpdatedAt,
			)
			if err == nil {
				_ = json.Unmarshal([]byte(tagsStr), &f.Tags)
				funds = append(funds, f)
			}
		}
		return funds, nil
	}

	// Memory fallback
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.FeaturedFund, 0)
	for _, f := range s.fundsCache {
		result = append(result, *f)
		if len(result) >= limit {
			break
		}
	}
	return result, nil
}
