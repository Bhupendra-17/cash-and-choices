package models

type SchemeListItem struct {
	SchemeCode int    `json:"schemeCode"`
	SchemeName string `json:"schemeName"`
}

type SchemeNavMeta struct {
	FundHouse      string `json:"fund_house"`
	SchemeType     string `json:"scheme_type"`
	SchemeCategory string `json:"scheme_category"`
	SchemeCode     int    `json:"scheme_code"`
	SchemeName     string `json:"scheme_name"`
}

type NavRow struct {
	Date string `json:"date"`
	Nav  string `json:"nav"`
}

type SchemeNavResponse struct {
	Meta   SchemeNavMeta `json:"meta"`
	Data   []NavRow      `json:"data"`
	Status string        `json:"status"`
}

type HistoryPoint struct {
	Date string  `json:"date"`
	Nav  float64 `json:"nav"`
}

type NavValue struct {
	Date string  `json:"date"`
	Nav  float64 `json:"nav"`
}

type FundDetail struct {
	Meta             SchemeNavMeta  `json:"meta"`
	Latest           NavValue       `json:"latest"`
	Change1m         *float64       `json:"change1m"`
	Change6m         *float64       `json:"change6m"`
	Change1y         *float64       `json:"change1y"`
	Change3y         *float64       `json:"change3y"`
	High52w          *NavValue      `json:"high52w"`
	Low52w           *NavValue      `json:"low52w"`
	DrawdownFromHigh *float64       `json:"drawdownFromHigh"`
	History          []HistoryPoint `json:"history"`
}

type FundExplainRequest struct {
	Name             string   `json:"name"`
	Category         string   `json:"category"`
	Change1y         *float64 `json:"change1y"`
	Change3y         *float64 `json:"change3y"`
	DrawdownFromHigh *float64 `json:"drawdownFromHigh"`
}

type FundExplainResponse struct {
	Text string `json:"text"`
}

type RecommendRequest struct {
	Answers      map[string]string `json:"answers"`
	CandidateIds []string          `json:"candidateIds"`
}

type PickItem struct {
	ProductID string  `json:"productId"`
	Fit       float64 `json:"fit"`
	Why       string  `json:"why"`
	WatchOut  string  `json:"watchOut"`
}

type AIRecommendation struct {
	Headline  string     `json:"headline"`
	Summary   string     `json:"summary"`
	Picks     []PickItem `json:"picks"`
	NextSteps []string   `json:"nextSteps"`
}

type TaxCalcRequest struct {
	Kind          string  `json:"kind"`
	Amount        float64 `json:"amount"`
	Gain          float64 `json:"gain"`
	HoldingMonths int     `json:"holdingMonths"`
	Slab          float64 `json:"slab"`
	ExitLoad      float64 `json:"exitLoad"`
	Inflation     float64 `json:"inflation"`
}

type YearlyPoint struct {
	Year     int     `json:"year"`
	Invested float64 `json:"invested"`
	Value    float64 `json:"value"`
}

type TaxCalcResult struct {
	Invested              float64       `json:"invested"`
	CurrentValue          float64       `json:"currentValue"`
	TotalGain             float64       `json:"totalGain"`
	TaxableGain           float64       `json:"taxableGain"`
	Stcg                  float64       `json:"stcg"`
	Ltcg                  float64       `json:"ltcg"`
	TotalTax              float64       `json:"totalTax"`
	InHand                float64       `json:"inHand"`
	EffectiveAnnualReturn float64       `json:"effectiveAnnualReturn"`
	InflationAdjusted     float64       `json:"inflationAdjusted"`
	Yearly                []YearlyPoint `json:"yearly,omitempty"`
}
