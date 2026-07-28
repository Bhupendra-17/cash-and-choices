package services

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"cash-choices-server/models"
)

const MFAPI_BASE = "https://api.mfapi.in/mf"

type MFService struct {
	client     *http.Client
	mu         sync.RWMutex
	cachedList []models.SchemeListItem
	cachedAt   time.Time
}

func NewMFService() *MFService {
	return &MFService{
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *MFService) GetFullList() ([]models.SchemeListItem, error) {
	s.mu.RLock()
	if len(s.cachedList) > 0 && time.Since(s.cachedAt) < 1*time.Hour {
		list := s.cachedList
		s.mu.RUnlock()
		return list, nil
	}
	s.mu.RUnlock()

	resp, err := s.client.Get(MFAPI_BASE)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch mfapi list: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mfapi list returned status: %d", resp.StatusCode)
	}

	var list []models.SchemeListItem
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		return nil, fmt.Errorf("failed to decode mfapi list: %w", err)
	}

	s.mu.Lock()
	s.cachedList = list
	s.cachedAt = time.Now()
	s.mu.Unlock()

	return list, nil
}

func (s *MFService) SearchFunds(query string) ([]models.SchemeListItem, error) {
	list, err := s.GetFullList()
	if err != nil {
		return nil, err
	}

	q := strings.ToLower(query)
	var matches []models.SchemeListItem
	for _, item := range list {
		if strings.Contains(strings.ToLower(item.SchemeName), q) {
			matches = append(matches, item)
			if len(matches) >= 25 {
				break
			}
		}
	}

	return matches, nil
}

type parsedNavRow struct {
	date time.Time
	nav  float64
}

func parseDate(dStr string) (time.Time, error) {
	parts := strings.Split(dStr, "-")
	if len(parts) != 3 {
		return time.Time{}, fmt.Errorf("invalid date format: %s", dStr)
	}
	day, _ := strconv.Atoi(parts[0])
	month, _ := strconv.Atoi(parts[1])
	year, _ := strconv.Atoi(parts[2])
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC), nil
}

func (s *MFService) GetFundDetail(schemeCode int) (*models.FundDetail, error) {
	url := fmt.Sprintf("%s/%d", MFAPI_BASE, schemeCode)
	resp, err := s.client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch scheme %d: %w", schemeCode, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mfapi scheme %d returned status: %d", schemeCode, resp.StatusCode)
	}

	var raw models.SchemeNavResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode scheme detail: %w", err)
	}

	var parsed []parsedNavRow
	for _, r := range raw.Data {
		navVal, err := strconv.ParseFloat(r.Nav, 64)
		if err != nil || math.IsNaN(navVal) {
			continue
		}
		dt, err := parseDate(r.Date)
		if err != nil {
			continue
		}
		parsed = append(parsed, parsedNavRow{date: dt, nav: navVal})
	}

	if len(parsed) == 0 {
		return nil, fmt.Errorf("no valid NAV data found for scheme %d", schemeCode)
	}

	sort.Slice(parsed, func(i, j int) bool {
		return parsed[i].date.After(parsed[j].date)
	})

	latest := parsed[0]
	oneYearCutoff := latest.date.AddDate(-1, 0, 0)

	var lastYear []parsedNavRow
	high := parsed[0]
	low := parsed[0]

	for _, r := range parsed {
		if r.date.After(oneYearCutoff) || r.date.Equal(oneYearCutoff) {
			lastYear = append(lastYear, r)
			if r.nav > high.nav {
				high = r
			}
			if r.nav < low.nav {
				low = r
			}
		}
	}

	nav1m := findNavNearDaysAgo(parsed, 30)
	nav6m := findNavNearDaysAgo(parsed, 182)
	nav1y := findNavNearDaysAgo(parsed, 365)
	nav3y := findNavNearDaysAgo(parsed, 365*3)

	var change1m, change6m, change1y, change3y *float64
	if nav1m != nil {
		v := pctChange(*nav1m, latest.nav)
		change1m = &v
	}
	if nav6m != nil {
		v := pctChange(*nav6m, latest.nav)
		change6m = &v
	}
	if nav1y != nil {
		v := pctChange(*nav1y, latest.nav)
		change1y = &v
	}
	if nav3y != nil {
		v := pctChange(*nav3y, latest.nav)
		change3y = &v
	}

	drawdown := pctChange(high.nav, latest.nav)

	// Sample history points (~60 points max)
	step := 1
	if len(lastYear) > 60 {
		step = len(lastYear) / 60
	}
	var history []models.HistoryPoint
	for i := len(lastYear) - 1; i >= 0; i -= step {
		r := lastYear[i]
		history = append(history, models.HistoryPoint{
			Date: r.date.Format("2006-01-02"),
			Nav:  round(r.nav, 4),
		})
	}

	return &models.FundDetail{
		Meta: raw.Meta,
		Latest: models.NavValue{
			Date: latest.date.Format("2006-01-02"),
			Nav:  latest.nav,
		},
		Change1m: change1m,
		Change6m: change6m,
		Change1y: change1y,
		Change3y: change3y,
		High52w: &models.NavValue{
			Date: high.date.Format("2006-01-02"),
			Nav:  round(high.nav, 4),
		},
		Low52w: &models.NavValue{
			Date: low.date.Format("2006-01-02"),
			Nav:  round(low.nav, 4),
		},
		DrawdownFromHigh: &drawdown,
		History:          history,
	}, nil
}

func findNavNearDaysAgo(data []parsedNavRow, days int) *float64 {
	if len(data) == 0 {
		return nil
	}
	target := data[0].date.AddDate(0, 0, -days)
	var best *parsedNavRow
	bestDiff := time.Duration(1<<63 - 1)

	for i := range data {
		diff := data[i].date.Sub(target)
		if diff < 0 {
			diff = -diff
		}
		if diff < bestDiff {
			bestDiff = diff
			best = &data[i]
		}
		if data[i].date.Before(target.AddDate(0, 0, -30)) {
			break
		}
	}
	if best != nil {
		val := round(best.nav, 4)
		return &val
	}
	return nil
}

func pctChange(from, to float64) float64 {
	if from == 0 {
		return 0
	}
	return round(((to-from)/from)*100, 2)
}

func round(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}
