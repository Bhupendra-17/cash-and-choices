package services

import (
	"math"

	"cash-choices-server/models"
)

type CalculatorService struct{}

func NewCalculatorService() *CalculatorService {
	return &CalculatorService{}
}

func (c *CalculatorService) ComputeTax(req models.TaxCalcRequest) models.TaxCalcResult {
	invested := req.Amount - req.Gain
	if invested < 0 {
		invested = 0
	}
	currentValue := req.Amount
	totalGain := req.Gain
	slabRate := req.Slab / 100.0
	exitLoadPct := req.ExitLoad / 100.0

	var taxableGain float64
	var stcg float64
	var ltcg float64
	var totalTax float64

	switch req.Kind {
	case "equity_mf":
		// Equity MF: STCG (<= 12m) = 20%, LTCG (>12m) = 12.5% over 1.25L exemption
		if req.HoldingMonths <= 12 {
			stcg = totalGain * 0.20
			taxableGain = totalGain
		} else {
			taxableGain = math.Max(0, totalGain-125000)
			ltcg = taxableGain * 0.125
		}

	case "debt_mf":
		// Debt MF: Slab rate
		taxableGain = totalGain
		stcg = totalGain * slabRate

	case "fd":
		// Fixed Deposit: Interest taxed at slab rate
		taxableGain = totalGain
		stcg = totalGain * slabRate

	case "ppf":
		// PPF: Exempt-Exempt-Exempt
		taxableGain = 0
		stcg = 0
		ltcg = 0

	case "sgb":
		// SGB: Held to maturity (>=96 months) is tax-free, else slab rate
		if req.HoldingMonths >= 96 {
			taxableGain = 0
		} else {
			taxableGain = totalGain
			stcg = totalGain * slabRate
		}

	case "gold_physical":
		// Physical Gold: Slab rate if <=36m, else 12.5% without indexation
		if req.HoldingMonths <= 36 {
			taxableGain = totalGain
			stcg = totalGain * slabRate
		} else {
			taxableGain = totalGain
			ltcg = totalGain * 0.125
		}

	default:
		taxableGain = totalGain
		stcg = totalGain * slabRate
	}

	totalTax = stcg + ltcg
	exitFee := currentValue * exitLoadPct
	inHand := currentValue - totalTax - exitFee

	years := float64(req.HoldingMonths) / 12.0
	if years <= 0 {
		years = 1.0
	}

	var ear float64
	if invested > 0 && inHand > 0 {
		ear = (math.Pow(inHand/invested, 1.0/years) - 1.0) * 100.0
	}

	var inflationAdjusted float64
	if req.Inflation > 0 {
		inflationRate := req.Inflation / 100.0
		inflationAdjusted = inHand / math.Pow(1.0+inflationRate, years)
	} else {
		inflationAdjusted = inHand
	}

	// Generate yearly projection points
	var yearly []models.YearlyPoint
	numYears := int(math.Ceil(years))
	if numYears < 1 {
		numYears = 1
	}

	annualGrowth := 0.08
	if invested > 0 && totalGain > 0 {
		annualGrowth = math.Pow((invested+totalGain)/invested, 1.0/years) - 1.0
	}

	for y := 1; y <= numYears; y++ {
		projVal := invested * math.Pow(1.0+annualGrowth, float64(y))
		yearly = append(yearly, models.YearlyPoint{
			Year:     y,
			Invested: roundMath(invested, 0),
			Value:    roundMath(projVal, 0),
		})
	}

	return models.TaxCalcResult{
		Invested:              roundMath(invested, 2),
		CurrentValue:          roundMath(currentValue, 2),
		TotalGain:             roundMath(totalGain, 2),
		TaxableGain:           roundMath(taxableGain, 2),
		Stcg:                  roundMath(stcg, 2),
		Ltcg:                  roundMath(ltcg, 2),
		TotalTax:              roundMath(totalTax, 2),
		InHand:                roundMath(inHand, 2),
		EffectiveAnnualReturn: roundMath(ear, 2),
		InflationAdjusted:     roundMath(inflationAdjusted, 2),
		Yearly:                yearly,
	}
}

func roundMath(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}
